# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of EverlastAI recording app seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via GitHub's private vulnerability reporting:

1. Go to the [Security Advisories](https://github.com/odonald/EverlastAI/security/advisories) page
2. Click "New draft security advisory"
3. Fill in the details of the vulnerability

Alternatively, you can email us at **hello@zynderlab.com**.

### What to Include

Please include the following information:

- Type of vulnerability (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how it might be exploited

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 90 days (depending on complexity)

### Safe Harbor

We support safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services
- Only interact with accounts you own or with explicit permission of the account holder
- Do not exploit a security issue for purposes other than verification
- Report vulnerabilities promptly and do not disclose publicly until resolved

## Security Features

EverlastAI implements several security measures:

### Data Protection

- **Encrypted Storage**: API keys are encrypted using ChaCha20Poly1305 with Argon2 key derivation
- **Per-User Encryption**: Each user has unique encryption keys derived from their identity
- **Local-First**: All data stays on your device unless you explicitly export it

### Authentication

- **Auth0 PKCE Flow**: Secure authentication without exposing secrets
- **External Browser Auth**: Passkeys and biometrics work properly via system browser

### API Security

- **No Key Storage in Code**: API keys are stored encrypted in the OS keychain
- **Minimal Permissions**: App requests only necessary system permissions

## Best Practices for Users

1. **Keep your app updated** to receive security patches
2. **Use strong, unique API keys** for each service
3. **Review app permissions** regularly in System Preferences
4. **Back up your data** before major updates
5. **Report suspicious behavior** immediately

## Acknowledgments

We thank security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in release notes (unless they prefer anonymity).
