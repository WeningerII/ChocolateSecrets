---
description: Query or refresh the ChocolateSecrets code knowledge graph (Graphify).
---

Use the Graphify code graph — do **not** grep the whole codebase, and do **not**
open `graphify-out/graph.json` with Read.

- **If `$ARGUMENTS` is a question:** answer it from the graph. Prefer the
  `graphify` MCP tools (`query_graph`, `god_nodes`, `get_neighbors`, `get_node`,
  `shortest_path`, `get_community`, `graph_stats`); or CLI
  `graphify query "$ARGUMENTS"` / `graphify explain "<Node>"` /
  `graphify path "<A>" "<B>"`. Cite node names and files.
- **If `$ARGUMENTS` is "update" / "rebuild" (or empty and code changed):** run
  `graphify update .` (incremental, 0 tokens), then re-read
  `graphify-out/GRAPH_REPORT.md` and summarize what changed.

The graph is committed at `graphify-out/`; never hand-edit it.
