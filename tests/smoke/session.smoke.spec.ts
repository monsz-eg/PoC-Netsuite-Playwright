// Intentionally imports from @playwright/test (not baseFixture) so that all 3 users
// are tested unconditionally — independent of which worker runs this file.
// The baseFixture maps one user per worker; using it here would only test one user per run.
import { expect, test } from '@playwright/test';

const USERS = ['nstest1', 'nstest2', 'nstest3', 'nstest4', 'nstest5', 'nstest6'] as const;

for (const userId of USERS) {
  test.describe(userId, () => {
    test.use({ storageState: `auth/${userId}.json` });

    test(`authenticated session lands on NS home without login prompt @smoke`, async ({ page }) => {
      await page.goto('/');
      await page.waitForURL(/app\/center/);
      await expect(page).not.toHaveTitle(/login|sign in/i);
    });
  });
}
