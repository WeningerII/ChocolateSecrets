# ChocolateSecrets — memory vault

This folder is the project's **declarative memory**: decisions, architecture
notes, domain knowledge, a glossary, and session logs. It is designed to be
opened as an **[Obsidian](https://obsidian.md)** vault, but every file is plain
Markdown you can read anywhere.

## Open it in Obsidian
1. Obsidian → **Open folder as vault** → select this `memory/` folder.
2. Trust the folder when prompted (it ships a preconfigured `.obsidian/` with
   wikilink-only linking, a Templates folder, and color-coded Graph View groups).
3. Open **Graph View** (Ctrl/Cmd-G) to see the decision/domain web. Color groups:
   decisions, architecture, domains, glossary, and logs.

> The Obsidian graph shows **human** memory (this vault). The **code** graph is
> separate — it's Graphify's `../graphify-out/graph.html` / `GRAPH_REPORT.md`.

## Layout
| Folder | What lives here |
|--------|-----------------|
| `architecture/` | System maps / MOCs — the structural narrative |
| `decisions/` | One note per lasting decision (ADR-style: context → decision → consequences) |
| `domains/` | One note per product/domain area (recipes, inventory, food-safety, …) |
| `glossary/` | One atomic note per domain term |
| `permanent/` | Consolidated atomic concept notes (Zettelkasten) |
| `logs/` | Session logs written by `/save` (`YYYY-MM-DD-<slug>.md`) |
| `inbox/` · `fleeting/` | Raw capture / scratch, to be processed later |
| `templates/` | Note templates (used by the Templates plugin) |

## Conventions
See `CLAUDE.md` in this folder (the vault rules). In short: YAML frontmatter on
every note, kebab-case filenames, one idea per note, and **≥2 `[[wikilinks]]`**
per note.

## How Claude Code uses this vault
`/resume` reads recent logs + decisions to reload context; `/remember` files a new
decision/insight here; `/save` writes a session log and commits. See the repo-root
`CLAUDE.md` for the full protocol.
