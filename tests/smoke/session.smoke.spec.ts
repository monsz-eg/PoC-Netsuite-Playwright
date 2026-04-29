// Intentionally imports from @playwright/test (not baseFixture) so that all configured users
// are tested unconditionally — independent of which worker runs this file.
// The baseFixture maps one user per worker; using it here would only test one user per run.
import { expect, test } from '@playwright/test';

const DEFAULT_USERS = [
  'nstest1',
  'nstest2',
  'nstest3',
  'nstest4',
  'nstest5',
  'nstest6',
  'nstest7',
  'nstest8',
  'nstest9',
] as const;
const USERS =
  process.env.TEST_USERS?.trim()
    ? process.env.TEST_USERS
        .split(',')
        .map((userId) => userId.trim())
        .filter(Boolean)
    : DEFAULT_USERS;

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
