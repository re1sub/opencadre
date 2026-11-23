import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
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
		command: "pnpm dev",
		url: "http://127.0.0.1:3000",
		reuseExistingServer: !process.env.CI,
		env: {
			VITE_SUPABASE_URL:
				process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321",
			VITE_SUPABASE_PUBLISHABLE_KEY:
				process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
				"sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
		},
	},
});
