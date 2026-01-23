# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Everlast AI Recorder is a desktop application that transforms voice input into enriched, structured text. It combines Next.js 14 (static export) with Tauri 2.0 for cross-platform desktop deployment.

**Core pipeline:** Global hotkey → Voice recording → AI transcription (with speaker diarization) → LLM enrichment → Session storage

## Commands

```bash
# Development
pnpm tauri dev           # Full app (Next.js + Tauri together) - primary dev command
pnpm dev                 # Next.js only on localhost:3000

# Building
pnpm tauri build         # Production desktop app bundle
pnpm build               # Next.js static export to out/

# Testing & Quality
pnpm test                # Vitest unit tests
pnpm test -- path/to/test.ts  # Run single test file
pnpm test:coverage       # Tests with coverage
pnpm test:e2e            # Playwright E2E tests
pnpm lint                # ESLint
pnpm typecheck           # TypeScript strict check
pnpm format              # Prettier formatting

# Rust backend only
cd src-tauri && cargo build   # Build Rust code
cd src-tauri && cargo check   # Fast type check
```

## Architecture

### Two Runtimes
- **Frontend (Next.js):** Static export served in Tauri webview. All UI in `src/`
- **Backend (Tauri/Rust):** Native OS integration in `src-tauri/`. Handles hotkeys, secure storage, system tray, session persistence

### Frontend-Tauri Communication

**Tauri IPC Commands** (JS → Rust via `invoke()`):
```typescript
// API Key Storage
invoke('save_api_keys', { keys: ApiKeys, userId: string })
invoke('get_api_keys', { userId: string })

// Recording State
invoke('set_recording_state', { recording: boolean })

// Session Storage
invoke('list_sessions', { userId: string })
invoke('save_session', { userId, sessionId, sessionData, listItem })
invoke('get_session', { userId, sessionId })
invoke('delete_session', { userId, sessionId })
invoke('update_session_metadata', { userId, sessionId, title?, tags?, starred? })
```

**Tauri Events** (Rust → JS):
```typescript
window.addEventListener('toggle-recording', ...)  // Global hotkey (Cmd/Ctrl+Shift+R)
window.addEventListener('auth-callback', ...)     // OAuth deep-link
```

### API Routes

Server-side proxies to avoid CORS and protect API keys:

| Route | Purpose |
|-------|---------|
| `/api/transcribe` | Proxies audio to Deepgram/ElevenLabs for transcription |
| `/api/enrich` | Routes to OpenAI/Anthropic/Ollama for LLM enrichment |
| `/api/validate-key` | Validates API keys for each provider |
| `/api/auth/session` | Auth0 session management (file-based token storage) |
| `/api/notion/auth` | POST - Returns Notion OAuth URL with CSRF token |
| `/api/notion/exchange` | POST - Exchanges OAuth code for access token |
| `/api/notion/export` | POST - Creates page in user's Notion workspace |
| `/api/notion/session` | GET/POST/DELETE - Temp storage for cross-context OAuth |

### Service Adapter Pattern

Both transcription and LLM use adapter pattern for swappable providers:

```typescript
// src/lib/transcription/index.ts
transcribe(audioBlob, { provider: 'deepgram' | 'elevenlabs' | 'whisper', apiKey })

// src/lib/llm/index.ts
enrich(text, { provider: 'openai' | 'anthropic' | 'ollama', mode, apiKey })
```

Modes: `auto`, `notes`, `summary`, `action-items`, `format`, `translate`, `insights`

### AI Actions (Session Detail)

After recording, users can apply AI enrichments to transcripts via the session detail view:
- **Summarize** - Concise summary of the transcript
- **Translate** - Translate to 15+ supported languages (uses LLM, not Deepgram)
- **Extract Tasks** - Extract actionable items from the content
- **Key Insights** - Extract best practices and key learnings
- **Clean Format** - Format transcript for readability

Enrichments are saved to the session and can be deleted individually.

### Speaker Naming

Users can rename speakers from "Speaker 1" to custom names (e.g., "John", "Sarah"):
- Click speaker badge in legend or transcript to edit
- Names persist in session storage
- Custom names are used in all exports (PDF, Markdown, Email, Webhook)
- Implementation: `updateSpeakerName()` in `src/lib/sessions.ts`, stores in `speaker.label`

### Export Options

Sessions can be exported via `src/lib/export.ts`:
- **PDF** - Formatted document with speaker labels, timestamps, and enrichments
- **Markdown** - Text export with speaker-attributed transcript
- **Email** - Opens mailto with transcript content
- **Webhook** - POST to configured URL (Zapier, n8n, Make) with full session JSON
- **Notion** - Creates page in connected workspace via OAuth

### Notion OAuth Integration

Notion uses OAuth 2.0 with external browser (same pattern as Auth0):
1. App calls POST `/api/notion/auth` with sessionId, receives authUrl
2. Opens authUrl in system browser, user authorizes
3. Notion redirects to `/notion/callback` (client-side page)
4. Page calls POST `/api/notion/exchange` with code, receives token
5. Token stored via session API, app polls and retrieves it

**Note:** Uses page route (`/notion/callback`) not API route for OAuth callback to work with static export.

### Real-Time Transcription

The `LiveRecorder` component uses WebSocket streaming directly to Deepgram for:
- Real-time transcription with interim results
- Speaker diarization (speakers labeled S1, S2, etc.)
- Multi-language detection
- Timestamps per utterance

### Secure Storage

API keys use ChaCha20Poly1305 encryption with Argon2 key derivation:
- Per-user encryption keys derived from user email
- Stored in `~/.config/everlast/secure/keys_{sanitized_email}.enc`
- Sessions stored encrypted in `~/.config/everlast/secure/sessions_{user}/`

### Auth Flow

Auth0 PKCE via external browser (passkeys don't work in webview):
1. Tauri generates `sessionId`, registers with `/api/auth/session`, opens Auth0 in system browser
2. User authenticates in browser, Auth0 redirects to `http://localhost:3000` with `code`
3. Browser's `handleRedirectCallback()` fails (state mismatch - different localStorage context)
4. Browser clears its Auth0 cache, does silent auth with `cacheMode: 'off'` to get fresh tokens
5. Browser stores tokens via `/api/auth/session` API (file-based in `os.tmpdir()`)
6. Tauri polls `/api/auth/session`, retrieves tokens, stores user in localStorage, reloads

**Important:** `logout()` in Tauri must clear Auth0's localStorage cache (`@@auth0spajs@@*` keys) and reset the client to prevent stale session data when switching users.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main dashboard, orchestrates recording/sessions/settings |
| `src/components/voice/live-recorder.tsx` | Real-time recording with WebSocket streaming, speaker diarization, API key validation |
| `src/components/sessions/session-cards.tsx` | Session grid view grouped by date |
| `src/components/sessions/session-detail.tsx` | Full session view with transcript, AI actions, speaker naming, enrichments |
| `src/lib/sessions.ts` | Session storage interface (invokes Tauri commands), speaker naming |
| `src/lib/export.ts` | Export functions: PDF, Markdown, Email, Webhook, Notion |
| `src/components/settings/integrations-settings.tsx` | Webhook and Notion OAuth connection UI |
| `src/lib/llm/index.ts` | LLM adapter with enrichment mode prompts |
| `src/lib/transcription/index.ts` | Transcription adapter |
| `src/hooks/use-settings.ts` | Zustand store, loads API keys from Tauri, validates keys |
| `src/contexts/auth-context.tsx` | Auth0 state, browser/Tauri auth flow |
| `src-tauri/src/lib.rs` | Tauri setup: global hotkey, system tray, deep-link handler |
| `src-tauri/src/commands.rs` | Rust IPC commands: encrypted storage, session CRUD |
| `src-tauri/tauri.conf.json` | Tauri config, CSP, window settings, permissions |

## Environment Variables

```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

API keys (Deepgram, ElevenLabs, OpenAI, Anthropic) are stored encrypted via Settings UI, not in env vars.

## Adding a New Provider

**Transcription provider:**
1. Create `src/lib/transcription/newprovider.ts` with async function returning transcribed text
2. Add case to switch in `src/lib/transcription/index.ts`
3. Add to `transcriptionProvider` type in `src/hooks/use-settings.ts`
4. Add UI option in `src/components/settings/transcription-settings.tsx`

**LLM provider:**
1. Create `src/lib/llm/newprovider.ts`
2. Add case to switch in `src/lib/llm/index.ts`
3. Add to `llmProvider` type in settings
4. Add UI option in `src/components/settings/llm-settings.tsx`

## Recording Flow

The dashboard has three states for recording:
1. **Idle** - Shows "New Session" button
2. **Ready** - Shows "Start Recording" button with cancel option (user clicked New Session)
3. **Recording** - Active recording with stop button

### Background Recording

The global hotkey (Cmd/Ctrl+Shift+R) supports true background recording:
1. Press hotkey from any app → recording starts silently (window stays hidden)
2. System tray icon changes to show recording state, tooltip shows "Recording..."
3. Press hotkey again → recording stops, window appears with transcript

Implementation:
- `src-tauri/src/lib.rs`: Hotkey handler dispatches event without showing window
- `src/components/voice/live-recorder.tsx`: `showAndFocusWindow()` called on recording complete
- `src-tauri/src/commands.rs`: `update_tray_for_recording()` updates tray icon/tooltip

**Note:** On macOS, requires Accessibility permissions (System Preferences → Privacy & Security → Accessibility).

## API Key Validation

API keys are validated against providers via `/api/validate-key`:
- Validation runs automatically when keys change
- Dashboard shows warning if keys are missing or invalid
- No warning shown while loading (prevents flash)
- Generic warning message without exposing specific key names

## Tauri Permissions

Capabilities defined in `src-tauri/capabilities/default.json`. CSP in `tauri.conf.json` must allow external API domains (Auth0, Deepgram, ElevenLabs, OpenAI, Anthropic, Notion).

## Static Export Constraints

With `output: 'export'` in Next.js config:
- API routes only work during `pnpm dev`, not in production Tauri build
- GET routes using `request.url` or `nextUrl.searchParams` fail static analysis
- Use POST routes or client-side pages for dynamic URL parsing (see Notion OAuth)
- Page routes at `/notion/callback` handle OAuth redirects client-side

## Landing Page

Located at `src/app/landing/page.tsx`:
- Marketing page with features, pricing, integrations, download links
- Theme toggle in header cycles: Light → Dark → System
- Auto-sets theme to "system" on page load to follow OS preference
- Uses next-themes with `ThemeProvider` in `src/components/providers.tsx`
