import { devices, expect, type Page, test } from "@playwright/test";
import { deviceLinkAccount, finishVaultOnboarding, signIn } from "./helpers";

const WORKSPACE = "Device Link E2E";

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
	}, testInfo) => {
		test.setTimeout(120_000);
		const user = deviceLinkAccount(testInfo);
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
				await signIn(trusted, user);
				await finishVaultOnboarding(trusted);
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
				await signIn(firefoxDevice, user);
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
				await signIn(webkitDevice, user);
				await expect(
					webkitDevice.getByText("Pick a device that is open and unlocked"),
				).toBeVisible({ timeout: 20000 });
				await webkitDevice
					.locator('wa-button[data-device-label^="Firefox"]')
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
