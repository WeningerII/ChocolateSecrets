# Vault rules (memory/)

This folder is the ChocolateSecrets **declarative memory**. Structural/code
questions belong to the Graphify graph (`../graphify-out/`), **not** here — this
vault holds *why*, not *what-calls-what*.

## Rules
- **Frontmatter mandatory** on every note: `title, tags, created, updated, status, type`.
- **Filenames kebab-case**: `recipe-costing-model.md`, not `Recipe Costing.md`.
- **Internal links are `[[wikilinks]]`**, never markdown links. **≥2 per note.**
- **One concept per note** (atomicity). Split when a note grows two ideas.
- **Never delete** a note without asking; mark it `status: superseded` instead.
- Put raw/unsorted capture in `inbox/`; promote to `permanent/`, `decisions/`,
  `domains/`, or `glossary/` once refined.

## Where things go
- A lasting design choice → `decisions/` (use `templates/decision.md`).
- A product/domain area → `domains/` (use `templates/domain-note.md`).
- A term to define → `glossary/` (use `templates/glossary.md`).
- A reusable concept → `permanent/` (use `templates/default-note.md`).
- A session record → `logs/` (use `templates/session-log.md`, written by `/save`).

## Tags
Every note carries `chocolatesecrets` plus a type tag (`decision`, `architecture`,
`domain`, `glossary`, `log`, `permanent`) — these drive the Graph View colors.
