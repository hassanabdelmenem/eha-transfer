#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit|NotebookEdit): block edits to secrets, PII exports, lockfiles and build output.
input=$(cat)
path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
[ -z "$path" ] && exit 0
rel=${path#"$CLAUDE_PROJECT_DIR"/}
base=$(basename "$rel")

case "$base" in
  .env.example) exit 0 ;;
  .env|.env.*)
    echo "Blocked: .env files hold secrets and must not be edited by Claude. Update .env.example instead." >&2
    exit 2 ;;
  package-lock.json)
    echo "Blocked: don't hand-edit $rel. Change package.json and run npm install." >&2
    exit 2 ;;
  auth.json|accounts*.json|*-accounts.json)
    echo "Blocked: $rel looks like an Auth export containing real user PII." >&2
    exit 2 ;;
esac
case "$rel" in
  dist/*|coverage/*)
    echo "Blocked: $rel is build output. Edit the source under src/ instead." >&2
    exit 2 ;;
esac
exit 0
