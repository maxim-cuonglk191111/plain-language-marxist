import { defineConfig, devices } from "@playwright/test";

// PLM_E2E_PORT lets several checkouts (e.g. git worktrees) run the suite at once;
// each must serve its own build, since a server already on the port is reused.
const port = Number(process.env.PLM_E2E_PORT ?? 4174);
const base = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: base, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      grepInvert: /@mobile/,
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: "node e2e/serve.mjs",
    url: `${base}/`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    cwd: "..",
  },
});
