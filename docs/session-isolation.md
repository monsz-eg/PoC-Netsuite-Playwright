# Parallel Execution — Session Isolation

**Closed decision:** 1 worker = 1 dedicated NetSuite user.

## Problem

NetSuite stores session state server-side. Two workers sharing a session can invalidate each other's tokens or cause record conflicts.

## Solution

```
Worker 0  →  auth/nstest1.json  →  tests A, D, G...
Worker 1  →  auth/nstest2.json  →  tests B, E, H...
Worker 2  →  auth/nstest3.json  →  tests C, F, I...
```

Playwright assigns tests to workers automatically — no custom pool manager needed.

## Fixture

See [tests/fixtures/baseFixture.ts](../tests/fixtures/baseFixture.ts) for the full implementation.

| Fixture | Scope | Purpose |
|---|---|---|
| `workerContext` | worker | Shared browser context for the worker's assigned user — reused across tests |
| `userId` | worker | The assigned username string (e.g. `"nstest1"`) — available for annotations |
| `page` | test | A new page inside `workerContext`; annotated with the user ID; closed after each test |
| `isolatedPage` | test | A fully isolated context + page using `isolatedStorageState` — for tests that must not share context state |

`isolatedStorageState` defaults to the worker's own session file but can be overridden per-file with `test.use({ isolatedStorageState: 'auth/nstest1.json' })`.

```typescript
// In every test file:
import { test, expect } from '../fixtures/baseFixture';
```

## Tests Requiring a Specific User

```typescript
test.use({ isolatedStorageState: 'auth/nstest1.json' });
```

See [tests/project/project.spec.ts](../tests/project/project.spec.ts) for a working example.

## Tests Requiring Two Users

```typescript
test('create + approve', async ({ page, browser }) => {
  // page → worker's assigned user (e.g. nstest1)
  const ctx2 = await browser.newContext({ storageState: 'auth/nstest2.json' });
  const page2 = await ctx2.newPage();
  // ...
  await ctx2.close();
});
```

## Generating Sessions

**Manual fallback:**

```bash
npx playwright codegen --save-storage=auth/nstest1.json \
  https://5177942-sb3.app.netsuite.com
```

**Semi-automated (`scripts/setup-auth.ts`):**

```bash
cp .env.example .env   # fill in passwords (optional — manual login works without them)
npm run auth:setup
```

Sessions saved to `auth/nstest1.json`, `auth/nstest2.json`, `auth/nstest3.json`.
