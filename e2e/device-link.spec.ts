import { devices, expect, type Page, test } from "@playwright/test";

const EMAIL = "dev-link@opencadre.local";
const PASSWORD = "dev-password-123";
const WORKSPACE = "Device Link E2E";

const signIn = async (page: Page) => {
	await page.goto("/auth/signin");
	await page.getByLabel("Email").fill(EMAIL);
	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	await expect(page).toHaveURL(/\/workspace/);
};

const approveFrom = async (page: Page) => {
	await expect(page.getByRole("button", { name: "Approve" })).toBeVisible({
		timeout: 20000,
	});
	await page.getByRole("button", { name: "Approve" }).click();
};

test.describe("device link approval", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"launches Firefox and WebKit explicitly, so it only runs in Chromium",
	);

	test("each new device unlocks after the previous one approves it", async ({
		browser,
		playwright,
	}) => {
		test.setTimeout(120_000);
		const trustedContext = await browser.newContext();
		const trusted = await trustedContext.newPage();
		const firefox = await playwright.firefox.launch();
		// Playwright Test applies the Chromium project's context options to
		// contexts from manually launched browsers. Override the user agent so
		// the app records distinct, realistic device labels.
		const firefoxContext = await firefox.newContext({
			userAgent: devices["Desktop Firefox"].userAgent,
		});
		const firefoxDevice = await firefoxContext.newPage();
		const webkit = await playwright.webkit.launch();
		const webkitContext = await webkit.newContext({
			userAgent: devices["Desktop Safari"].userAgent,
		});
		const webkitDevice = await webkitContext.newPage();

		try {
			await test.step("Chromium onboards and creates a workspace", async () => {
				await signIn(trusted);
				await expect(
					trusted.getByRole("heading", { name: "Save your recovery code" }),
				).toBeVisible({ timeout: 15000 });
				await trusted.getByRole("button", { name: "I saved it" }).click();
				await expect(
					trusted.getByRole("heading", {
						name: "Create your first workspace",
					}),
				).toBeVisible();
				await trusted.getByLabel("Workspace name").fill(WORKSPACE);
				await trusted.getByRole("button", { name: "Create workspace" }).click();
				await expect(
					trusted.getByRole("heading", { name: WORKSPACE }),
				).toBeVisible();
			});

			await test.step("Firefox links from Chromium", async () => {
				// Firefox has no device key, so it asks the only trusted device.
				await signIn(firefoxDevice);
				await expect(
					firefoxDevice.getByText("Waiting for approval on"),
				).toBeVisible({ timeout: 20000 });
				await approveFrom(trusted);
				await expect(
					firefoxDevice.getByRole("heading", { name: WORKSPACE }),
				).toBeVisible({ timeout: 20000 });
			});

			await test.step("WebKit links from Firefox", async () => {
				// WebKit has two trusted devices to pick from; choose Firefox.
				await signIn(webkitDevice);
				await expect(
					webkitDevice.getByText("Pick a device that is open and unlocked"),
				).toBeVisible({ timeout: 20000 });
				await webkitDevice
					.getByText(/Firefox/)
					.locator("xpath=../..")
					.getByRole("button", { name: "Use this device" })
					.click();
				await expect(
					webkitDevice.getByText("Waiting for approval on Firefox"),
				).toBeVisible({ timeout: 20000 });
				await approveFrom(firefoxDevice);
				await expect(
					webkitDevice.getByRole("heading", { name: WORKSPACE }),
				).toBeVisible({ timeout: 20000 });
			});
		} finally {
			await webkitContext.close();
			await webkit.close();
			await firefoxContext.close();
			await firefox.close();
			await trustedContext.close();
		}
	});
});
