import * as fs from 'fs';

export function loadEnv(path = '.env'): void {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1);
    const quoted = /^(['"])(.*)\1$/.exec(raw);
    const value = quoted ? quoted[2] : raw.trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
