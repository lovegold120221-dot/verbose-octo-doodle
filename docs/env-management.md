# ENV Management

## Overview

Credentials and configuration values are managed through a three-layer system:

1. **Runtime ENV** (`process.env`) — set on the deployment platform (Vercel, Cloud Run, etc.)
2. **Local `.env`** — for development only, gitignored
3. **Admin Portal** — encrypted admin-stored overrides for runtime values

## Resolution Priority

When the backend needs a credential value:

```
Admin stored → Runtime ENV → Local .env → Error
```

## Shared Credential Schema

Defined in `server/config/credentialSchema.ts`:

```typescript
export const CREDENTIAL_SCHEMA = [
  {
    key: "GEMINI_API_KEY",
    label: "Gemini API Key",
    required: true,
    serverOnly: false,
    testable: true,
    category: "ai",
  },
  // ...
];
```

Fields:

| Field | Description |
|-------|-------------|
| `key` | The env variable name |
| `label` | Human-readable name |
| `required` | Is this needed for the app to function? |
| `serverOnly` | Must never be exposed to client bundle |
| `testable` | Has a server-side test method |
| `category` | Group: ai, database, auth, whatsapp, sandbox, security, other |

## Server-Only Credentials

These must NEVER appear in client-side code or React bundle:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `WHATSAPP_ACCESS_TOKEN`
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `WHATSAPP_SESSION_SECRET`
- `SANDBOX_ROOT`
- `WA_AUTH_ROOT`

These are injected via `vite.config.ts` `define` block for the client:
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `APP_URL`
- `VITE_SANDBOX_URL`
- `OLLAMA_API_KEY`
- `MODEL`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/env` | Admin | List all credentials with status |
| `POST` | `/api/admin/env` | Admin | Save/update admin credential |
| `POST` | `/api/admin/env/test` | Admin | Test a credential |
| `DELETE` | `/api/admin/env/:key` | Admin | Clear admin override |

## Adding a New ENV Variable

1. Add the key to `server/config/credentialSchema.ts`
2. Add the key to `.env.example`
3. If needed by client, add to `vite.config.ts` `define` block
4. Add admin field will appear automatically in Admin Portal

## Secure Storage

Admin-entered credentials are stored in `./.admin_credentials/credentials.json`:

- Values are encrypted with AES-256-GCM
- Encryption key is auto-generated at `./.admin_credentials/.encryption_key`
- Only the masked value is returned to the frontend
- Server-side reveal is restricted to admin API calls
