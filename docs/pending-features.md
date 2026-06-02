# Pending Features

These items reflect deferred operational logic or performance improvements:

- `src/utils/foodSafety.ts` / `recompute-all-cross-contact` — Currently, when a recipe is saved, its own cross-contact risks are recomputed dynamically. However, since cross-contact risks are structurally relational to a localized station tag mapping, OTHER recipes sharing that station boundary may now reflect previously undetected risks (the current recipe’s incoming allergens), but those localized instances are NOT automatically cross-updating downstream at this time. 

  **Fix:** Implement an admin button that forces a global map iteration recursively evaluating all recipes and regenerating `crossContactRisks`. Recommend running forcefully after substantial bulk-imports or substantial station structural mappings.

- **Exotic Milk Powders** — The engine currently seats liquid composition models for exotic milks (sheep, water buffalo, reindeer, and both camelid species). While dromedary camel milk powder is explicitly seeded with true composition, powdered variants for sheep, water buffalo, and reindeer are currently omitted due to a lack of published peer-reviewed values. If future bulk sourcing acquires these powders, create their ingredient records manually with data explicitly matching the supplier's Certificate of Analysis (CoA) or analysis sheet, as standard scaling multipliers do not accurate map spray/freeze-dried dairy solid accumulation.