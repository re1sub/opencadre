import { expect, test } from "@playwright/test";
import {
	onboard,
	signIn,
	testAccount,
	unlockWithRecoveryCode,
} from "./helpers";

test("recovery code unlocks a new device and a link can be rejected", async ({
	browser,
}, testInfo) => {
	test.setTimeout(120_000);
	const user = testAccount(testInfo, 2);
	const workspace = "Vault Recovery E2E";

	const trustedContext = await browser.newContext();
	const trusted = await trustedContext.newPage();
	const recoveryCode = await onboard(trusted, user, workspace);

	const newContext = await browser.newContext({
		userAgent: "Playwright recovery-code device",
	});
	const newDevice = await newContext.newPage();
	await signIn(newDevice, user);
	await expect(newDevice.getByText("Waiting for approval on")).toBeVisible({
		timeout: 20000,
	});

	await expect(trusted.getByRole("button", { name: "Reject" })).toBeVisible({
		timeout: 20000,
	});
	await trusted.getByRole("button", { name: "Reject" }).click();
	await expect(newDevice.getByText("That request was rejected.")).toBeVisible({
		timeout: 20000,
	});

	await unlockWithRecoveryCode(newDevice, recoveryCode);
	await expect(newDevice.getByRole("heading", { name: workspace })).toBeVisible(
		{ timeout: 20000 },
	);

	await newContext.close();
	await trustedContext.close();
});
