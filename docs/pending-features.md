# Pending Features

No deferred features are currently open. Resolved items are recorded below, with
any operational caveats that still apply.

## Resolved

- **Global cross-contact recompute** (2026-06-22) — saving a recipe only refreshed
  its own `crossContactRisks`, so sibling recipes sharing a station could hold
  stale risks. Added an admin action in **Restaurant Settings** that recomputes
  every recipe against the full catalog and writes back the changed ones. See
  `recomputeAllCrossContactRisks` (`src/utils/crossContactRecompute.ts`) and the
  pure planner `planCrossContactRecompute` (`src/utils/foodSafety.ts`). Run it after
  bulk imports or station re-mappings.

- **Non-bovine milk powders** (2026-06-22) — earlier notes claimed the engine
  already seated liquid models for exotic milks and a camel milk powder; in fact the
  composition snapshot carried none of them, so any recipe using these milks fell
  back to no composition. Added curated **liquid and whole-milk-powder** entries for
  goat, sheep, water buffalo, camel (dromedary), and reindeer to
  `USDA_FDC_SNAPSHOT` (`src/services/usdaFoodData.ts`); they resolve by name like any
  other ingredient (allergen detection already covers any "… milk" name).

  Liquid values come from dairy-science literature (FAO / Park & Haenlein). The
  powders are **derived**, not guessed: `dehydrate()` removes water to ~3% residual
  moisture, which preserves the fat/protein/lactose/ash mass fractions. The method is
  validated in `usdaFoodData.test.ts` by reproducing the published FDC cow
  whole-milk-powder entry from liquid cow milk.

  **Caveat:** these are reference values, not lot-specific. When bulk sourcing
  provides a supplier Certificate of Analysis, override the relevant snapshot entry
  (or the ingredient's stored `composition`) with the CoA figures — spray/freeze-dried
  solids can deviate from the literature mean, and reindeer milk in particular varies
  widely with lactation stage.
