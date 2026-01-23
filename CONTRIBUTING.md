# Contributing to Everlast AI Recorder

First off, thank you for considering contributing to Everlast AI Recorder! It's people like you that make Everlast AI Recorder such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/odonald/everlast/issues) to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** - Include code samples, screenshots, or logs
- **Describe the behavior you observed** and what you expected to see
- **Include details about your environment**:
  - OS and version (macOS 14.2, Windows 11, Ubuntu 22.04, etc.)
  - Node.js version (`node --version`)
  - pnpm version (`pnpm --version`)
  - Rust version (`rustc --version`)
  - App version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most users
- **List examples** of how it could work or be used
- **Include mockups or wireframes** if applicable

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** - Run `pnpm format` before committing
3. **Write clear commit messages** following [Conventional Commits](https://www.conventionalcommits.org/)
4. **Include tests** for new features or bug fixes
5. **Update documentation** if needed (README, CLAUDE.md, inline comments)
6. **Ensure all tests pass** before submitting
7. **Fill out the PR template** completely

## Development Setup

### Prerequisites

- Node.js 18.0 or higher
- pnpm 9.0 or higher
- Rust 1.70 or higher
- Git

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/everlast.git
cd everlast

# Add upstream remote
git remote add upstream https://github.com/odonald/everlast.git

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Auth0 credentials

# Run development server
pnpm tauri dev
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, self-documenting code
   - Add comments for complex logic
   - Follow existing patterns and conventions

3. **Test your changes**
   ```bash
   pnpm lint           # Check for linting errors
   pnpm typecheck      # Check TypeScript types
   pnpm test           # Run unit tests
   pnpm test:e2e       # Run E2E tests (optional but recommended)
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the [repository](https://github.com/odonald/everlast)
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template completely
   - Wait for review and address feedback

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new files
- Follow the existing code style (enforced by ESLint and Prettier)
- Use meaningful variable and function names
- Prefer functional components and hooks
- Use Zustand for state management (avoid prop drilling)
- Document complex functions with JSDoc comments

```typescript
/**
 * Transcribes audio using the specified provider
 * @param audioBlob - The audio data to transcribe
 * @param options - Transcription options including provider and API key
 * @returns The transcribed text
 */
export async function transcribe(
  audioBlob: Blob,
  options: TranscriptionOptions
): Promise<string> {
  // Implementation
}
```

### Rust

- Follow Rust conventions and idioms
- Use `cargo fmt` for formatting
- Run `cargo clippy` to catch common mistakes
- Document public functions with doc comments

```rust
/// Encrypts data using ChaCha20Poly1305
///
/// # Arguments
/// * `data` - The data to encrypt
/// * `key` - The encryption key
///
/// # Returns
/// Encrypted data as a byte vector
pub fn encrypt(data: &[u8], key: &[u8]) -> Result<Vec<u8>, Error> {
    // Implementation
}
```

### React Components

- One component per file
- Use named exports
- Props interface should be defined above the component
- Use destructuring for props
- Keep components focused and single-purpose

```typescript
interface MyComponentProps {
  title: string;
  onAction: () => void;
  isLoading?: boolean;
}

export function MyComponent({ title, onAction, isLoading = false }: MyComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      {/* ... */}
    </div>
  );
}
```

## Project Structure

Understanding the architecture helps you contribute effectively:

```
src/                          # Frontend (Next.js + React)
├── app/                      # Next.js App Router pages
├── components/               # React components
│   ├── voice/                # Recording-related components
│   ├── sessions/             # Session management components
│   ├── settings/             # Settings panels
│   └── ui/                   # Reusable UI components (shadcn/ui)
├── hooks/                    # Custom React hooks
├── lib/                      # Core business logic
│   ├── transcription/        # Transcription service adapters
│   ├── llm/                  # LLM service adapters
│   ├── export.ts             # Export utilities
│   └── sessions.ts           # Session storage interface
└── contexts/                 # React contexts

src-tauri/                    # Backend (Rust + Tauri)
├── src/
│   ├── lib.rs                # Main Tauri setup
│   ├── commands.rs           # IPC command handlers
│   ├── storage.rs            # Encrypted storage
│   └── sessions.rs           # Session persistence
└── tauri.conf.json           # Tauri configuration
```

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run specific test file
pnpm test -- src/lib/transcription/deepgram.test.ts

# Generate coverage report
pnpm test:coverage
```

Write tests for:
- Service adapters (transcription, LLM)
- Utility functions
- Complex business logic
- Component logic (but not visual rendering)

### E2E Tests (Playwright)

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e -- --ui
```

Write E2E tests for:
- Critical user flows (recording, playback, export)
- Authentication flow
- Settings management

## Adding New Features

### Adding a Transcription Provider

1. Create `src/lib/transcription/newprovider.ts`
2. Implement the provider function following the existing pattern
3. Add to the switch statement in `src/lib/transcription/index.ts`
4. Update types in `src/hooks/use-settings.ts`
5. Add UI controls in `src/components/settings/transcription-settings.tsx`
6. Add validation in `src/app/api/validate-key/route.ts`
7. Write tests for the new provider

### Adding an LLM Provider

1. Create `src/lib/llm/newprovider.ts`
2. Implement enrichment function with all modes
3. Add to `src/lib/llm/index.ts`
4. Update types in settings
5. Add UI controls in settings
6. Add validation endpoint
7. Write tests

### Adding an Export Format

1. Add export function in `src/lib/export.ts`
2. Add UI button in `src/components/sessions/session-detail.tsx`
3. Handle edge cases (empty sessions, missing data)
4. Test with various session types

## Documentation

When adding features, update:
- **README.md** - User-facing documentation
- **CLAUDE.md** - AI development context (architecture, patterns)
- **Inline comments** - Complex logic that isn't self-explanatory
- **JSDoc/RustDoc** - Public APIs and exported functions

## Review Process

1. **Automated checks** run on every PR (lint, test, typecheck)
2. **Maintainer review** - At least one maintainer must approve
3. **Address feedback** - Make requested changes and re-request review
4. **Merge** - Maintainer will merge when approved and checks pass

## Getting Help

- **Questions?** Open a [Discussion](https://github.com/odonald/everlast/discussions)
- **Stuck?** Comment on your PR or issue
- **Found a bug?** Open an [Issue](https://github.com/odonald/everlast/issues)

## Recognition

Contributors are recognized in:
- GitHub's automatic contributors list
- Release notes (for significant contributions)
- README acknowledgments section

Thank you for contributing to Everlast AI Recorder!
