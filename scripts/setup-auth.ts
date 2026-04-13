import { chromium } from "@playwright/test";
import * as fs from "fs";

const BASE_URL = "https://5177942-sb3.app.netsuite.com";
const AUTH_DIR = "auth";

// Parse .env without requiring the dotenv package
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const USERS = [
  { id: "nstest1", email: process.env.NSTEST1_EMAIL ?? "nstest1@eg.dk", password: process.env.NSTEST1_PASSWORD },
  { id: "nstest2", email: process.env.NSTEST2_EMAIL ?? "nstest2@eg.dk", password: process.env.NSTEST2_PASSWORD },
  { id: "nstest3", email: process.env.NSTEST3_EMAIL ?? "nstest3@eg.dk", password: process.env.NSTEST3_PASSWORD },
];

async function saveSession(userId: string, email: string, password: string | undefined): Promise<void> {
  console.log(`\n[${userId}] Authenticating as ${email}...`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL);

  if (password) {
    try {
      // Wait for Microsoft SSO email field
      await page.waitForURL("**/login.microsoftonline.com/**", { timeout: 10000 });
      await page.fill('input[type="email"]', email, { timeout: 10000 });
      await page.click('input[type="submit"]', { timeout: 5000 });

      // Wait for password field on next screen
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
        `[${userId}] Could not complete login automatically — finish login manually in the browser window`
      );
    }
  } else {
    console.log(
      `[${userId}] No password set — complete login manually in the browser window`
    );
  }

  console.log(`[${userId}] Waiting for NetSuite dashboard (2 min timeout)...`);
  await page.waitForURL("**/app/center/**", { timeout: 120_000 });

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

  console.log("\nAll sessions saved. You can now run: npm test");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
