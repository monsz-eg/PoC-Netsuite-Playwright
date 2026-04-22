# Role Management

**Closed decision:** URL-based role switch — no separate session files per role.

## Rationale

All 15 accounts have access to all ~16 roles. A `storageState-per-role` approach would produce 240 files — unmaintainable. Role switching via URL is stable across NS upgrades.

## Implementation

`switchRole(roleId: number)` is part of `BasePage`:

1. Ensures a NetSuite page is loaded (navigates to `/` if not on `netsuite.com`).
2. Waits for `nlapiGetContext()` via `waitForNsApi()`.
3. Reads `empId` and `companyId` from `nlapiGetContext()` and builds the `changerole.nl` URL.
4. Navigates to that URL and waits for NS load.
5. Verifies the active role via `nlapiGetContext().role` — throws a descriptive error if the role is not assigned.

After switching, NetSuite redirects to the dashboard — no need to navigate back to the previous page.

All role IDs are in [tests/constants/roles.ts](../tests/constants/roles.ts) as numeric constants. Use `ROLES.<roleName>` — never hardcode a role ID inline.

## Usage

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

Call `switchRole` in `beforeEach` when a test requires a specific role from the start.
