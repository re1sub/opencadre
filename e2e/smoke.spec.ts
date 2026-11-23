import { expect, test } from "@playwright/test";

test("app boots and guards the workspace", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Boards, notes, and tasks. Organized.",
	);

	await page.goto("/workspace");
	await expect(page).toHaveURL(/\/auth\/signin$/);
	await expect(page.getByLabel("Email")).toBeVisible();
});
