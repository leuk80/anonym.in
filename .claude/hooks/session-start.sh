#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Placeholder: add dependency installation here once a tech stack is chosen.
# Examples:
#   npm install          (Node.js)
#   pip install -e .     (Python)
#   bundle install       (Ruby)
#   cargo build          (Rust)

echo "Session start hook: no dependencies to install yet."
