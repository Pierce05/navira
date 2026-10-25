import { defineConfig, devices } from '@playwright/test';

/** Run `npm run build` first. Tests serve the static export from /out. Needs `npx playwright install chromium`. */
export default defineConfig({
  testDir: './test/e2e',
  timeout: 90_000,
  retries: 1,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure', acceptDownloads: true },
  webServer: { command: 'npx serve out -l 3100', url: 'http://localhost:3100', reuseExistingServer: true, timeout: 30_000 },
  projects: [
    { name: 'desktop', testIgnore: /voice\.spec/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-360', testIgnore: /voice\.spec/, use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
    {
      name: 'voice', testMatch: /voice\.spec/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${process.cwd()}/test/audio/demo.wav`] },
      },
    },
  ],
});
