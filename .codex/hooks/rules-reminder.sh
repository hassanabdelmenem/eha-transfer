#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): after changes to rules or the queries they gate, remind Claude to run the rules tests.
path=$(jq -r '.tool_input.file_path // empty')
case "${path#"$CLAUDE_PROJECT_DIR"/}" in
  firestore.rules|src/contexts/DataContext.tsx)
    jq -n '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"firestore.rules list rules and the query shapes in src/contexts/DataContext.tsx are coupled (a rejected listener dies permanently). Before finishing, run: npm run test:rules"}}' ;;
esac
exit 0
