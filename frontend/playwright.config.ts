import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

const PORT = 8765
const projectRoot = resolve(import.meta.dirname, '..')
const python =
  process.env.FLOWDESK_PYTHON ??
  join(projectRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

if (!process.env.FLOWDESK_E2E_STORAGE_DIR) {
  for (const entry of readdirSync(tmpdir()).filter((name) => name.startsWith('flowdesk-e2e-'))) {
    rmSync(join(tmpdir(), entry), { recursive: true, force: true })
  }
  process.env.FLOWDESK_E2E_STORAGE_DIR = mkdtempSync(join(tmpdir(), 'flowdesk-e2e-'))
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.FLOWDESK_BROWSER_CHANNEL ?? 'chrome',
    colorScheme: 'light',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `"${python}" -m tests.e2e_server`,
    cwd: projectRoot,
    url: `http://127.0.0.1:${PORT}/api/columns`,
    env: {
      FLOWDESK_PORT: String(PORT),
      FLOWDESK_STORAGE: 'local',
      FLOWDESK_STORAGE_DIR: process.env.FLOWDESK_E2E_STORAGE_DIR,
      ...(process.env.FLOWDESK_E2E_DATABASE_URL ? { FLOWDESK_E2E_DATABASE_URL: process.env.FLOWDESK_E2E_DATABASE_URL } : {}),
    },
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
