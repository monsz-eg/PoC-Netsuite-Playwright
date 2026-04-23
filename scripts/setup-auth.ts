import { chromium } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'https://5177942-sb3.app.netsuite.com';
const AUTH_DIR = 'auth';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1);
    const quoted = /^(['"])(.*)\1$/.exec(raw);
    const value = quoted ? quoted[2] : raw;
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const USERS = (process.env.TEST_USERS ?? 'nstest1,nstest2,nstest3').split(',').map((id) => ({
  id,
  email: process.env[`${id.toUpperCase()}_EMAIL`] ?? `${id}@eg.dk`,
  password: process.env[`${id.toUpperCase()}_PASSWORD`],
}));

async function saveSession(
  userId: string,
  email: string,
  password: string | undefined,
): Promise<void> {
  console.log(`\n[${userId}] Authenticating as ${email}...`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL);

  if (password) {
    try {
      // Wait for the Microsoft SSO redirect. Azure AD seamless SSO will auto-select
      // the current Windows user (madob@eg.dk) at this point — that is expected.
      await page.waitForURL('**/login.microsoftonline.com/**', { timeout: 10000 });

      // Re-navigate to the same MS URL (which already carries all the OAuth parameters
      // from NetSuite) but with login_hint pointing at the target account and
      // prompt=login to bypass the seamless-SSO token and force interactive auth.
      const msUrl = new URL(page.url());
      msUrl.searchParams.set('login_hint', email);
      msUrl.searchParams.set('prompt', 'login');
      await page.goto(msUrl.toString());

      // MS may skip the email field when login_hint is supplied — handle both cases
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill(email);
        await page.click('input[type="submit"]', { timeout: 5000 });
      }

      // Password field
      await page.fill('input[type="password"]', password, { timeout: 10000 });
      await page.click('input[type="submit"]', { timeout: 5000 });

      // "Stay signed in?" prompt — dismiss it if it appears
      try {
        await page.click('input[type="submit"]', { timeout: 5000 });
      } catch {
        // prompt did not appear — continue
      }
    } catch {
      console.log(
        `[${userId}] Could not complete login automatically — finish login manually in the browser window`,
      );
    }
  } else {
    console.log(`[${userId}] No password set — complete login manually in the browser window`);
  }

  console.log(`[${userId}] Waiting for NetSuite dashboard (2 min timeout)...`);
  await page.waitForURL('**/app/center/**', { timeout: 120_000 });

  await context.storageState({ path: `${AUTH_DIR}/${userId}.json` });
  console.log(`[${userId}] Session saved → ${AUTH_DIR}/${userId}.json`);

  await browser.close();
}

async function main(): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  for (const user of USERS) {
    await saveSession(user.id, user.email, user.password);
  }

  console.log('\nAll sessions saved. You can now run: npm test');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
