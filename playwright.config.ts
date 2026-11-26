import { defineConfig, devices } from "@playwright/test";

const webServerCommand =
	process.env.E2E_SERVER ??
	"pnpm exec vite preview --host 127.0.0.1 --port 3000 --strictPort";

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["list"], ["github"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
	webServer: {
		command: webServerCommand,
		url: "http://127.0.0.1:3000",
		reuseExistingServer: !process.env.CI,
		env: {
			SUPABASE_PUBLIC_URL:
				process.env.SUPABASE_PUBLIC_URL ?? "http://127.0.0.1:54321",
			SUPABASE_PUBLISHABLE_KEY:
				process.env.SUPABASE_PUBLISHABLE_KEY ??
				"sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
		},
	},
});
