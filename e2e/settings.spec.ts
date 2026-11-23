import { expect, test } from "@playwright/test";
import { onboard, testAccount } from "./helpers";

test("settings update the display name and workspace name", async ({
	page,
}, testInfo) => {
	test.setTimeout(120_000);
	const user = testAccount(testInfo, 13);
	await onboard(page, user, "Settings E2E");

	await page.getByRole("button", { name: user.email }).click();
	await page.getByRole("menuitem", { name: /Settings/ }).click();
	const dialog = page.locator("wa-dialog");

	const displayName = dialog.getByLabel("Display name");
	await displayName.fill("");
	await displayName.pressSequentially("Renamed Tester");
	try {
		await expect(displayName).toHaveValue("Renamed Tester", {
			timeout: 5_000,
		});
	} catch {
		await displayName.fill("");
		await displayName.pressSequentially("Renamed Tester");
		await expect(displayName).toHaveValue("Renamed Tester");
	}
	await displayName.press("Tab");
	await expect(
		page.getByRole("button", { name: /Renamed Tester/ }).first(),
	).toBeVisible({ timeout: 15_000 });

	await dialog
		.getByRole("button", { name: /Workspace/ })
		.first()
		.click();
	const workspaceName = dialog.getByLabel("Workspace name");
	await workspaceName.fill("");
	await workspaceName.pressSequentially("Renamed Workspace");
	try {
		await expect(workspaceName).toHaveValue("Renamed Workspace", {
			timeout: 5_000,
		});
	} catch {
		await workspaceName.fill("");
		await workspaceName.pressSequentially("Renamed Workspace");
		await expect(workspaceName).toHaveValue("Renamed Workspace");
	}
	await workspaceName.press("Tab");
	await expect(
		page.getByRole("button", { name: /Renamed Workspace/ }).first(),
	).toBeVisible({ timeout: 15_000 });
});
