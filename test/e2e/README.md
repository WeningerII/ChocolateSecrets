# E2E tests

Requires: Node, Chrome (installed by `npx playwright install`), a Firebase project.

These tests run against a real Firebase project. They MUST NOT run against 
production. Before running, set the app's .env.local to point at a staging 
Firebase project with test data you don't mind mutating.

Run: `npx playwright test`
