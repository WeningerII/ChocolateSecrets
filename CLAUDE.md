# ChocolateSecrets — Claude Code guide & memory protocol

Production-management dashboard for a chocolate/confectionery kitchen: recipes &
costing, inventory, expenses, food safety, and a chocolate-formulation/texture
optimizer. **React 19 + Vite + TypeScript + Tailwind** SPA in `src/`, **Firebase**
(Auth, Firestore, Cloud Functions, Hosting), Node-20 functions in `functions/`,
and **Google Gemini** proxied server-side through Cloud Functions.

This repo has a **two-layer persistent memory system**. Use it *before* reading
raw source — that is the whole point of the setup.

---

## 🧠 Memory system — how to think about it

| Layer | Lives in | Answers | Access |
|-------|----------|---------|--------|
| **Structural** — how the code is wired | `graphify-out/` (Graphify code graph) | "what calls what", "where is X", "what depends on Y" | MCP server `graphify`, `graphify query …`, or `graphify-out/GRAPH_REPORT.md` |
| **Declarative** — what we decided & why | `memory/` (Obsidian vault) | "why did we do X", decisions, domain knowledge, progress | read/write markdown notes |

**Division of labor:** Graphify is the *map of the code* (rebuilt from source, 0
tokens). The `memory/` vault is the *story of the project* — decisions, rationale,
domain glossary, session logs — the things source code can't tell you.

### Context Navigation — the 3-layer query rule
Answer in this order; only descend when the layer above lacks the answer:

1. **Structure → the code graph.** Never grep/scan the tree for
   "what/where/how-connected". Query Graphify first:
   - MCP tools (preferred): `query_graph`, `god_nodes`, `get_node`,
     `get_neighbors`, `shortest_path`, `get_community`, `graph_stats`.
   - CLI: `graphify query "<question>"`, `graphify explain "<Node>"`,
     `graphify path "<A>" "<B>"`.
   - Overview: `graphify-out/GRAPH_REPORT.md` (god nodes + communities).
   - ⚠ Don't open `graphify-out/graph.json` with Read — it's ~2 MB and burns
     context (blocked in `.claude/settings.json`). **Query it, don't read it.**
2. **Why / decisions / domain → the vault.** Read `memory/decisions/`,
   `memory/architecture/`, `memory/domains/`, `memory/glossary/`.
3. **Raw source → only when editing** (or when layers 1–2 genuinely don't answer).

---

## Core abstractions (god nodes — most-connected in the graph)

| Symbol | Where | Role |
|--------|-------|------|
| `Ingredient`, `Recipe`, `Composition` | `src/types.ts` | Core domain models |
| `ResolvedIngredient` | `src/services/foodScience/universal/types.ts` | Ingredient resolved with food-science data |
| `RecipePhysics` / `useRecipePhysics()` | `src/hooks/useRecipePhysics.ts` | Texture/formulation physics engine |
| `useData()` | `src/contexts/DataContext.tsx` | App-wide Firestore data access |
| `useToast()` | `src/contexts/ToastContext.tsx` | UI notifications |
| `db`, `handleFirestoreError()` | `src/firebase.ts` | Firestore handle + error mapping |

Regenerate this list any time from `graphify-out/GRAPH_REPORT.md` → "God Nodes".

---

## Session protocol

**Start every session with `/resume`** — it loads recent logs + decisions and
summarizes state so you don't re-derive context.

**During work:** use the graph (layer 1) for structure, the vault (layer 2) for
rationale. When you make a durable decision, capture it with `/remember` so the
*next* session inherits it.

**End with `/save`** — writes a session log to `memory/logs/`, updates decisions,
and commits.

### Slash commands (`.claude/commands/`)
- `/resume [topic]` — load memory & summarize current state.
- `/save [summary]` — persist this session as a log + decisions, then commit.
- `/remember <insight>` — capture a decision/insight as an atomic vault note.
- `/map <question | update>` — query or refresh the code graph.

---

## Graphify (code knowledge graph)

- Committed artifacts: `graphify-out/graph.json` (queryable graph) and
  `graphify-out/GRAPH_REPORT.md` (god nodes, communities, metrics). Everything
  else in `graphify-out/` is regenerable and gitignored.
- **Rebuild after structural changes** (new/moved modules, big refactors):
  `graphify update .` — incremental, AST-only, **0 tokens, no API key**. The graph
  is persistent; do **not** rebuild every session.
- Freshness: `GRAPH_REPORT.md` records the build commit; compare with
  `git rev-parse HEAD`. The SessionStart hook warns when it's stale.
- The `/graphify` skill (`.claude/skills/graphify/`) documents the full toolset.
- **Never hand-edit files inside `graphify-out/`.**
- Scope: `.graphifyignore` keeps the graph **code-only** (docs, locales, and
  lockfiles excluded) so extraction stays key-free. Prose lives in `memory/`.

## Obsidian vault (`memory/`)

Full rules in `memory/CLAUDE.md`. In short:
- Open the `memory/` folder as an Obsidian vault ("Open folder as vault").
- Mandatory YAML frontmatter; kebab-case filenames; **one concept per note**;
  **≥2 `[[wikilinks]]`** per note (wikilinks, not markdown links).
- Folders: `architecture/` `decisions/` `domains/` `glossary/` `permanent/`
  `logs/` `inbox/` `fleeting/` `templates/`.
- Don't delete notes without asking; don't create notes without frontmatter.

---

## Project quick-reference

```bash
npm install            # also installs functions/ deps via postinstall
npm run dev            # Express + Vite dev server @ http://localhost:3000
npm run lint           # tsc --noEmit (also type-checks functions/src)
npm test               # vitest unit/logic tests
npm run check:schema   # schema-drift check
npm run build          # → dist/
```
Firestore-rules tests (`npm run test:rules`) and e2e (`npm run test:e2e`) need the
Firebase emulator / Playwright — see `docs/testing.md`.

**Layout:** `src/` React app · `functions/src/` Cloud Functions (AI proxy,
Firestore triggers, payments, shopping-list email/SMS) · `scripts/` maintenance &
migration · `firestore.rules` default-deny role-based rules · `server.ts` dev
server only (Express + Vite middleware).

**Guardrails**
- Gemini runs **server-side only** (`functions/src/geminiGenerate.ts`); never add a
  `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` to the web build.
- Firestore is default-deny; changes to `firestore.rules` must keep rules tests green.
- UI strings are localized (i18next); avoid hardcoded strings (check scripts exist).

## Do / Don't (memory)
- ✅ Query the graph and read the vault before reading source broadly.
- ✅ Record decisions as you make them (`/remember`); `/save` before ending.
- ✅ `graphify update .` after structural changes, then commit.
- ❌ Don't re-read the whole codebase when the graph/vault already answers.
- ❌ Don't hand-edit `graphify-out/`. Don't skip frontmatter or use markdown links
  inside the vault.

> New here? Read `docs/memory-system.md` for the full runbook (what's committed vs.
> run locally, Obsidian setup, MCP server, maintenance).
