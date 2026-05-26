# Security Policy

## Reporting a Vulnerability

ARGUS is an AI agent security gateway. If you discover a security vulnerability,
please do **not** open a public issue.

Instead, send a private report to:

- **Email**: [tanishrajput9@gmail.com](mailto:tanishrajput9@gmail.com)
- **GitHub**: Use the [Security Advisories](https://github.com/tanishra/argus/security/advisories) tab

You should receive a response within 48 hours. If you don't, please follow up.

## What to Include

- Type of vulnerability (e.g., SQL injection, authentication bypass, etc.)
- Full steps to reproduce
- Proof of concept (if available)
- Impact assessment

## Scope

We currently accept reports for:

- The FastAPI backend (`src/`)
- The React dashboard (`argus-dashboard/`)
- Docker deployment configuration
- Lobster Trap integration

## Out of Scope

- Dependencies with known CVEs (report those upstream)
- Theoretical attacks requiring physical access

## Disclosure Policy

We follow a 90-day disclosure timeline: we will acknowledge, fix, and release
a patch before public disclosure.
