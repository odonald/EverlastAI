# EverlastAI - Voice-to-Enriched-Text Desktop Application

## Project Overview
A desktop application that captures voice input, transcribes it, and enriches it through AI-powered processing. The result is directly usable as structured notes, formatted text, or context-aware output.

**Contest Entry** | **Stack:** Next.js 14 + Tauri 2.0 | **Status:** In Development

---

## Expert Agents

When working on this project, invoke the appropriate expert agent based on the task at hand. Each agent has specific responsibilities and guidelines.

### @architect - System Architect
**Responsibility:** Overall system design, component relationships, data flow
**Invoke when:** Making architectural decisions, designing new features, evaluating trade-offs
**Guidelines:**
- Prioritize modularity and separation of concerns
- Design for extensibility (new transcription/LLM providers)
- Consider offline-first patterns where applicable
- Document all architectural decisions in `/docs/architecture/`

### @security - Security Expert
**Responsibility:** Authentication, API key management, data protection, vulnerability prevention
**Invoke when:** Handling credentials, implementing auth flows, storing sensitive data
**Guidelines:**
- Never store API keys in plain text - use OS keychain via Tauri
- Implement proper Auth0 flows with PKCE
- Sanitize all user inputs before LLM processing
- Follow OWASP guidelines for desktop applications
- Audit dependencies regularly for vulnerabilities

### @frontend - Frontend Expert
**Responsibility:** React components, UI state management, styling, accessibility
**Invoke when:** Building UI components, managing client state, styling
**Guidelines:**
- Use React Server Components where beneficial
- Implement proper loading and error states
- Follow atomic design principles
- Ensure keyboard navigation works throughout
- Use Tailwind CSS with consistent design tokens

### @backend - Backend Expert
**Responsibility:** API routes, server actions, data processing, external API integration
**Invoke when:** Building API endpoints, integrating external services, data transformation
**Guidelines:**
- Use Next.js App Router conventions
- Implement proper error handling and logging
- Design APIs to be provider-agnostic
- Use TypeScript strict mode
- Implement rate limiting and request validation

### @desktop - Desktop/Tauri Expert
**Responsibility:** Native integrations, hotkeys, system tray, IPC, platform-specific features
**Invoke when:** Implementing native features, Tauri commands, system integration
**Guidelines:**
- Use Tauri's security model properly (allowlist, CSP)
- Implement global hotkeys via Tauri plugins
- Handle platform differences (macOS, Windows, Linux)
- Use Tauri's IPC for Rust ↔ JS communication
- Optimize for minimal resource usage

### @voice - Voice/Audio Expert
**Responsibility:** Audio recording, transcription integration, audio processing
**Invoke when:** Working with microphone input, transcription APIs, audio formats
**Guidelines:**
- Support multiple audio input devices
- Implement proper audio level visualization
- Handle transcription streaming where available
- Provide fallback for offline scenarios
- Support both Deepgram and ElevenLabs APIs

### @ai - AI/LLM Expert
**Responsibility:** LLM integration, prompt engineering, output structuring
**Invoke when:** Designing prompts, integrating OpenAI/Claude, processing outputs
**Guidelines:**
- Design provider-agnostic LLM interface
- Implement streaming responses for better UX
- Create effective system prompts for enrichment
- Handle token limits and context windows
- Support multiple enrichment modes (summarize, format, extract, etc.)

### @ux - UX/Design Expert
**Responsibility:** User experience, interaction design, visual design, accessibility
**Invoke when:** Designing user flows, creating mockups, improving usability
**Guidelines:**
- Design for minimal friction (hotkey → speak → result)
- Follow platform-native design patterns
- Ensure WCAG 2.1 AA compliance
- Design clear visual feedback for all states
- Create consistent iconography and typography

### @testing - Testing Expert
**Responsibility:** Unit tests, integration tests, E2E tests, test strategy
**Invoke when:** Writing tests, setting up test infrastructure, debugging test failures
**Guidelines:**
- Use Vitest for unit/integration tests
- Use Playwright for E2E testing
- Maintain >80% code coverage for core logic
- Test all API integrations with mocks
- Implement visual regression testing

### @devops - DevOps/CI-CD Expert
**Responsibility:** Build pipelines, deployment, releases, infrastructure
**Invoke when:** Setting up CI/CD, configuring builds, managing releases
**Guidelines:**
- Use GitHub Actions for CI/CD
- Implement automated testing on PR
- Set up multi-platform builds (macOS, Windows, Linux)
- Use semantic versioning
- Automate release notes generation

### @docs - Documentation Expert
**Responsibility:** README, API docs, inline documentation, user guides
**Invoke when:** Writing documentation, improving code comments, creating guides
**Guidelines:**
- Keep README concise but complete
- Document all public APIs with JSDoc/TSDoc
- Maintain architecture decision records (ADRs)
- Create user-facing documentation for settings
- Include troubleshooting guides

### @code-quality - Clean Code Expert
**Responsibility:** Code style, refactoring, performance, maintainability
**Invoke when:** Reviewing code, optimizing performance, refactoring
**Guidelines:**
- Follow TypeScript best practices
- Keep functions small and focused (< 20 lines ideal)
- Use meaningful names (no abbreviations)
- Avoid premature optimization
- Eliminate code duplication (DRY)
- Prefer composition over inheritance

### @perf - Performance Expert
**Responsibility:** Bundle optimization, runtime performance, memory management
**Invoke when:** Optimizing load times, reducing memory usage, profiling
**Guidelines:**
- Monitor bundle size with each change
- Lazy load non-critical components
- Optimize re-renders with proper memoization
- Profile memory usage for audio handling
- Target < 100ms response time for UI interactions

---

## Architecture Overview

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
│  │  • Global Hotkeys  • Secure Storage  • System Tray          ││
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

---

## Tech Stack

### Core
- **Framework:** Next.js 14 (App Router)
- **Desktop:** Tauri 2.0
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui

### Authentication
- **Provider:** Auth0
- **Flow:** Authorization Code with PKCE

### Voice/Transcription
- **Primary:** Deepgram (streaming)
- **Alternative:** ElevenLabs
- **Audio:** Web Audio API + Tauri audio plugin

### AI/LLM
- **Primary:** OpenAI GPT-4
- **Alternative:** Anthropic Claude
- **Interface:** Vercel AI SDK

### Storage
- **Settings:** Tauri Store plugin
- **Secrets:** OS Keychain (via Tauri)
- **Cache:** IndexedDB

---

## Project Structure

```
everlast/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth-protected routes
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── voice/             # Voice recording components
│   │   ├── settings/          # Settings components
│   │   └── output/            # Output display components
│   ├── lib/
│   │   ├── auth/              # Auth0 utilities
│   │   ├── transcription/     # Transcription service adapters
│   │   ├── llm/               # LLM service adapters
│   │   ├── storage/           # Storage utilities
│   │   └── utils/             # General utilities
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── styles/                # Global styles
├── src-tauri/
│   ├── src/
│   │   ├── main.rs            # Tauri entry point
│   │   ├── commands/          # Tauri commands
│   │   └── hotkeys/           # Hotkey handling
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri configuration
├── docs/
│   ├── architecture/          # Architecture Decision Records
│   └── api/                   # API documentation
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── .github/
│   └── workflows/             # CI/CD workflows
├── claude.md                  # This file
├── README.md                  # Project README
├── package.json
└── tsconfig.json
```

---

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `release/*` - Release preparation

### Commit Convention
```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Scope: auth, voice, llm, ui, tauri, ci
```

### PR Process
1. Create feature branch from `develop`
2. Implement with tests
3. Create PR with description
4. Pass CI checks
5. Code review
6. Squash and merge

---

## Environment Variables

```env
# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=
NEXT_PUBLIC_AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# API Keys (stored securely, not in .env)
# Users configure these in-app settings

# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm tauri dev        # Start Tauri dev mode

# Build
pnpm build            # Build Next.js
pnpm tauri build      # Build desktop app

# Testing
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm test:coverage    # Run with coverage

# Linting
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check
pnpm format           # Prettier
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0   | 2025-01-20 | Initial project setup |

---

## Session Log

### 2025-01-20 - Project Initialization
- Created project structure
- Defined expert agents
- Set up development guidelines
- Initialized repository

---

*This file is automatically updated after each development session.*
