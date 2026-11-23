import { expect, test } from "@playwright/test";

const pages = [
	{ path: "/auth/signup", heading: "Create your account" },
	{ path: "/auth/forgot-password", heading: "Forgot password" },
	{ path: "/privacy", heading: "Privacy Policy" },
	{ path: "/terms", heading: "Terms & Conditions" },
];

test("public pages render", async ({ page }) => {
	for (const { path, heading } of pages) {
		await page.goto(path);
		await expect(page.getByRole("heading", { name: heading })).toBeVisible();
	}
});
