> **⚠️ IMPORTANT DISCLAIMER**
>
> This project is an **independent contest submission** to the EverlastAI Contest. It is **NOT** a product produced, maintained, endorsed, or released by EverlastAI. This is a personal/team project created solely for the competition. Any similarity in naming is for contest identification purposes only.

---

<div align="center">

# 🎙️ Everlast AI Recorder

**Transform your voice into AI-enriched, structured content**

_Contest Submission - Independent Project_

---

### 🔑 Demo Access

Try the app with these demo credentials:

| Email           | Password   |
| --------------- | ---------- |
| `demo@demo.com` | `Demo123!` |

---

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-FFC131?logo=tauri)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange?logo=rust)](https://www.rust-lang.org)

_Press a hotkey. Speak your thoughts. Get perfectly formatted, AI-enriched content._

[Download](#-download) · [Features](#-features) · [Documentation](#-documentation) · [Contributing](#-contributing)

</div>

---

## 🌟 Overview

Everlast AI Recorder is a **privacy-focused desktop application** that revolutionizes voice-to-text workflows. Capture ideas, meeting notes, and thoughts through natural speech, then watch as AI transforms them into structured, actionable content.

Unlike simple voice recorders, Everlast AI Recorder provides:

- **Real-time transcription** with speaker identification
- **AI-powered enrichment** (summaries, tasks, insights, translation)
- **Beautiful, formatted output** ready for immediate use
- **Privacy-first design** with local encrypted storage
- **Seamless export** to PDF, DOCX, Markdown, Notion, and webhooks
- **Automation-ready** with direct Zapier and n8n integration

### Why Everlast AI Recorder?

| Traditional Voice-to-Text    | Everlast AI Recorder                                   |
| ---------------------------- | ------------------------------------------------------ |
| Raw, unformatted transcripts | Structured, formatted output                           |
| No speaker identification    | Full speaker diarization with custom names             |
| Single language only         | Real-time language detection and switching             |
| Manual editing required      | AI enrichment with multiple modes                      |
| Limited export options       | PDF, DOCX, Markdown, Notion, webhooks                  |
| No automation support        | **Direct Zapier & n8n integration for workflows**      |
| Cloud-only or local-only     | Flexible: cloud APIs or fully local (Whisper + Ollama) |

---

## ✨ Features

### 🎯 Core Capabilities

- **Global Hotkey Activation** - Press `Cmd/Ctrl+Shift+R` from any app to start/stop recording
- **Real-Time Transcription** - Watch your words appear as you speak with WebSocket streaming
- **Speaker Diarization** - Automatically identifies and labels different speakers (S1, S2, etc.)
- **Custom Speaker Names** - Rename speakers to actual names (e.g., "John", "Sarah") with persistent storage
- **Real-Time Language Detection** - Automatically detects and switches between languages mid-conversation
- **Background Recording** - Record silently without showing the app window, system tray shows recording status

### 🤖 AI-Powered Enrichments

Apply these intelligent transformations to any recording:

- **Summarize** - Generate concise summaries of conversations or notes
- **Extract Tasks** - Automatically pull out action items and to-dos
- **Key Insights** - Identify best practices, learnings, and important points
- **Translate** - Translate content to 15+ languages
- **Clean Format** - Polish transcripts for readability and structure

### 📤 Flexible Export Options

- **PDF** - Beautiful formatted documents with speaker labels and timestamps
- **DOCX** - Microsoft Word format with full formatting
- **Markdown** - Clean text format for documentation
- **Email** - One-click sharing via mailto
- **Webhooks** - Integrate with Zapier, n8n, Make, or custom endpoints
- **Notion** - Direct export to your Notion workspace via OAuth

### 🔗 Automation Ready

**Turn voice into automated workflows!** The built-in webhook integration connects directly to popular automation platforms:

| Platform                         | Use Case                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- |
| **[Zapier](https://zapier.com)** | Connect to 5,000+ apps - auto-create tasks in Asana, send to Slack, update CRMs |
| **[n8n](https://n8n.io)**        | Self-hosted automation - full control over your data and workflows              |
| **[Make](https://make.com)**     | Visual workflow builder - complex multi-step automations                        |
| **Custom Endpoints**             | Your own APIs - integrate with internal tools and databases                     |

**Example automations:**

- 🎯 Record a meeting → Auto-extract tasks → Create tickets in Jira
- 📧 Voice memo → AI summary → Send digest email to team
- 📝 Client call → Transcribe → Update CRM notes automatically
- 🌐 Multilingual recording → Translate → Post to regional Slack channels

### 🔒 Privacy & Security

- **Your Data, Your Choice** - Use cloud APIs (Deepgram, OpenAI) for best quality, or go fully local with Whisper + Ollama
- **Encrypted Storage** - API keys and sessions encrypted with ChaCha20Poly1305 + Argon2
- **Secure Key Derivation** - Per-user encryption keys derived from your identity
- **No Cloud Storage** - Recordings and transcripts stay on your device unless you explicitly export them
- **Local Processing Option** - Run completely offline with Whisper for transcription and Ollama for AI enrichment

### 🎨 Modern UI/UX

- **Beautiful Dashboard** - Clean, intuitive interface built with shadcn/ui
- **Dark Mode** - Full support with system preference detection
- **Session Management** - Organized by date with search and filtering
- **Real-Time Preview** - See transcription as it happens
- **Responsive Design** - Optimized for desktop workflows

---

## 🚀 Quick Start

### Prerequisites

Before installing, ensure you have:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **pnpm** 9.0 or higher ([Install](https://pnpm.io/installation))
- **Rust** 1.70 or higher ([Install](https://rustup.rs/))
- **Auth0 Account** - Required for authentication ([Sign up free](https://auth0.com/))
  - Create a Single Page Application in Auth0 Dashboard
  - Set allowed callback URLs to `http://localhost:3000`
  - Copy your Domain and Client ID to `.env`
- **API Keys** for at least one transcription and one LLM provider:
  - Transcription: [Deepgram](https://deepgram.com) or [ElevenLabs](https://elevenlabs.io)
  - LLM: [OpenAI](https://platform.openai.com) or [Anthropic](https://console.anthropic.com)

### Installation

#### Option 1: Download Pre-built Binaries (Recommended)

Coming soon! Pre-built binaries for macOS, Windows, and Linux will be available in the [Releases](https://github.com/odonald/everlast/releases) section.

#### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/odonald/everlast.git
cd everlast

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### First Launch Setup

1. **Sign In** - Authenticate with Auth0 (required for per-user encryption)
2. **Add API Keys** - Go to Settings → API Keys and add your credentials:
   - **Transcription**: Deepgram or ElevenLabs API key
   - **LLM**: OpenAI or Anthropic API key
3. **Configure Settings** - Choose your preferred providers and enrichment modes
4. **Test Recording** - Click "New Session" or use the global hotkey `Cmd/Ctrl+Shift+R`

### Configuration

#### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Auth0 Configuration (Required)
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Notion Integration (Optional)
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
NOTION_REDIRECT_URI=http://localhost:3000/api/notion/callback
NEXT_PUBLIC_NOTION_ENABLED=true
```

**Important:** Never commit your `.env` file! API keys for Deepgram, ElevenLabs, OpenAI, and Anthropic are stored securely in the OS keychain via the Settings UI, not in environment variables.

#### macOS Permissions

Everlast AI Recorder requires **Accessibility permissions** for global hotkeys:

1. Go to System Preferences → Privacy & Security → Accessibility
2. Add Everlast AI Recorder to the allowed apps list
3. Restart the application

---

## 📖 Documentation

### Architecture

Everlast AI Recorder uses a hybrid architecture combining Next.js and Tauri:

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Native Shell                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js 14 (Static Export)              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │   Auth   │  │ Settings │  │    Dashboard     │  │   │
│  │  │ (Auth0)  │  │ (API Keys)│  │ (Recording/Sess.)│  │   │
│  │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │   │
│  │       └─────────────┴─────────────────┘            │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │           Service Layer                       │  │   │
│  │  │  Transcription  LLM  Export  Session Storage │  │   │
│  │  └────────────────┬─────────────────────────────┘  │   │
│  └───────────────────┼────────────────────────────────┘   │
│  ┌───────────────────┴────────────────────────────────┐   │
│  │              Tauri IPC Bridge (Rust)               │   │
│  │  • Global Hotkeys  • Encrypted Storage             │   │
│  │  • System Tray     • Session Persistence           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
    ┌──────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
    │   Deepgram    │  │  OpenAI/Claude  │  │   Notion API   │
    │  ElevenLabs   │  │     Ollama      │  │   Webhooks     │
    └───────────────┘  └─────────────────┘  └────────────────┘
```

#### Why This Stack?

- **Tauri** - 10MB bundles vs. 150MB with Electron, native performance, better security
- **Next.js** - Modern React framework with static export for embedded web views
- **Rust** - Secure, fast backend for OS integration and encryption
- **TypeScript** - Type safety across the entire frontend
- **Zustand** - Lightweight state management without Redux boilerplate

### Project Structure

```
everlast/
├── src/                          # Frontend (Next.js)
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Main dashboard
│   │   ├── landing/              # Marketing page
│   │   └── api/                  # API routes (transcription, LLM, auth)
│   ├── components/               # React components
│   │   ├── voice/                # Recording UI (LiveRecorder)
│   │   ├── sessions/             # Session management UI
│   │   ├── settings/             # Settings panels
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/                    # Custom React hooks
│   │   └── use-settings.ts       # Zustand store for settings
│   ├── lib/                      # Core business logic
│   │   ├── transcription/        # Transcription adapters
│   │   ├── llm/                  # LLM adapters
│   │   ├── export.ts             # Export functions
│   │   └── sessions.ts           # Session storage interface
│   └── contexts/                 # React contexts
│       └── auth-context.tsx      # Auth0 integration
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── lib.rs                # Tauri setup (hotkeys, tray, deep-link)
│   │   ├── commands.rs           # IPC commands (storage, sessions)
│   │   ├── storage.rs            # Encrypted storage layer
│   │   └── sessions.rs           # Session persistence
│   ├── tauri.conf.json           # Tauri configuration
│   └── Cargo.toml                # Rust dependencies
├── .github/                      # GitHub configuration
│   ├── workflows/                # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/           # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md  # PR template
├── CONTRIBUTING.md               # Contribution guidelines
├── CODE_OF_CONDUCT.md            # Community standards
├── SECURITY.md                   # Security policy
└── CLAUDE.md                     # AI development context
```

### Key Commands

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

---

## 🛠️ Development

### Adding a New Transcription Provider

1. Create `src/lib/transcription/newprovider.ts`:

```typescript
export async function transcribeWithNewProvider(audioBlob: Blob, apiKey: string): Promise<string> {
  // Implementation
}
```

2. Add case to `src/lib/transcription/index.ts`
3. Update `transcriptionProvider` type in `src/hooks/use-settings.ts`
4. Add UI option in `src/components/settings/transcription-settings.tsx`

### Adding a New LLM Provider

1. Create `src/lib/llm/newprovider.ts`
2. Add case to `src/lib/llm/index.ts`
3. Update `llmProvider` type in settings
4. Add UI option in `src/components/settings/llm-settings.tsx`

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test -- --watch

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
```

---

## 📥 Download

### Pre-built Binaries

| Platform              | Download    | Requirements               |
| --------------------- | ----------- | -------------------------- |
| macOS (Apple Silicon) | Coming soon | macOS 11.0+                |
| macOS (Intel)         | Coming soon | macOS 10.15+               |
| Windows               | Coming soon | Windows 10+                |
| Linux                 | Coming soon | Ubuntu 20.04+ / Fedora 36+ |

### Building from Source

See [Installation](#installation) above.

---

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Ways to Contribute

- 🐛 Report bugs and issues
- 💡 Suggest new features or improvements
- 📝 Improve documentation
- 🧪 Write tests
- 🔧 Submit pull requests
- 🌍 Translate the app to new languages
- ⭐ Star the repository to show support

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/everlast.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes and test thoroughly
5. Run tests: `pnpm test && pnpm lint && pnpm typecheck`
6. Commit with a clear message: `git commit -m "Add: brief description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request with a detailed description

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with these amazing technologies:

- [Tauri](https://tauri.app) - Desktop framework
- [Next.js](https://nextjs.org) - React framework
- [Deepgram](https://deepgram.com) - Speech-to-text API
- [OpenAI](https://openai.com) & [Anthropic](https://anthropic.com) - LLM providers
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Auth0](https://auth0.com) - Authentication

Special thanks to all [contributors](https://github.com/odonald/everlast/graphs/contributors) who help make Everlast AI Recorder better!

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/odonald/everlast/issues)
- **Discussions**: [GitHub Discussions](https://github.com/odonald/everlast/discussions)
- **Security**: See [SECURITY.md](SECURITY.md) for reporting vulnerabilities

---

<div align="center">

[⬆ Back to Top](#-everlastai)

</div>
