import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test("landing page renders all sections", async ({ page }) => {
	await page.goto("/");
	await waitForAppReady(page);
	const hero = page
		.locator("h1")
		.filter({ hasText: "Boards, notes, and tasks" });
	try {
		await hero.waitFor({ state: "visible", timeout: 15_000 });
	} catch {
		// Vite can serve the shell before its lazy route module is ready.
		await page.reload();
		await waitForAppReady(page);
		await hero.waitFor({ state: "visible", timeout: 30_000 });
	}
	await expect(hero).toContainText("Boards, notes, and tasks. Organized.");
	await expect(hero.locator("xpath=..")).toHaveCSS("opacity", "1", {
		timeout: 30_000,
	});

	const features = page
		.getByRole("heading", { name: "Less overhead, more done" })
		.locator("xpath=../..");
	await features.scrollIntoViewIfNeeded();
	await expect(features).toHaveCSS("opacity", "1", { timeout: 15_000 });

	const download = page
		.getByRole("heading", { name: "Take your boards with you" })
		.locator("xpath=../..");
	await download.scrollIntoViewIfNeeded();
	await expect(download).toHaveCSS("opacity", "1", { timeout: 15_000 });

	const appScreenshot = page.getByAltText("OpenCadre app").locator("xpath=..");
	await appScreenshot.scrollIntoViewIfNeeded();
	await expect(appScreenshot).toHaveCSS("opacity", "1", { timeout: 15_000 });
});
