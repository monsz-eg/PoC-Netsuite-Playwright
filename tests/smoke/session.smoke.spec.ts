import { expect, test } from "@playwright/test";

const USERS = ["nstest1", "nstest2", "nstest3"] as const;

for (const userId of USERS) {
  test.describe(userId, () => {
    test.use({ storageState: `auth/${userId}.json` });

    test(`authenticated session lands on NS home without login prompt @smoke`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForURL(/app\/center/);
      await expect(page).not.toHaveTitle(/login|sign in/i);
    });
  });
}
