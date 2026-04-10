import { test as base, type BrowserContext } from "@playwright/test";

const USERS = ["nstest01", "nstest02"];

type WorkerFixtures = {
  workerContext: BrowserContext;
};

export const test = base.extend<{}, WorkerFixtures>({
  workerContext: [
    async ({ browser }, use, workerInfo) => {
      const userId = USERS[workerInfo.workerIndex % USERS.length];
      console.log(`[Worker ${workerInfo.workerIndex}] → ${userId}`);
      const context = await browser.newContext({
        storageState: `auth/${userId}.json`,
      });
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  page: async ({ workerContext }, use) => {
    const page = await workerContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
