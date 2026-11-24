import { expect, type Locator, test } from "@playwright/test";
import { onboard, testAccount } from "./helpers";

const fillAndVerify = async (input: Locator, value: string) => {
	await expect
		.poll(
			async () => {
				if ((await input.inputValue()) === value) return true;
				await input.fill(value);
				return false;
			},
			{ timeout: 15_000 },
		)
		.toBe(true);
};

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
	await fillAndVerify(displayName, "Renamed Tester");
	await displayName.press("Tab");
	await expect(
		page.getByRole("button", { name: /Renamed Tester/ }).first(),
	).toBeVisible({ timeout: 15_000 });

	await dialog
		.getByRole("button", { name: /Workspace/ })
		.first()
		.click();
	const workspaceName = dialog.getByLabel("Workspace name");
	await fillAndVerify(workspaceName, "Renamed Workspace");
	await workspaceName.press("Tab");
	await expect(
		page.getByRole("button", { name: /Renamed Workspace/ }).first(),
	).toBeVisible({ timeout: 15_000 });
});
