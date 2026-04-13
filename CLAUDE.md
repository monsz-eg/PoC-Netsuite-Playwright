# CLAUDE.md — AI Agent Instructions

## Role

You are a senior test automation engineer with deep expertise in:

- Playwright + TypeScript: fixtures, Page Object Model, parallel execution, session isolation
- NetSuite SuiteCloud: form structure, field attributes, role-based navigation, SuiteScript execution
- QA principles: deterministic assertions, test isolation, meaningful failure messages

You write tests that **detect problems** — not tests that pass regardless of application state.

---

## Core Testing Principle

A test MUST fail when the feature it tests is broken. No exceptions. No "fixing the app inside the test" to make assertions pass.

Tests exist to detect problems in the application — not to hide them. If the app behaves incorrectly, the test must reflect that with a clear Fail status and a detailed description of what went wrong. Adjusting assertions, skipping checks, or working around broken behaviour to produce a green result defeats the purpose of testing. **A passing test that hides a broken feature is worse than no test at all.**

---

## Output Expectation

Generated Playwright tests must be:

- stable — no race conditions, no `waitForTimeout`
- readable — test name describes the scenario, not the implementation
- reviewable — diff is small and focused
- maintainable — locators in Page Objects, not scattered across tests
- aligned with Playwright best practices
- aligned with internal team standards defined in this file

---

## Locator Priority

Always prefer stable NetSuite-native attributes that map directly to Field ID. Follow this order strictly:
| Priority | Selector | Example | When |
|---|---|---|---|
| 1 | `[name="fieldId"]` | `[name="entity"]`, `[name="custentity_eg_chain"]` | Editable fields — standard and custom. `name` maps directly to NS Field ID |
| 2 | `[data-field-name="fieldId"]` | `[data-field-name="entitystatus"]` | Read-only fields — wrapper `<div>` always has this in view mode |
| 3 | `[id="fieldId_display"]` | `[id="entitystatus_display"]` | Fallback if `data-field-name` is absent |
| 4 | Text / XPath | `text="Save"` | Last resort — buttons without stable attributes |

**Rules:**

- Never use CSS classes — they change on every NS upgrade (precedent: 2026.1)
- Field ID is the source of truth — find it via NS Field Help (click field label) or NS Field Explorer
- `name` and `data-field-name` both map directly to Field ID — no suffixes, no guessing
- Verify selectors in DevTools before writing Page Object — do not assume

---

## SOLID Principles

**Single Responsibility**

- One page object = one NS page or component
  - `SalesOrderPage` handles header fields and top-level actions
  - `SalesOrderItemsSublist` handles line items only
  - `GLMatchingPage` handles only GL matching workflow
- One method = one action
  - `approveSalesOrder()` only approves — does not verify status afterwards
  - `verifySublistTotal()` only reads and asserts — does not add lines
- If a method exceeds 30 lines, split it into private helpers

**Don't Repeat Yourself**

- If `[name="entity"]` is used in two methods, declare it once as `private readonly entityField`
- If "wait for NS page load after save" appears in `SalesOrderPage` and `JournalEntryPage`, move it to `BasePage.waitForNetSuiteLoad()`

**Extend, don't modify**

- `switchRole()`, `navigateTo()`, `waitForNetSuiteLoad()` live in `BasePage` — available to all
- Never add GL Matching logic to `BasePage` because only one test suite needs it
- Add a new NS module → create a new Page Object, touch nothing else

**Small, focused methods**

- `fillHeader()` fills header fields — it does not submit the form
- `addLineItem()` adds one line — it does not verify the sublist total
- `verifyApprovalStatus()` reads the status field — it does not trigger approval
- Extract repeated sublist row interactions into private helpers

---

## Conventional Commits

Format: `<type>(<scope>): <description>`

| Type       | When                                 |
| ---------- | ------------------------------------ |
| `feat`     | New test or page object              |
| `fix`      | Broken test or wrong selector        |
| `test`     | Improving existing test coverage     |
| `refactor` | Code change with no behaviour change |
| `chore`    | Config, deps, auth sessions setup    |
| `docs`     | CLAUDE.md, CHANGELOG, comments       |

---

## Session Management

### Generating sessions

**Manual fallback (any single user):**

```bash
npx playwright codegen --save-storage=auth/nstest1.json \
  https://5177942-sb3.app.netsuite.com
```

**Semi-automated script — `scripts/setup-auth.ts` (current implementation):**

Reads credentials from a `.env` file (see `.env.example`). If a password is provided it attempts automated Microsoft SSO login; otherwise it falls back to manual login in the browser window.

```bash
# 1. Copy .env.example → .env and fill in passwords (optional — manual login works without them)
cp .env.example .env

# 2. Run:
npm run auth:setup
```

Sessions are saved to `auth/nstest1.json`, `auth/nstest2.json`, `auth/nstest3.json`.


## Parallel Execution — Session Isolation

**Closed decision:** 1 worker = 1 dedicated NetSuite user.

### Problem

NetSuite stores session state server-side. Two workers sharing a session can invalidate each other's tokens or cause record conflicts.

### Solution

```
Worker 0  →  auth/nstest1.json  →  tests A, D, G...
Worker 1  →  auth/nstest2.json  →  tests B, E, H...
Worker 2  →  auth/nstest3.json  →  tests C, F, I...
```

Playwright assigns tests to workers automatically — no custom pool manager needed. A worker lives for the entire run and processes its assigned tests sequentially.

### Fixture

A fixture is a Playwright mechanism that prepares the environment before each test and cleans up afterwards — an elegant replacement for `beforeEach`/`afterEach`. Built-in fixtures (`page`, `browser`, `context`) are available automatically. Here we extend the built-in `page` so each worker gets its own user session.

`workerInfo.workerIndex` is the worker number (0, 1, 2...). It is used as an index into the USERS array so that Worker 0 always gets nstest1, Worker 1 gets nstest2, and so on.

The fixture exposes four things:

| Fixture | Scope | Purpose |
|---|---|---|
| `workerContext` | worker | Shared browser context for the worker's assigned user — reused across tests |
| `userId` | worker | The assigned username string (e.g. `"nstest1"`) — available for annotations |
| `page` | test | A new page inside `workerContext`; annotated with the user ID; closed after each test |
| `isolatedPage` | test | A fully isolated context + page using `isolatedStorageState` — for tests that must not share context state |

`isolatedStorageState` defaults to the worker's own session file but can be overridden per-file with `test.use({ isolatedStorageState: 'auth/nstest1.json' })` to pin a specific user regardless of which worker runs the test (see [Tests requiring a specific user](#tests-requiring-a-specific-user)).

See [tests/fixtures/baseFixture.ts](tests/fixtures/baseFixture.ts) for the full implementation.

```typescript
// In every test file:
import { test, expect } from '../fixtures/baseFixture';  // ✅ both from fixture
```

### Tests requiring a specific user

Add at the top of a test file to pin `isolatedPage` to a specific user regardless of which worker runs the test:

```typescript
test.use({ isolatedStorageState: 'auth/nstest1.json' });
```

See [tests/project/project.spec.ts](tests/project/project.spec.ts) for a working example.

### Tests requiring two users

Use `isolatedPage` for the second user, or create contexts manually via `browser`:

```typescript
test('create + approve', async ({ page, browser }) => {
  // page → worker's assigned user (e.g. nstest1)
  // ctx2 → explicit second user
  const ctx2 = await browser.newContext({ storageState: 'auth/nstest2.json' });
  const page2 = await ctx2.newPage();
  // ...
  await ctx2.close();
});
```

---

## NetSuite Field Interaction Patterns

### Editable text fields

Use a direct locator with `fill()`:

```typescript
await this.page.locator('[name="companyname"]').fill(name);
```

### Dropdown / select / lookup fields

Standard `select()` or `fill()` often fails on NS dropdowns because they are driven by SuiteScript event handlers, not native `<select>` elements. Use `nlapiSetFieldValue` via `page.evaluate()` instead:

```typescript
async setJobType(value: string): Promise<void> {
  await this.page.evaluate(
    (v) => (globalThis as any).nlapiSetFieldValue('jobtype', v),
    value,
  );
}
```

This calls the NS client-side API directly, triggering field-change events exactly as a user would. Use this pattern for:
- List/Record dropdowns (`jobtype`, `customform`, etc.)
- Entity select fields (`projectmanager`, `department`, etc.)
- Custom entity fields (`custentity_*`)

Always verify the internal ID value (not display label) in NS Field Help before passing it as the argument.

---

## Role Management

**Closed decision:** URL-based role switch — no separate session files per role.

### Rationale

All 15 accounts have access to all ~16 roles. A `storageState-per-role` approach would produce 240 files — unmaintainable. Role switching via URL is stable across NS upgrades.

### Implementation

`switchRole(roleId: number)` is part of `BasePage`. It works as follows:

1. Ensures a NetSuite page is loaded (navigates to `/` if not on `netsuite.com`).
2. Waits for `nlapiGetContext()` to be available via `waitForNsApi()`.
3. Reads the current user's `empId` and `companyId` from `nlapiGetContext()` and builds the `changerole.nl` URL.
4. Navigates to that URL and waits for NS load.
5. Verifies the active role via `nlapiGetContext().role` — throws a descriptive error if the role is not assigned to this user.

After switching, NetSuite redirects to the dashboard — navigating back to the previous page is not required, because a role switch typically precedes navigation to a new context.

All role IDs are defined in [tests/constants/roles.ts](tests/constants/roles.ts) as numeric constants (verified against the sandbox). Use `ROLES.<roleName>` — never hardcode a role ID inline.

```typescript
import { test, expect } from '../fixtures/baseFixture';
import { BasePage } from '../pages/BasePage';
import { ROLES } from '../constants/roles';

test('approval flow', async ({ page }) => {
  const base = new BasePage(page);

  await base.switchRole(ROLES.egconsultant);
  await base.navigateTo('/app/accounting/transactions/...');

  await base.switchRole(ROLES.egmanagerswithstaff);
  await base.navigateTo('/app/accounting/transactions/...');
});
```

> **Note:** Call `switchRole` in `beforeEach` when a test requires a specific role from the start.
