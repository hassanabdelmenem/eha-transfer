#!/usr/bin/env bash
# PreToolUse (mcp__firebase__firestore_query_collection): Firestore holds real patient
# data, so the Firebase MCP may query only the local emulator, never production.
if jq -e '.tool_input.use_emulator == true' >/dev/null; then exit 0; fi
echo "Blocked: Firestore queries through the Firebase MCP must set use_emulator: true. Start the emulator with 'npx firebase emulators:start --only firestore' if it isn't running." >&2
exit 2
