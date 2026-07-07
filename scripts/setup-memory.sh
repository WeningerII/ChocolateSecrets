#!/usr/bin/env bash
# scripts/setup-memory.sh
# Provision / refresh the ChocolateSecrets memory system:
#   • ensure the Graphify CLI is available (uv tool / pipx / pip --user)
#   • build or incrementally refresh the code knowledge graph (AST-only, 0 tokens)
#   • print the local runbook (Obsidian + MCP)
#
# Idempotent and safe to re-run. Never hard-fails the shell on a missing tool —
# it degrades to instructions. The graph build is code-only (see .graphifyignore)
# so it needs no LLM API key.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say()  { printf '\033[1;36m[memory]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[memory]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[memory]\033[0m %s\n' "$*"; }

GRAPHIFY=""
resolve_graphify() {
  if command -v graphify >/dev/null 2>&1; then GRAPHIFY="graphify"; return 0; fi
  # Zero-install fallback: run straight from PyPI via uvx (needs uv).
  if command -v uvx >/dev/null 2>&1; then GRAPHIFY="uvx --from graphifyy graphify"; return 0; fi
  return 1
}

# 1. Ensure the vault skeleton exists (in case of a partial checkout) ----------
say "Ensuring memory/ vault skeleton"
mkdir -p memory/{architecture,decisions,domains,glossary,permanent,logs,inbox,fleeting,templates}
for d in permanent inbox fleeting; do [ -e "memory/$d/.gitkeep" ] || : > "memory/$d/.gitkeep"; done

# 2. Try to make the Graphify CLI available ------------------------------------
if ! resolve_graphify; then
  say "Graphify CLI not found — attempting install"
  if command -v uv >/dev/null 2>&1; then
    uv tool install graphifyy && uv tool update-shell || true
  elif command -v pipx >/dev/null 2>&1; then
    pipx install graphifyy || true
  elif command -v pip3 >/dev/null 2>&1; then
    pip3 install --user graphifyy || true
  fi
  resolve_graphify || true
fi

if [ -n "$GRAPHIFY" ]; then
  ok "Using graphify: $GRAPHIFY"
else
  warn "Could not resolve a graphify command. Install one of:"
  warn "    uv tool install graphifyy      # recommended (https://docs.astral.sh/uv/)"
  warn "    pipx install graphifyy"
  warn "    pip3 install --user graphifyy"
  warn "The /graphify skill (.claude/skills/graphify) still works inside Claude Code."
fi

# 3. Build or refresh the code graph (AST-only, code-only, 0 tokens) -----------
if [ -n "$GRAPHIFY" ]; then
  if [ -f graphify-out/graph.json ]; then
    say "Refreshing existing graph incrementally (0 tokens)"
    $GRAPHIFY update . || warn "graphify update failed; keeping existing graph.json"
  else
    say "Building initial code graph (AST-only, no API key)"
    if $GRAPHIFY extract . ; then
      $GRAPHIFY cluster-only . --no-label || warn "cluster/report step failed (graph.json still built)"
    else
      warn "graphify extract failed — check that .graphifyignore keeps the corpus code-only"
    fi
  fi
  [ -f graphify-out/GRAPH_REPORT.md ] && ok "Graph ready: $(head -1 graphify-out/GRAPH_REPORT.md)"
else
  if [ -f graphify-out/graph.json ]; then
    ok "Prebuilt graph present ($(wc -c < graphify-out/graph.json) bytes) — reused as committed"
  else
    warn "No graph and no CLI. Inside Claude Code, run:  /graphify ."
  fi
fi

# 4. MCP readiness note --------------------------------------------------------
if command -v uvx >/dev/null 2>&1; then
  ok "MCP server ready via .mcp.json (uvx will fetch graphifyy[mcp] on demand)."
else
  warn "For the 'graphify' MCP server, install uv (recommended) or run:"
  warn "    pip3 install --user 'graphifyy[mcp]'   # then adjust .mcp.json to call graphify-mcp"
fi

# 5. Runbook -------------------------------------------------------------------
cat <<'EOF'

──────────────────────────────────────────────────────────────────────────────
 Memory system is set up. Next steps (local, one-time):
 1. Open Obsidian → "Open folder as vault" → select ./memory
 2. In Claude Code:  /resume  (load context)   ·   /save  (persist a session)
 3. Structure questions:  graphify query "how does bill extraction reach Firestore?"
    (or use the 'graphify' MCP tools) — do NOT grep the whole tree.
 4. After structural code changes:  graphify update .   (0 tokens) then commit.

 Full runbook: docs/memory-system.md
──────────────────────────────────────────────────────────────────────────────
EOF
