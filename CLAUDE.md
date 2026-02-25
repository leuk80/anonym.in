# CLAUDE.md — anonym.in

## Project Overview

**anonym.in** is a Compliance-Hotline SaaS platform. It allows organisations to receive anonymous reports from employees or third parties in a legally-compliant way.

## Repository Structure

```
anonym.in/
├── README.md
├── CLAUDE.md          # This file – guidance for Claude Code
└── .claude/
    ├── settings.json  # Claude Code hook configuration
    └── hooks/
        └── session-start.sh  # SessionStart hook (installs dependencies)
```

_The tech stack and directory layout will grow here as the project is built out._

## Development Setup

> No dependencies are required yet. Update this section and `.claude/hooks/session-start.sh` once a tech stack is chosen.

## Common Commands

| Purpose | Command |
|---------|---------|
| (none yet) | — |

_Add linting, testing, and build commands here once they are established._

## Coding Guidelines

- Keep secrets out of the repository (use environment variables or a secrets manager).
- Write tests alongside new features.
- Follow the principle of least privilege for all user-facing roles and API keys.
- All user-submitted data must be treated as untrusted; validate at every system boundary.

## Git Workflow

- Default branch: `main`
- Feature branches: `<topic>/<short-description>`
- Claude Code development branches: `claude/<description>-<session-id>`
- Open a pull request for every change; do not push directly to `main`.

## Session Start Hook

A SessionStart hook is registered in `.claude/settings.json`. It runs `.claude/hooks/session-start.sh` at the beginning of every remote Claude Code on the web session to ensure dependencies are installed.

When a tech stack is added:
1. Add the install command(s) to `.claude/hooks/session-start.sh`.
2. Document the linter and test commands in the **Common Commands** table above.
