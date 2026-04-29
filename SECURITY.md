# Security Policy

## Supported Versions

Security fixes are applied to the latest release only. We do not backport fixes
to older versions.

| Version        | Supported          |
| -------------- | ------------------ |
| Latest beta    | :white_check_mark: |
| Older releases | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,**
**pull requests, or discussions.**

Report security vulnerabilities privately via one of the following methods:

1. **Email**: Send details to **dsbroomeco@gmail.com** with the subject line
   `[SECURITY] <brief description>`. Encrypt your message with our public key
   if the disclosure contains sensitive details (key available on request).

2. **GitHub Private Advisory**: Use
   [GitHub's private vulnerability reporting](https://github.com/dsbroomeco/app-db-assistant/security/advisories/new)
   to submit a draft security advisory directly to the maintainers.

### What to include

To help us triage and reproduce the issue quickly, please provide:

- A description of the vulnerability and its potential impact
- The affected component (e.g., SQL driver, IPC layer, credential store, renderer)
- Steps to reproduce or a proof-of-concept (if available)
- Your suggested severity (Critical / High / Medium / Low)
- Whether you would like to be credited in the advisory

## Response Timeline

| Milestone                        | Target          |
| -------------------------------- | --------------- |
| Acknowledgement of report        | Within 48 hours |
| Initial triage and severity      | Within 5 days   |
| Fix or mitigation landed         | Within 30 days for Critical/High; best-effort for lower |
| Public advisory published        | After fix is released |

We will keep you informed of progress throughout. If you do not receive an
acknowledgement within 48 hours, please follow up to ensure your message was
received.

## Scope

The following are **in scope** for this policy:

- SQL injection or parameterization bypass in any database driver
- Credential exposure (plaintext storage, IPC leakage, log exposure)
- Electron security misconfigurations (contextIsolation, sandbox, nodeIntegration)
- Path traversal or arbitrary file write via SQLite file paths or export targets
- XSS in rendered database content or error messages
- Open redirect or SSRF via `shell.openExternal()` or untrusted URLs
- Authentication or encryption bypass in SSH tunnel handling
- Dependency vulnerabilities with a direct exploit path in the packaged app

The following are **out of scope**:

- Vulnerabilities in databases the user has connected to (those are the user's own systems)
- Denial of service by a locally authenticated user
- Social engineering of maintainers or users
- Issues requiring physical access to the user's machine
- Theoretical vulnerabilities without a realistic attack path

## Disclosure Policy

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
Once a fix is available we will publish a GitHub Security Advisory crediting
the reporter (unless anonymity is requested) and release a patched version.

## Contact

For non-security questions, please open a [GitHub Discussion](https://github.com/dsbroomeco/app-db-assistant/discussions)
or a [GitHub Issue](https://github.com/dsbroomeco/app-db-assistant/issues).
