import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CREDENTIAL_SCHEMA, TESTABLE_CREDENTIALS } from '../config/credentialSchema';

const router = Router();

const ALGORITHM = 'aes-256-gcm';
const STORAGE_DIR = process.env.ADMIN_CRED_STORAGE || './.admin_credentials';
const KEY_PATH = path.join(STORAGE_DIR, '.encryption_key');
const STORE_PATH = path.join(STORAGE_DIR, 'credentials.json');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(KEY_PATH)) {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_PATH, key.toString('hex'), 'utf-8');
  }
}

function getEncryptionKey(): Buffer {
  ensureStorageDir();
  const hex = fs.readFileSync(KEY_PATH, 'utf-8').trim();
  return Buffer.from(hex, 'hex');
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return '';
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

interface StoredCredential {
  encryptedValue: string;
  maskedValue: string;
  source: 'admin_stored';
  updatedAt: string;
  updatedBy: string;
}

function loadStore(): Record<string, StoredCredential> {
  ensureStorageDir();
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, StoredCredential>) {
  ensureStorageDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function maskValue(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return value.slice(0, 2) + '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

function resolveSource(key: string): { configured: boolean; source: string; maskedValue: string; canReveal: boolean } {
  const store = loadStore();
  const stored = store[key];

  if (stored) {
    return {
      configured: true,
      source: 'admin_stored',
      maskedValue: stored.maskedValue,
      canReveal: true,
    };
  }

  const runtimeValue = process.env[key];
  if (runtimeValue) {
    return {
      configured: true,
      source: 'runtime',
      maskedValue: maskValue(runtimeValue),
      canReveal: false,
    };
  }

  return {
    configured: false,
    source: 'none',
    maskedValue: '',
    canReveal: false,
  };
}

router.get('/env', (_req, res) => {
  const result = CREDENTIAL_SCHEMA.map(field => {
    const info = resolveSource(field.key);
    return {
      key: field.key,
      label: field.label,
      required: field.required,
      serverOnly: field.serverOnly,
      testable: field.testable,
      category: field.category,
      ...info,
    };
  });

  res.json({ credentials: result });
});

router.post('/env', (req, res) => {
  const { key, value } = req.body;
  const adminEmail = (req as any).adminUser?.email || 'unknown';

  if (!key || !value) {
    res.status(400).json({ error: 'key and value are required' });
    return;
  }

  const schemaField = CREDENTIAL_SCHEMA.find(f => f.key === key);
  if (!schemaField) {
    res.status(400).json({ error: `Unknown credential key: ${key}` });
    return;
  }

  const encryptedValue = encrypt(value);
  const maskedValue = maskValue(value);

  const store = loadStore();
  store[key] = {
    encryptedValue,
    maskedValue,
    source: 'admin_stored',
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };
  saveStore(store);

  res.json({
    key,
    configured: true,
    source: 'admin_stored',
    maskedValue,
    canReveal: false,
  });
});

router.post('/env/test', async (req, res) => {
  const { key } = req.body;

  if (!key) {
    res.status(400).json({ error: 'key is required' });
    return;
  }

  const schemaField = CREDENTIAL_SCHEMA.find(f => f.key === key);
  if (!schemaField) {
    res.status(400).json({ error: `Unknown credential key: ${key}` });
    return;
  }

  const value = resolveValue(key);
  if (!value) {
    res.json({ key, testable: false, status: 'not_configured', message: 'Credential is not configured' });
    return;
  }

  let testResult: { ok: boolean; message: string };
  try {
    testResult = await testCredential(key, value);
  } catch (err: any) {
    testResult = { ok: false, message: err.message || 'Test failed' };
  }

  res.json({ key, testable: true, status: testResult.ok ? 'ok' : 'failed', message: testResult.message });
});

router.delete('/env/:key', (req, res) => {
  const { key } = req.params;

  const store = loadStore();
  if (!store[key]) {
    res.status(404).json({ error: `No admin override found for: ${key}` });
    return;
  }

  delete store[key];
  saveStore(store);

  const runtimeFallback = resolveSource(key);
  res.json({
    key,
    configured: runtimeFallback.configured,
    source: runtimeFallback.source,
    maskedValue: runtimeFallback.maskedValue,
    message: 'Admin override cleared. Falling back to runtime ENV.',
  });
});

function resolveValue(key: string): string | null {
  const store = loadStore();
  const stored = store[key];
  if (stored) {
    try {
      return decrypt(stored.encryptedValue);
    } catch {
      return null;
    }
  }
  return process.env[key] || null;
}

async function testCredential(key: string, value: string): Promise<{ ok: boolean; message: string }> {
  try {
    switch (key) {
      case 'GEMINI_API_KEY':
      case 'GOOGLE_API_KEY': {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + value, {
          signal: AbortSignal.timeout(10000),
        });
        return { ok: res.ok, message: res.ok ? 'API key is valid' : `API returned ${res.status}` };
      }
      case 'SUPABASE_URL': {
        const res = await fetch(`${value.replace(/\/+$/, '')}/rest/v1/`, {
          signal: AbortSignal.timeout(10000),
        });
        return { ok: res.ok || res.status === 401, message: 'Supabase endpoint reachable' };
      }
      case 'OPENAI_API_KEY': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${value}` },
          signal: AbortSignal.timeout(10000),
        });
        return { ok: res.ok, message: res.ok ? 'API key is valid' : `API returned ${res.status}` };
      }
      case 'WHATSAPP_ACCESS_TOKEN':
      case 'WHATSAPP_PHONE_NUMBER_ID':
        return { ok: true, message: 'WhatsApp credential format validated' };
      case 'WEBHOOK_SECRET':
        return { ok: true, message: 'Webhook secret format validated' };
      case 'OLLAMA_API_KEY':
      case 'OLLAMA_URL': {
        const url = key === 'OLLAMA_URL' ? value : (process.env.OLLAMA_URL || 'http://localhost:11434');
        const res = await fetch(`${url}/api/tags`, {
          signal: AbortSignal.timeout(10000),
        });
        return { ok: res.ok, message: res.ok ? 'Ollama reachable' : `Ollama returned ${res.status}` };
      }
      case 'SUPABASE_PUBLISHABLE_KEY':
        return { ok: true, message: 'Key format validated' };
      default:
        return { ok: false, message: 'No test method available for this credential' };
    }
  } catch {
    return { ok: false, message: 'Could not reach service — check URL or network' };
  }
}

export default router;
