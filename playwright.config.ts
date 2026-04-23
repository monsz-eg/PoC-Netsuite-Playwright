/// <reference types="node" />
import * as fs from 'fs';
import { defineConfig, devices } from '@playwright/test';

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

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 3,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'https://5177942-sb3.app.netsuite.com',

    trace: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
