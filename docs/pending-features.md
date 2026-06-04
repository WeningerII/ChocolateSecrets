# Pending Features

These items reflect deferred operational logic or performance improvements:

- **Exotic Milk Powders** — The engine currently seats liquid composition models for exotic milks (sheep, water buffalo, reindeer, and both camelid species). While dromedary camel milk powder is explicitly seeded with true composition, powdered variants for sheep, water buffalo, and reindeer are currently omitted due to a lack of published peer-reviewed values. If future bulk sourcing acquires these powders, create their ingredient records manually with data explicitly matching the supplier's Certificate of Analysis (CoA) or analysis sheet, as standard scaling multipliers do not accurate map spray/freeze-dried dairy solid accumulation.

## Shipped

- **Global cross-contact recompute** — Admin action in **Restaurant Settings → Data Migration** (`recomputeAllCrossContacts`, wired in `RestaurantSettings.tsx`) that re-evaluates every recipe against the current station/allergen graph and rewrites only the recipes whose `crossContactRisks` actually changed. Run after substantial bulk imports or station remapping, when sibling recipes sharing a station may hold stale risks.
