#!/usr/bin/env bash
# Stop: refuse to end the turn while the TypeScript typecheck fails.
jq -e '.stop_hook_active == true' >/dev/null 2>&1 && exit 0   # already retried once; don't loop
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(npm run -s lint 2>&1); then
  echo "Typecheck failed (npm run lint). Fix these before finishing:" >&2
  echo "$out" | head -30 >&2
  exit 2
fi
exit 0
