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

## Test Strategy

**Scope:** UI workflows and NetSuite-side verification. Unit tests live with developers, out of scope.

### Test types

| Type | Purpose | Status |
|---|---|---|
| **Smoke** | Environment sanity — session, roles, navigation. Fails fast before e2e runs. | In place ([tests/smoke/](tests/smoke/)) |
| **E2E workflow** | Real user journeys through the UI. One `test.describe.serial()` block per business workflow, one workflow per spec file. | Primary investment |
| **Integration** | External system ↔ NS flows with no UI path. REST API + OAuth 1.0 TBA + SuiteQL. | Deferred — add when the first integration story arrives |

### Data principles

- **Setup through the UI.** Page objects create prerequisites. Slow but deliberate — each Arrange step validates UI behaviour. API-based creation is rejected because it masks form bugs and skips client scripts.
- **Assertions may use `N/search`.** Run via `page.evaluate()` — reuses the browser session, no OAuth needed. Use for cross-record verification the UI doesn't surface (GL entries, totals, related record state).
- **Do not scatter record IDs through specs or page objects.** Reusable IDs may live only in centralized lookup files (for example `tests/constants/lookups.ts` / `projectData.ts`). Prefer `N/search` in setup for unstable or environment-specific records, and regenerate centralized IDs after sandbox refresh when needed.

### Deferred — add when these triggers appear

| Trigger | Change |
|---|---|
| Second step in an e2e chain (e.g. charge rules after project) | Wrap in `test.describe.serial()`, share IDs via outer `let` |
| Second spec needs the same prerequisite in Arrange | Extract to a worker-scoped fixture |
| First cross-record assertion | Add `tests/utils/nsSearch.ts` — `N/search` via `page.evaluate` with Promise wrapper |
| First integration story | Add REST API client with OAuth 1.0 TBA; introduce integration test layer |

---

## Test Structure — Arrange / Act / Assert

Every test must follow the AAA pattern with a blank line separating each phase:

```typescript
test('project status is Active after creation', async ({ page }) => {
  // Arrange — set up preconditions
  const projectPage = new ProjectPage(page);
  await base.switchRole(ROLES.egConsultant);
  await base.navigateTo('/app/project/...');

  // Act — perform the action under test
  await projectPage.fillHeader({ name: 'Test Project', status: 'active' });
  await projectPage.save();

  // Assert — verify the expected outcome
  await expect(projectPage.statusField).toHaveText('Active');
});
```

**Rules:**

- Each phase is marked with a `// Arrange`, `// Act`, or `// Assert` comment
- One blank line between phases
- Assert phase contains only assertions — no navigation, no data entry

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

### Item sublist line population

NS sublist cells do **not** pre-render inputs in the DOM — they only exist when the cell is active. Never wait for or interact with `#item_description`, `#item_quantity`, `#item_rate` etc. as DOM elements. Use the SuiteScript API instead.

**Item field** — `nlapiSetCurrentLineItemValue` crashes on `checkvalid` for the item field in certain roles (e.g. Billing Responsible). Use native Playwright type-ahead instead:

```typescript
const itemInput = this.page.locator('#item_item_display');
await itemInput.click();
await itemInput.pressSequentially(itemText, { delay: 50 });
await this.page.waitForLoadState('networkidle');
await this.page.keyboard.press('Tab');
// Wait for NS to auto-populate tax code as confirmation the item resolved
await this.page.waitForFunction(
  () => { try { return !!(globalThis as any).nlapiGetCurrentLineItemValue('item', 'taxcode'); } catch { return false; } },
  { timeout: 15000 },
);
```

**Standard sublist fields** (description, quantity, rate, rev rec dates) — use `nlapiSetCurrentLineItemValue` with `firefieldchanged=true`, but stub `nlapiFieldChanged` first to prevent the SuiteScript `fieldChanged` callback from crashing or navigating away. Restore the original after:

```typescript
await this.page.evaluate((v) => {
  const g = globalThis as any;
  const orig = g.nlapiFieldChanged;
  g.nlapiFieldChanged = () => {};
  try {
    g.nlapiSetCurrentLineItemValue('item', 'quantity', v, true);
  } finally {
    g.nlapiFieldChanged = orig;
  }
}, value);
await this.page.waitForTimeout(1000);
```

**Custom segment fields (`cseg_*`)** — NS generates a global `Sync<fieldName>` function that writes the value into NS's model. Set the hidden input's value and `isvalid` flag, then call the Sync function with the stub pattern:

```typescript
await this.page.evaluate(({ field, sync, val }) => {
  const el = (globalThis as any).document.querySelector(`[name="${field}"]`);
  if (el) { el.value = val; el.isvalid = true; }
  const orig = (globalThis as any).nlapiFieldChanged;
  (globalThis as any).nlapiFieldChanged = () => {};
  try { (globalThis as any)[sync](true); }
  finally { (globalThis as any).nlapiFieldChanged = orig; }
}, { field: 'cseg_eg_main_prod', sync: 'Synccseg_eg_main_prod', val: id });
await this.page.waitForTimeout(1000);
```

**Hidden input fields** (e.g. department in the item sublist) — set the value directly and dispatch a `change` event. The `onchange` handler may crash at `nlapiFieldChanged` but the value is stored before the crash:

```typescript
const el = document.querySelector('#hddn_item_department_fs');
if (el) { el.value = val; el.isvalid = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
```

**`ensureFormInited()`** — `NS.form.setInited(true)` must be called after every navigation or reload. Without it `canAddLine()` returns false and the Add button silently refuses to commit the line. Call it inside `navigateToInvoice()` and after `setCustomer()` (which triggers a page reload):

```typescript
await this.page.evaluate(() => (globalThis as any).NS?.form?.setInited?.(true));
```

**Committing the line** — before clicking Add, wait for networkidle, wait for any loading spinner, and call `ensureFormInited()`. After clicking, confirm the commit by polling `nlapiGetLineItemCount`:

```typescript
await this.page.waitForLoadState('networkidle');
await this.page.waitForSelector('.ns-loading', { state: 'hidden' }).catch(() => {});
await this.ensureFormInited();
await this.page.locator('[name="item_addedit"]').click();
await this.page.waitForFunction(
  () => { try { return (globalThis as any).nlapiGetLineItemCount('item') >= 1; } catch { return false; } },
  { timeout: 30000 },
);
```

**Timing between setters** — each setter must be followed by `waitForTimeout(1000)` to allow NS's internal event queue to settle before the next field is written. Using `waitForLoadState('networkidle')` alone is insufficient because some NS internal callbacks are synchronous and do not generate network traffic.

---

## Verify Method Naming Convention

Two distinct verify patterns exist depending on when the check runs:

| Suffix | Mode | Mechanism | When to use |
|---|---|---|---|
| `verifyXxxPrepopulated` | Edit mode | `nlapiGetFieldValue` via `BasePage.verifyFieldValue` | Before `save()` — checks auto-populated values while the form is still open |
| `verifyXxx` | View mode | `[data-field-name="x"] [data-nsps-type="field_input"]` | After `save()` — checks saved values on the read-only record page |

**Rule:** never mix the two. A `verifyXxx` locator will not resolve in edit mode, and `nlapiGetFieldValue` is not available in view mode.

```typescript
// Edit mode — verify subsidiary auto-populated after customer was set
async verifySubsidiaryPrepopulated(expected: string): Promise<void> {
  await this.verifyFieldValue("subsidiary", expected);  // nlapiGetFieldValue
}

// View mode — verify subsidiary label on saved record
async verifySubsidiary(expected: string): Promise<void> {
  await expect(
    this.page.locator('[data-field-name="subsidiary"] [data-nsps-type="field_input"]')
  ).toHaveText(expected);
}
```

In tests, `verifyXxxPrepopulated` calls appear in the **Act** phase (before `save()`), and `verifyXxx` calls appear in the **Assert** phase.

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

  await base.switchRole(ROLES.egConsultant);
  await base.navigateTo('/app/accounting/transactions/...');

  await base.switchRole(ROLES.egManagersWithStaff);
  await base.navigateTo('/app/accounting/transactions/...');
});
```

> **Note:** Call `switchRole` in `beforeEach` when a test requires a specific role from the start.

---

## Future Actions

### Test Data Management — Fixture Strategies

When a test depends on a prerequisite NS record (e.g. a project task requires a project), avoid hardcoding internal IDs — they break after sandbox refreshes. Two patterns are on the roadmap; neither is implemented yet.

#### Option A — Worker-scoped fixture (fast, shared)

Creates the prerequisite record **once per worker** at startup. All tests in that worker share it. Right when the test only needs *a* record, not a specific configuration.

```typescript
// tests/fixtures/projectFixture.ts
const test = baseTest.extend<{}, { sharedProjectId: string }>({
  sharedProjectId: [async ({ workerContext }, use) => {
    const page = await workerContext.newPage();
    const project = new ProjectRecord(page);
    await project.switchRole(ROLES.egProjectManager);
    await project.navigateToProject();
    // ... fill with PROJECT_DATA.customerProject ...
    await project.save();
    const id = new URL(page.url()).searchParams.get('id')!;
    await page.close();
    await use(id);           // same id reused by all tests in this worker
  }, { scope: 'worker' }],
});
```

| | |
|---|---|
| **Speed** | Fast — 1 record created per worker per run |
| **Isolation** | Tests share the record — one test mutating it can affect others |
| **Use when** | "I need *a* project to create tasks against" |

#### Option B — Factory fixture (flexible, isolated)

Passes a **factory function** to the test. The test calls it with the specific data it needs, getting its own fresh record each time. Right when tests need different configurations or must not share state.

```typescript
// tests/fixtures/projectFixture.ts
const test = baseTest.extend<{ createProject: (data: ProjectConfig) => Promise<string> }>({
  createProject: async ({ isolatedPage }, use) => {
    await use(async (data) => {
      const project = new ProjectRecord(isolatedPage);
      await project.switchRole(ROLES.egProjectManager);
      await project.navigateToProject();
      // ... fill with data ...
      await project.save();
      return new URL(isolatedPage.url()).searchParams.get('id')!;
    });
  },
});
```

```typescript
test('task on Customer Project', async ({ createProject }) => {
  const projectId = await createProject(PROJECT_DATA.customerProject);
  // ...
});
test('task on Internal Project', async ({ createProject }) => {
  const projectId = await createProject(PROJECT_DATA.internalAdmin);
  // ...
});
```

| | |
|---|---|
| **Speed** | Slower — 1 record per test |
| **Isolation** | Full — each test gets its own record |
| **Use when** | "I need *this specific* project configuration" |

#### Decision guidance

| Scenario | Pattern |
|---|---|
| Test just needs any valid project | Worker-scoped fixture |
| Test needs a specific project config | Factory fixture |
| Test needs unique names/timestamps | Either pattern + `generateProjectName()` |

**Current PoC approach:** project creation is placed in the Arrange phase directly, without a fixture. Refactor to fixtures once multiple tests share the same prerequisite.

---

### CI/CD — Session Generation in GitHub Actions

When connecting the project to CI, session files must be generated dynamically (they are gitignored and must not be committed).

**Steps to implement:**

1. Add `NSTEST1_PASSWORD`, `NSTEST2_PASSWORD`, `NSTEST3_PASSWORD` as **GitHub Secrets** (repo Settings → Secrets and variables → Actions).
2. Create a `global-setup.ts` that runs the `setup-auth.ts` logic before the test suite.
3. Register it in `playwright.config.ts`:
   ```typescript
   globalSetup: './scripts/setup-auth.ts'
   ```
4. In `.github/workflows/playwright.yml`, expose the secrets as environment variables:
   ```yaml
   env:
     NSTEST1_PASSWORD: ${{ secrets.NSTEST1_PASSWORD }}
     NSTEST2_PASSWORD: ${{ secrets.NSTEST2_PASSWORD }}
     NSTEST3_PASSWORD: ${{ secrets.NSTEST3_PASSWORD }}
   ```

This keeps credentials out of the repo and generates sessions fresh on every CI run.
