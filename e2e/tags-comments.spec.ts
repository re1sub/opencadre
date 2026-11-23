import { expect, test } from "@playwright/test";
import { addPage, onboard, testAccount, waitForCardPersist } from "./helpers";

test("a card can carry a workspace tag and a comment", async ({
	page,
}, testInfo) => {
	test.setTimeout(120_000);
	const user = testAccount(testInfo, 10);
	await onboard(page, user, "Tags E2E");
	await addPage(page, "Board (Kanban)", "Tagged board");

	await page.getByRole("button", { name: "+ Add column" }).click();
	const columnDialog = page.locator("wa-dialog");
	await columnDialog.getByLabel("Column name").fill("Backlog");
	await columnDialog.getByRole("button", { name: "Save" }).click();

	await page.getByRole("button", { name: "Add card" }).click();
	const newCardDialog = page.locator("wa-dialog");
	await newCardDialog
		.getByLabel("Title")
		.locator("input")
		.fill("Review access policy");
	const persisted = waitForCardPersist(page);
	await newCardDialog.getByRole("button", { name: "Create card" }).click();
	// Comments resolve the card row from the database, so wait for the card
	// write before opening the dialog.
	await persisted;
	await page
		.locator("a[data-card-id]")
		.filter({ hasText: "Review access policy" })
		.click();

	const dialog = page.locator("wa-dialog");
	await dialog.getByRole("button", { name: "Add tag" }).click();
	await dialog.getByRole("button", { name: "New tag" }).click();
	await dialog.locator('wa-input[label="Tag name"] input').fill("Urgent");
	await dialog.getByRole("button", { name: "Select #f97316" }).click();
	await dialog.getByRole("button", { name: "Create" }).click();
	await expect(dialog.getByRole("button", { name: "Urgent" })).toBeVisible();

	const commentEditor = dialog.locator('[contenteditable="true"]').last();
	await commentEditor.fill("Please review before Friday");
	await dialog.getByRole("button", { name: "Save comment" }).click();
	await expect(dialog.getByText("Please review before Friday")).toBeVisible();
});
