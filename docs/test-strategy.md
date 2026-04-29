# Test Strategy

**Scope:** UI workflows and NetSuite-side verification. Unit tests live with developers, out of scope.

## Test Types

| Type | Purpose | Status |
|---|---|---|
| **Smoke** | Environment sanity — session, roles, navigation. Fails fast before e2e runs. | In place ([tests/smoke/](../tests/smoke/)) |
| **E2E workflow** | Real user journeys through the UI. One `test.describe.serial()` block per business workflow, one workflow per spec file. | Primary investment |
| **Integration** | External system ↔ NS flows with no UI path. REST API + OAuth 1.0 TBA + SuiteQL. | Deferred — add when the first integration story arrives |

## Data Principles

- **Setup through the UI.** Page objects create prerequisites. Slow but deliberate — each Arrange step validates UI behaviour. API-based creation is rejected because it masks form bugs and skips client scripts.
- **Assertions may use `N/search`.** Run via `page.evaluate()` — reuses the browser session, no OAuth needed. Use for cross-record verification the UI doesn't surface (GL entries, totals, related record state).
- **Do not scatter record IDs through specs or page objects.** Reusable IDs may live only in centralized lookup files (e.g. `tests/constants/lookups.ts` / `projectData.ts`). Prefer `N/search` in setup for unstable or environment-specific records, and regenerate centralized IDs after sandbox refresh when needed.

## Deferred — Add When These Triggers Appear

| Trigger | Change |
|---|---|
| Second step in an e2e chain (e.g. charge rules after project) | Wrap in `test.describe.serial()`, share IDs via outer `let` |
| Second spec needs the same prerequisite in Arrange | Extract to a worker-scoped fixture |
| First cross-record assertion | Add `tests/utils/nsSearch.ts` — `N/search` via `page.evaluate` with Promise wrapper |
| First integration story | Add REST API client with OAuth 1.0 TBA; introduce integration test layer |
