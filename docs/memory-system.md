# Memory system — Graphify + Obsidian + Claude Code

This repo ships a **persistent, two-layer memory system** so Claude Code (and you)
start every session already knowing the project — without re-reading the codebase.

- **Structural memory (the map of the code):** [Graphify](https://github.com/safishamsi/graphify)
  builds a knowledge graph of the source into `graphify-out/`. Claude *queries* it
  instead of grepping/re-reading files.
- **Declarative memory (the story of the project):** an [Obsidian](https://obsidian.md)
  vault at `memory/` holds decisions, architecture notes, domain knowledge, a
  glossary, and per-session logs.

The operating protocol Claude follows lives in the repo-root **`CLAUDE.md`**.

---

## TL;DR

```bash
# one-time, local:
bash scripts/setup-memory.sh          # installs graphify (if needed) + builds/refreshes the graph
# then open Obsidian → "Open folder as vault" → ./memory

# in Claude Code:
/resume          # load memory + summarize state at the start of a session
/save            # write a session log + decisions and commit at the end
/remember <x>    # capture a decision/insight as an atomic vault note
/map <question>  # query (or `/map update` to rebuild) the code graph
```

---

## What's in the repo

| Path | What it is | Committed? |
|------|-----------|:---:|
| `CLAUDE.md` | The memory protocol + 3-layer Context Navigation rule | ✅ |
| `.claude/skills/graphify/` | The Graphify skill (`/graphify`), vendored v0.9.8 | ✅ |
| `.claude/commands/` | `/resume` `/save` `/remember` `/map` | ✅ |
| `.claude/settings.json` | Permissions + a SessionStart memory pointer hook | ✅ |
| `.mcp.json` | The `graphify` MCP server (zero-install via `uvx`) | ✅ |
| `.graphifyignore` | Keeps the graph **code-only** (no docs/locales/lockfiles) | ✅ |
| `graphify-out/graph.json` | The queryable code graph (~2 MB) | ✅ |
| `graphify-out/GRAPH_REPORT.md` | God nodes, communities, metrics | ✅ |
| `graphify-out/` (rest: `cache/`, `graph.html`, sidecars) | Regenerable | ❌ gitignored |
| `memory/` | The Obsidian vault (decisions, domains, glossary, logs) | ✅ |
| `scripts/setup-memory.sh` | Idempotent bootstrap/refresh | ✅ |
| `scripts/memory-session-start.sh` | The SessionStart hook body | ✅ |

---

## The two layers

### 1. Graphify — the code graph

Graphify parses source with Tree-sitter (AST) into a NetworkX graph, detects
communities, and ranks "god nodes" (most-connected abstractions). Building the
**code** graph is **100% local AST — 0 LLM tokens, no API key**.

This repo's graph (built from the initial commit): **1767 nodes · 4801 edges · 97
communities**. Top god nodes: `Ingredient`, `Recipe`, `useToast`, `Composition`,
`db`, `ResolvedIngredient`, `useData`, `RecipePhysics`, `handleFirestoreError`,
`useRecipePhysics`.

**Query it (don't read `graph.json` — it's ~2 MB and blocked from the Read tool):**

```bash
graphify query "how does bill extraction reach Firestore?"
graphify explain "useRecipePhysics"
graphify path "extractBill" "recordPayment"
graphify update .        # incremental rebuild after code changes (0 tokens)
```

Inside Claude Code the same is available through the `/graphify` skill and the
`graphify` MCP server (tools: `query_graph`, `god_nodes`, `get_node`,
`get_neighbors`, `shortest_path`, `get_community`, `graph_stats`).

**Scope.** `.graphifyignore` deliberately excludes markdown/docs, `src/locales/`
(i18n data), and lockfiles so extraction is deterministic and key-free. Prose
belongs in the vault, not the code graph. To *also* fold docs into the graph, set
an LLM key (e.g. `ANTHROPIC_API_KEY`), remove the doc-extension lines from
`.graphifyignore`, and re-run `graphify extract .` (this costs tokens).

**Community names** are placeholders (`Community N`) because naming them needs an
LLM. To name them: `graphify label .` with an API key set.

### 2. Obsidian vault — declarative memory

Open `memory/` as an Obsidian vault (**Open folder as vault**). It ships a
preconfigured `.obsidian/` (wikilink-only linking, a Templates folder, color-coded
Graph View groups for decisions/architecture/domains/glossary/logs).

Structure and conventions are documented in `memory/README.md` and
`memory/CLAUDE.md`. In short: YAML frontmatter on every note, kebab-case
filenames, one idea per note, **≥2 `[[wikilinks]]`** per note.

Recommended (optional) community plugins — install from Obsidian's Community
Plugins browser: **Calendar** (daily-note nav), **Folders to Graph**, and (via
**BRAT**) **3D Graph**. None are required.

---

## Runbook (local, after pulling this branch)

1. `git checkout claude/graphify-obsidian-claude-setup-7c6bxh`
2. `bash scripts/setup-memory.sh` — installs Graphify if needed and builds/refreshes
   the graph. Safe to re-run.
3. **Obsidian:** *Open folder as vault* → `memory/`. Open Graph View (Ctrl/Cmd-G).
   If it looks empty, disable the "Orphans"/"Existing files only" filters and reopen.
4. **Claude Code:** run `/resume` to confirm memory loads.
5. *(Optional, for the bare CLI in a terminal):* `uv tool install graphifyy && uv tool update-shell`
   (or `pipx install graphifyy`), then `graphify query "…"`.
6. *(Optional, MCP)* The committed `.mcp.json` launches the server via `uvx` (needs
   [uv](https://docs.astral.sh/uv/)); **restart Claude Code** so it picks up the
   server, approve it, and the `graphify` tools appear. No manual install needed.

### Everyday loop
- `/resume` at the start → work → `/remember` decisions as you go → `/save` at the end.
- After structural code changes: `graphify update .` (0 tokens), then commit.
- Optional automatic rebuild on commit: `graphify hook install` (adds git hooks).

---

## What runs where (headless vs local)

| Step | This ephemeral container | Your machine |
|------|:---:|:---:|
| Vendored skill, `.mcp.json`, vault markdown, protocol | ✅ authored & committed | — |
| `graphify extract/update` (AST, 0 tokens) | ✅ (graph committed) | ✅ to refresh |
| Obsidian desktop app | ❌ (no display) | ✅ open `memory/` |
| Graphify MCP server | ✅ verified here | ✅ via `uvx`/install |

Obsidian and the interactive MCP server are desktop/local concerns; everything
committed here is the portable deliverable.

---

## Maintenance & troubleshooting

- **Graph looks stale?** `GRAPH_REPORT.md` records the build commit; the
  SessionStart hook warns when it differs from `HEAD`. Run `graphify update .`.
- **`graphify: command not found`** after install → `uv tool update-shell`
  (or `pipx ensurepath`) and reopen your shell.
- **`unknown command '.'`** → the bare CLI needs a subcommand: use `graphify update .`
  / `graphify extract .`. The flag-rich `.`-form only works as the `/graphify` skill.
- **MCP tools don't appear** → ensure `uv` is installed, `.mcp.json` is present, and
  you **restarted** Claude Code and approved the server.
- **Never hand-edit `graphify-out/`** — it's generated. Edit source, then rebuild.

## Credits
- [Graphify](https://github.com/safishamsi/graphify) (MIT) — code knowledge graphs.
- [Obsidian](https://obsidian.md) — the vault / second brain.
- Pattern inspired by the community "Claude Code + Obsidian + Graphify" setup
  (lucasrosati/claude-code-memory-setup).
