import { expect, test } from "@playwright/test";

test("sign in page loads", async ({ page }) => {
	await page.goto("/auth/signin");
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
	await expect(page.getByText(/^v\d+\.\d+\.\d+$/)).toBeVisible();
});
