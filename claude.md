# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EverlastAI is a desktop application (Next.js 14 + Tauri 2.0) that captures voice input, transcribes it via Deepgram or ElevenLabs, and enriches it through OpenAI or Claude. The pipeline is: Hotkey → Record → Transcribe → Enrich → Display.

## Commands

```bash
# Development (runs Next.js + Tauri together)
pnpm tauri dev

# Build desktop app
pnpm tauri build

# Frontend only
pnpm dev              # Next.js dev server on localhost:3000
pnpm build            # Build Next.js static export

# Testing
pnpm test             # Vitest unit tests
pnpm test:coverage    # With coverage report

# Code quality
pnpm lint             # ESLint
pnpm typecheck        # TypeScript strict check
pnpm format           # Prettier
```

## Architecture

### Two Runtimes
- **Frontend (Next.js):** Static export in `src/`, served by Tauri webview
- **Backend (Tauri/Rust):** Native layer in `src-tauri/`, handles OS integration

### Key Data Flows
1. **Voice Recording:** `VoiceRecorder` component → Web Audio API → MediaRecorder → Blob
2. **Transcription:** Blob → `src/lib/transcription/{deepgram,elevenlabs}.ts` → API call → text
3. **Enrichment:** text → `src/lib/llm/{openai,claude}.ts` → API call → enriched output
4. **Secure Storage:** API keys stored via Tauri → OS Keychain (not localStorage)
5. **Global Hotkey:** Tauri Rust (`src-tauri/src/lib.rs`) → JS event `toggle-recording`

### Service Adapters Pattern
Transcription and LLM services use adapter pattern for provider flexibility:
- `src/lib/transcription/index.ts` exports `transcribe(blob, provider)`
- `src/lib/llm/index.ts` exports `enrich(text, {provider, mode})`

### Tauri IPC Commands
Defined in `src-tauri/src/commands.rs`:
- `get_api_key`, `save_api_key`, `delete_api_key` - Keychain operations
- `get_api_keys`, `save_api_keys` - Batch operations

## Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main UI: recorder, output display, auth state |
| `src/components/voice/voice-recorder.tsx` | Audio recording with visualization |
| `src/lib/llm/index.ts` | LLM enrichment with mode-specific prompts |
| `src/hooks/use-settings.ts` | Zustand store for app settings |
| `src-tauri/src/lib.rs` | Tauri setup, global hotkey registration |
| `src-tauri/src/commands.rs` | Rust commands for secure key storage |
| `src-tauri/tauri.conf.json` | Tauri config, CSP, window settings |
| `src-tauri/capabilities/default.json` | Tauri 2 permissions |

## Environment Variables

```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

API keys (Deepgram, ElevenLabs, OpenAI, Anthropic) are stored in OS keychain via Settings UI, not env vars.

## Enrichment Modes

Defined in `src/lib/llm/index.ts`:
- `auto` - Detect content type and format appropriately
- `notes` - Structured bullet points with headings
- `summary` - Concise 2-3 paragraph summary
- `action-items` - Extract tasks as checklist
- `format` - Clean grammar, remove filler words

## Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scope: auth, voice, llm, ui, tauri, ci
```
