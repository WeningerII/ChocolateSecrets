---
description: Persist this session to the ChocolateSecrets memory vault and commit.
---

Persist what we did this session into the `memory/` Obsidian vault. Keep notes
atomic and densely linked (≥2 `[[wikilinks]]` each).

1. **Session log** — create `memory/logs/YYYY-MM-DD-<kebab-summary>.md` from
   `memory/templates/session-log.md`. Fill in: what was done, decisions made (with
   rationale), files touched, open/pending items, next steps. Use `[[wikilinks]]`
   to related notes; add tags. (Use today's date — do not guess.)
2. **Durable decisions** — if a lasting decision was made, add/update an entry in
   `memory/decisions/` (one file per decision) and/or a concept note in
   `memory/permanent/`. Link it from the session log.
3. **Domain updates** — update any affected `memory/domains/*` note.
4. **Graph** — only if code *structure* changed (new/moved modules), run
   `graphify update .` to refresh `graphify-out/`.
5. **Commit** — `git add -A && git commit -m "memory: <summary>"`. Do **not** push
   unless asked.

`$ARGUMENTS` may provide the summary/focus for the log filename and title.
