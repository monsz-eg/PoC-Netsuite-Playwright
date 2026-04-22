import * as path from 'path';
import { test as base, type BrowserContext, type Page } from '@playwright/test';

const USERS = ['nstest1', 'nstest2', 'nstest3'];

type WorkerFixtures = {
  workerContext: BrowserContext;
  userId: string;
};

type TestFixtures = {
  isolatedStorageState: string;
  isolatedUserId: string;
  isolatedPage: Page;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerContext: [
    async ({ browser }, use, workerInfo) => {
      const userId = USERS[workerInfo.workerIndex % USERS.length];
      const context = await browser.newContext({
        storageState: `auth/${userId}.json`,
      });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],
  userId: [
    async ({}, use, workerInfo) => {
      await use(USERS[workerInfo.workerIndex % USERS.length]);
    },
    { scope: 'worker' },
  ],
  page: async ({ workerContext, userId }, use, testInfo) => {
    testInfo.annotations.push({ type: 'user', description: userId });
    const page = await workerContext.newPage();
    await use(page);
    await page.close();
  },
  isolatedStorageState: async ({ userId }, use) => {
    await use(`auth/${userId}.json`);
  },
  isolatedUserId: async ({ isolatedStorageState }, use) => {
    await use(path.basename(isolatedStorageState, '.json'));
  },
  isolatedPage: async ({ browser, isolatedStorageState }, use, testInfo) => {
    testInfo.annotations.push({ type: 'storageState', description: isolatedStorageState });
    const context = await browser.newContext({ storageState: isolatedStorageState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
