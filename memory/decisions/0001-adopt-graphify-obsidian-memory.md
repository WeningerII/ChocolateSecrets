---
title: ADR-0001 — Adopt Graphify + Obsidian + Claude Code memory
tags: [chocolatesecrets, decision, meta]
created: 2026-07-07
updated: 2026-07-07
status: active
type: decision
---

# ADR-0001 — Adopt Graphify + Obsidian + Claude Code memory

## Context
Claude Code starts each session with no memory and re-reads files to orient
itself, which is slow and token-hungry. We want persistent, structured memory:
a durable record of *decisions* and a queryable map of *code structure*.

## Decision
Adopt a two-layer memory system (see repo-root `CLAUDE.md`):
1. **Graphify** builds a code knowledge graph into `graphify-out/` (AST-only, 0
   tokens, no API key). Queried via the `graphify` MCP server / CLI instead of
   re-reading source. See [[god-node]].
2. **This Obsidian vault** (`memory/`) holds declarative memory — decisions,
   architecture, domain notes, glossary, and session logs.

`.graphifyignore` keeps the code graph **code-only** (docs, `src/locales/`, and
lockfiles excluded) so extraction stays deterministic and key-free; prose lives
here in the vault. `graph.json` + `GRAPH_REPORT.md` are committed; the rest of
`graphify-out/` is regenerable and gitignored.

## Alternatives considered
- **Global `~/vault`** (the canonical single-vault pattern) — richer cross-project
  links, but a headless/CI clone can't own a home-dir vault and the memory
  wouldn't travel with the repo. Chose an **in-repo `memory/`** vault instead.
- **Graphiti / MegaMem temporal graph (Neo4j/FalkorDB)** — heavier, needs a running
  DB + LLM cost + a desktop GUI; not headless-friendly. Rejected for now.

## Consequences
- Fresh clones get memory immediately (graph + vault are committed).
- Trade-off: no cross-project links (mitigate by adding `memory/` to a global
  Obsidian later). `graph.json` (~2 MB) adds some repo weight and needs
  `graphify update .` after structural changes.
- Reported token savings are vendor marketing; our local benchmark on this repo is
  ~3.8× average (some queries far higher). The 0-token AST build is verified.

## Related
- [[system-overview]] · [[god-node]] · [[moc]]
- Runbook: `docs/memory-system.md`
