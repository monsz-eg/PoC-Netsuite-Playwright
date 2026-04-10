import { expect, test } from "@playwright/test";

test("nstest01 session is valid", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: "auth/nstest01.json",
  });
  const page = await context.newPage();
  await page.goto("https://5177942-sb3.app.netsuite.com");
  await expect(page.locator("#spn_userName")).toContainText("nstest1");
  await context.close();
});
