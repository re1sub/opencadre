import { expect, test } from "@playwright/test";

test("landing page renders all sections", async ({ page }) => {
	await page.goto("/");
	const hero = page.getByRole("heading", {
		level: 1,
		name: /Boards, notes, and tasks/,
	});
	await expect(hero).toBeVisible({ timeout: 15_000 });
	await expect(hero).toContainText("Boards, notes, and tasks. Organized.");
	await expect(hero.locator("xpath=..")).toHaveCSS("opacity", "1", {
		timeout: 15_000,
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
