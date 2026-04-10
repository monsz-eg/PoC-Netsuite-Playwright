import { expect, test } from "../fixtures/baseFixture";

test("authenticated session lands on NS home without login prompt @smoke", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL(/app\/center/);
  await expect(page).not.toHaveTitle(/login|sign in/i);
});
