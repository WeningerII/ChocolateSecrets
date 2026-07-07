---
description: Load ChocolateSecrets persistent memory and summarize state before working.
---

Load this project's persistent memory, then give a tight situational summary.
Do NOT broadly re-read source — use the memory layers.

1. **Recent history** — read the 3 most recent files in `memory/logs/` (by
   filename date).
2. **Decisions & architecture** — read `memory/architecture/system-overview.md`,
   skim `memory/decisions/`, and any `memory/domains/*` note relevant to
   `$ARGUMENTS` (if given).
3. **Graph freshness** — run `git rev-parse --short HEAD` and compare to the
   "Built from commit" line in `graphify-out/GRAPH_REPORT.md`. If they differ and
   structure changed, note the graph is stale (offer `graphify update .`).
4. **Structure questions** — use the `graphify` MCP tools (`graph_stats`,
   `god_nodes`, `query_graph`) or `graphify query "…"`; never grep the tree and
   never open `graphify-out/graph.json` with Read.

Then output ≤12 lines: where we left off, key open decisions, what's in progress,
and the top 2–3 next actions. Name which memory notes you loaded.
