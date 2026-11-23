import { expect, test } from "@playwright/test";

const devEmails: Record<string, string> = {
	chromium: "dev@opencadre.local",
	firefox: "dev-firefox@opencadre.local",
	webkit: "dev-webkit@opencadre.local",
};

test("dev account signs in and unlocks a new vault", async ({
	page,
}, testInfo) => {
	const email = devEmails[testInfo.project.name];
	if (!email)
		throw new Error(`No seeded dev user for ${testInfo.project.name}`);

	await page.goto("/auth/signin");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password", { exact: true }).fill("dev-password-123");
	await page.getByRole("button", { name: "Sign in", exact: true }).click();

	await expect(page).toHaveURL(/\/workspace/);
	await expect(
		page.getByRole("heading", { name: "Save your recovery code" }),
	).toBeVisible({ timeout: 15000 });
	await expect(page.locator("code")).toContainText(
		/[0-9A-Z]{4}(-[0-9A-Z]{4}){7}/,
	);

	await page.getByRole("button", { name: "I saved it" }).click();
	await expect(
		page.getByRole("heading", { name: "Create your first workspace" }),
	).toBeVisible();
});
