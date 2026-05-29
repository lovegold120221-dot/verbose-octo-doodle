import { auth } from '../firebase';

function getBackendUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SANDBOX_URL) || '';
  const stored = (() => { try { return localStorage.getItem('beatrice_backend_url'); } catch { return null; } })();
  const base = stored || envUrl || (typeof window !== 'undefined' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) ? 'http://localhost:4200' : window.location.origin);
  return base.replace(/\/+$/, '');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken().catch(() => null);
  return {
    'x-user-id': user.uid,
    'x-user-email': user.email || '',
    ...(token ? { 'x-firebase-token': token } : {}),
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);
  return data as T;
}

export interface CredentialEntry {
  key: string;
  label: string;
  required: boolean;
  serverOnly: boolean;
  testable: boolean;
  category: string;
  configured: boolean;
  source: string;
  maskedValue: string;
  canReveal: boolean;
}

export interface EnvResponse {
  credentials: CredentialEntry[];
}

export async function getEnvCredentials(): Promise<CredentialEntry[]> {
  const data = await requestJson<EnvResponse>('/api/admin/env');
  return data.credentials || [];
}

export async function saveEnvCredential(key: string, value: string): Promise<any> {
  return requestJson('/api/admin/env', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export async function testEnvCredential(key: string): Promise<{ key: string; testable: boolean; status: string; message: string }> {
  return requestJson('/api/admin/env/test', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

export async function clearEnvOverride(key: string): Promise<any> {
  return requestJson(`/api/admin/env/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}
