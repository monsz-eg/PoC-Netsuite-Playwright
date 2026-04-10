import { test as base, type BrowserContext } from "@playwright/test";

const USERS = ["nstest01", "nstest02"];

type WorkerFixtures = {
  workerContext: BrowserContext;
  userId: string;
};

export const test = base.extend<{}, WorkerFixtures>({
  workerContext: [
    async ({ browser }, use, workerInfo) => {
      const userId = USERS[workerInfo.workerIndex % USERS.length];
      const context = await browser.newContext({
        storageState: `auth/${userId}.json`,
      });
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  userId: [
    async ({}, use, workerInfo) => {
      await use(USERS[workerInfo.workerIndex % USERS.length]);
    },
    { scope: "worker" },
  ],
  page: async ({ workerContext, userId }, use, testInfo) => {
    testInfo.annotations.push({ type: "user", description: userId });
    const page = await workerContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
