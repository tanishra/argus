# Contributing to ARGUS

Thank you for your interest in ARGUS! This document outlines the process for
contributing to the project.

## Code of Conduct

Be respectful, constructive, and professional. We're building security tooling
for AI agents — the stakes are high, and collaboration matters.

## How to Contribute

### 1. Reporting Bugs

Open a [GitHub issue](https://github.com/tanishra/argus/issues/new) with:

- A clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, browser)

### 2. Suggesting Features

Open a [GitHub issue](https://github.com/tanishra/argus/issues/new) with:

- The problem you're solving
- Proposed solution
- Alternative approaches considered

### 3. Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run tests:
   - Backend: `uv run python -m pytest tests/ -v`
   - SDK: `ARGUS_LOCAL_MODE=true uv run python -m pytest argus-sdk/tests/ -v`
5. Run lint: `ruff check src/ argus-sdk/src/`
6. Commit with a clear message
7. Push and open a PR against `main`

### PR Guidelines

- One feature/fix per PR
- Update tests for any behavior changes
- Update CHANGELOG.md with your change
- Keep the diff focused — avoid unrelated changes
- Reference the related issue number

## Development Setup

```bash
# Clone
git clone https://github.com/tanishra/argus.git
cd argus

# Initialize submodules (Lobster Trap)
git submodule update --init --recursive

# Backend
uv sync --dev
cp .env.example .env
# Add GEMINI_API_KEY to .env
uv run uvicorn src.main:app --reload --port 8000

# SDK (editable install for local development)
uv pip install -e ./argus-sdk

# Frontend
cd argus-dashboard
pnpm install
pnpm dev
```

## Project Structure

```
src/                    # FastAPI backend
  intent_engine/        # Layer 1: Gemini Flash extraction
  lobster_proxy/        # Layer 2: Policy enforcement
  explanation_engine/   # Layer 3: Gemini Pro analysis
  human_gate/           # Layer 4: Review queue
  demo/                 # Demo scenarios
tests/                  # Backend tests
argus-sdk/              # Python SDK (pip-published as argus-shield)
  src/argus/            # SDK source
  tests/                # SDK tests
argus-dashboard/        # React + Vite frontend
```

## Testing

- All tests must pass before merging
- Write tests for new features
- Run backend tests: `uv run python -m pytest tests/ -v`
- Run SDK tests (offline, no backend needed): `ARGUS_LOCAL_MODE=true uv run python -m pytest argus-sdk/tests/ -v`
- CI (GitHub Actions) runs both suites automatically on every PR

## Code Style

- Python: follow `ruff` lint rules
- TypeScript: follow project ESLint config
- Use descriptive variable names
- Keep functions focused and small
