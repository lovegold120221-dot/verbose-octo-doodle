# Admin Portal

The Admin Portal is a protected environment for managing app credentials and WhatsApp configuration.

## Access

The Admin Portal is NOT accessible from the main header or via hover actions on the profile icon.

**How to access:**
1. Navigate directly to `/adminportal` in the browser
2. User must be authenticated (Firebase Auth)
3. Server-side admin access requires the `ADMIN_USERS` env var on the backend

**Server-side protection:**
All `/api/admin/*` routes are protected by `requireAdmin` middleware in `server/middleware/adminAuth.ts`. The middleware checks:

- `x-user-id` header (user UID)
- `x-user-email` header (user email, lowercased)
- `x-firebase-token` header (Firebase ID token)
- The email must be in the `ADMIN_USERS` comma-separated list

## Sections

### 1. Environment Credentials

Displays all app credentials with their current status:

#### Status Badges

| Badge | Meaning |
|-------|---------|
| **Runtime ENV** | Configured via `process.env` at runtime |
| **Admin Stored** | Admin-entered override stored securely |
| **Missing** | No value found anywhere |

#### Filters

- All, Configured, Missing, Server-Only, and per-category filters

#### Actions per credential

- **Add/Override** — Enter a new value (stored encrypted server-side)
- **Test** — Server-side connectivity test
- **Copy** — Copy masked value to clipboard
- **Reveal/Hide** — Toggle visibility of admin-stored values
- **Clear** — Remove admin override, fall back to runtime ENV

### 2. WhatsApp Configuration

Server-side WhatsApp settings with:
- Provider toggle (Linked Device / Cloud API)
- Cloud API credential fields (Phone Number ID, Access Token, etc.)
- Linked-device pairing with QR code
- Test message send

### 3. Permissions

Toggle switches for WhatsApp capabilities (send, read, contacts, groups, etc.)

### 4. Messages

Recent chat list and message activity log.

## Credential Resolution Priority

When the backend needs a credential:

1. Admin Portal stored credential (encrypted server-side)
2. Runtime `process.env`
3. Local `.env` (development only)
4. Fail with clear error
