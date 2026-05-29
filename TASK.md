## TASK-20260529-0001: Remove Ollama from Artifact Critical Path

### START RECORD
- STATUS: COMPLETED
- Start time: 2026-05-29T10:00:00Z
- User request: Remove Ollama from artifact generation path, replace with DirectModelWorker, add /api/artifacts/generate endpoint, delete obsolete documentClient.ts
- Preservation constraints: Keep EburonWorker for backward compat, preserve all existing UI/CSS/functions, maintain WhatsApp routes
- Files/directories to inspect: server/index.ts, server/eburon.ts, src/App.tsx, src/lib/documentClient.ts, src/lib/executionDetector.ts, .env.example, server/config/credentialSchema.ts, server/sandbox.ts
- Success criteria: Typecheck passes, no Ollama in artifact generation path, new endpoint creates sandbox task + calls DirectModelWorker

### TODO
- [x] Read TASK.md
- [x] Inspect codebase
- [x] Create server/directModel.ts — DirectModelWorker class
- [x] Add POST /api/artifacts/generate endpoint to server/index.ts
- [x] Create src/lib/artifactClient.ts — frontend artifact client
- [x] Update src/App.tsx create_document handler to use artifactClient
- [x] Delete src/lib/documentClient.ts — obsolete Ollama-dependent file
- [x] Update .env.example with DIRECT_MODEL_* vars
- [x] Update server/config/credentialSchema.ts with DIRECT_MODEL_* fields
- [x] Update server/index.ts health check and worker init
- [x] Run typecheck to validate changes

### FINAL REPORT
- STATUS: COMPLETED
- End time: 2026-05-29T10:30:00Z
- Files changed:
  - Created: server/directModel.ts, src/lib/artifactClient.ts
  - Deleted: src/lib/documentClient.ts
  - Modified: server/index.ts, src/App.tsx, .env.example, server/config/credentialSchema.ts
- Validation performed: `npm run lint` (tsc --noEmit) — clean, zero errors
- CSS/UI preservation: No CSS/UI changes made. App.tsx changes limited to create_document handler logic only.
- Real data/API credential check: No credentials exposed. Direct model API key is server-only. Frontend only calls backend endpoint, never the model directly.
- Known issues: None
- Next step: Set DIRECT_MODEL_API_URL, DIRECT_MODEL_API_KEY, DIRECT_MODEL_NAME in .env to activate the new artifact generation path
