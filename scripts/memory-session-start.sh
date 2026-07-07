#!/usr/bin/env bash
# SessionStart hook — surface the persistent-memory entrypoint at the top of a
# Claude Code session. This is a *cheap pointer*, not a full context dump: it
# nudges Claude to load memory via /resume rather than re-reading the codebase.
#
# Hard rule: this hook must NEVER fail a session. Every step is guarded and the
# script always exits 0. If the memory system isn't set up yet, it stays silent.

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root" 2>/dev/null || exit 0

# Nothing to say until the vault exists.
[ -d memory ] || exit 0

echo "🧠 Persistent memory is available for this repo (see CLAUDE.md → Memory System)."
echo "   • Declarative memory (decisions, progress, domain notes): memory/  — an Obsidian vault."
echo "   • Structural memory (code knowledge graph): graphify-out/  — MCP server 'graphify' + GRAPH_REPORT.md."

# Warn only when real app code drifted since the graph was built — not on
# docs/vault/config commits (those are excluded from the code graph anyway).
if [ -f graphify-out/GRAPH_REPORT.md ]; then
  built="$(grep -m1 'Built from commit' graphify-out/GRAPH_REPORT.md 2>/dev/null | grep -oE '[0-9a-f]{7,40}' | head -n1)"
  if [ -n "$built" ] && git rev-parse --verify --quiet "${built}^{commit}" >/dev/null 2>&1; then
    code_changed="$(git diff --name-only "$built"..HEAD 2>/dev/null \
      | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' \
      | grep -Ev '^(memory/|graphify-out/|src/locales/)' | head -n1)"
    if [ -n "$code_changed" ]; then
      echo "   ⚠ Code changed since the graph was built (${built:0:8}) — run 'graphify update .' to refresh it."
    fi
  fi
fi

# Point at the most recent session log.
if ls memory/logs/*.md >/dev/null 2>&1; then
  latest="$(ls -1 memory/logs/*.md 2>/dev/null | sort | tail -n1)"
  [ -n "$latest" ] && echo "   • Most recent session log: ${latest#"$root"/}"
fi

echo "   → Run /resume to load context before starting; run /save to persist it when you finish."
exit 0
