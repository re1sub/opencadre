import { expect, test } from "@playwright/test";
import { addPage, confirmDelete, onboard, testAccount } from "./helpers";

test("pages of every kind can be created, deleted, and restored", async ({
	page,
}, testInfo) => {
	test.setTimeout(120_000);
	const user = testAccount(testInfo, 3);
	await onboard(page, user, "Pages E2E");

	await addPage(page, "Page (Markdown)", "Notes");
	await expect(page.locator("main .tiptap")).toBeVisible();

	await addPage(page, "Board (Kanban)", "Tasks");
	await expect(
		page.getByRole("button", { name: "+ Add column" }),
	).toBeVisible();

	await addPage(page, "Table", "Data");

	await page.getByRole("link", { name: /Notes/ }).click();
	const notesOptions = page.getByRole("button", { name: "Options for Notes" });
	await notesOptions.locator("button").first().click();
	await notesOptions.getByText("Delete page", { exact: true }).click();
	await confirmDelete(page);
	await expect(page.getByRole("link", { name: /Notes/ })).toHaveCount(0);

	await page.getByRole("button", { name: user.email }).click();
	await page.getByRole("menuitem", { name: /Trash/ }).click();
	await expect(page.getByText("Notes", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Restore" }).click();
	await expect(page.getByRole("link", { name: /Notes/ })).toBeVisible();
});
