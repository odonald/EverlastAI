# EverlastAI

> Transform your voice into structured, AI-enriched content

A desktop application that captures voice input, transcribes it, and enriches it through AI-powered processing. The result is directly usable as structured notes, formatted text, or context-aware output.

## The Problem

Converting spoken thoughts into actionable, well-formatted text is tedious. Traditional voice-to-text solutions produce raw transcriptions that require significant editing. Professionals need a faster way to capture ideas, meeting notes, and tasks without the friction of manual formatting.

## The Solution

EverlastAI provides a seamless voice-to-enriched-text pipeline:

1. **Hotkey Activation** - Press `Cmd/Ctrl + Shift + Space` anywhere to start recording
2. **Voice Capture** - Speak naturally without worrying about structure
3. **AI Transcription** - Real-time speech-to-text via Deepgram or ElevenLabs
4. **Smart Enrichment** - AI transforms raw transcription into structured output

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tauri Shell                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Next.js Application                       ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ ││
│  │  │   Auth0     │  │  Settings   │  │    Main Interface   │ ││
│  │  │   Module    │  │   (API Keys)│  │   (Voice + Output)  │ ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ ││
│  │         │                │                     │            ││
│  │  ┌──────┴─────────────────┴─────────────────────┴──────────┐││
│  │  │                   Service Layer                          │││
│  │  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │││
│  │  │  │  Voice   │  │ Transcription │  │  LLM Enrichment │   │││
│  │  │  │ Recorder │  │   Service     │  │     Service     │   │││
│  │  │  └────┬─────┘  └───────┬───────┘  └────────┬────────┘   │││
│  │  └───────┼────────────────┼───────────────────┼────────────┘││
│  └──────────┼────────────────┼───────────────────┼─────────────┘│
│             │                │                   │               │
│  ┌──────────┴────────────────┴───────────────────┴─────────────┐│
│  │                    Tauri IPC Bridge                          ││
│  │  • Global Hotkeys  • Secure Storage  • System Integration   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Auth0   │   │ Deepgram │   │  OpenAI  │
        │          │   │ElevenLabs│   │  Claude  │
        └──────────┘   └──────────┘   └──────────┘
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Desktop | Tauri 2.0 |
| Language | TypeScript + Rust |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Auth0 |
| Transcription | Deepgram, ElevenLabs |
| LLM | OpenAI GPT-4, Anthropic Claude |
| State | Zustand |
| Storage | OS Keychain (via Tauri) |

## Features

- **Global Hotkey** - Activate from any application
- **Multiple Transcription Providers** - Choose between Deepgram and ElevenLabs
- **Multiple LLM Providers** - Choose between OpenAI and Claude
- **Enrichment Modes** - Auto-detect, Notes, Summary, Action Items, Format
- **Secure API Key Storage** - Keys stored in OS keychain, never in plain text
- **Cross-Platform** - macOS, Windows, Linux

## Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- Rust 1.70+
- Tauri CLI 2.0

### Installation

```bash
# Clone the repository
git clone https://github.com/odonald/EverlastAI.git
cd EverlastAI

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### Building

```bash
# Build for production
pnpm tauri build
```

### Configuration

1. Launch the application
2. Sign in with Auth0
3. Go to Settings → API Keys
4. Add your API keys:
   - **Deepgram** or **ElevenLabs** for transcription
   - **OpenAI** or **Anthropic** for LLM enrichment

## Design Decisions

### Why Tauri over Electron?

- **Smaller bundle size** (~10MB vs ~150MB)
- **Better performance** (native Rust backend)
- **Improved security** (no Node.js in main process)
- **Native OS integration** (keychain, notifications)

### Why separate transcription and LLM services?

Allows users to mix providers based on their needs and existing API keys. Some users prefer Deepgram for speed, others prefer ElevenLabs for accuracy. Same flexibility for LLM choice.

### Why store API keys in OS keychain?

Security best practice. API keys are sensitive credentials that shouldn't be stored in plain text files or browser storage. The OS keychain provides encrypted storage with user authentication.

### Why Auth0?

- Handles security complexities (PKCE, token refresh)
- Works well with desktop apps via custom URI schemes
- User data isolation for future cloud features

## Project Structure

```
everlast/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Service adapters and utilities
│   └── types/                  # TypeScript types
├── src-tauri/
│   ├── src/                    # Rust backend
│   └── tauri.conf.json         # Tauri configuration
├── .github/workflows/          # CI/CD pipelines
└── claude.md                   # AI development context
```

## Commands

```bash
pnpm dev          # Start Next.js dev server
pnpm tauri dev    # Start Tauri dev mode
pnpm build        # Build Next.js
pnpm tauri build  # Build desktop app
pnpm test         # Run tests
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript check
```

## License

MIT

---

Built with Tauri, Next.js, and AI-powered enrichment.
