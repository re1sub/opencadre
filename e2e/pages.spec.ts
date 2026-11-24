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

	const notesLink = page.getByRole("link", { name: /Notes/ });
	await notesLink.click();
	const notesId = (await notesLink.getAttribute("href"))?.split("/").pop();
	if (!notesId) throw new Error("Notes page link has no id");
	const deleteItem = page.locator(`#delete-${notesId}`);
	await expect(deleteItem).toHaveCount(1);
	await deleteItem.dispatchEvent("click");
	await confirmDelete(page);
	await expect(page.getByRole("link", { name: /Notes/ })).toHaveCount(0);

	await page.getByRole("button", { name: user.email }).click();
	await page.getByRole("menuitem", { name: /Trash/ }).click();
	await expect(page.getByText("Notes", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Restore" }).click();
	await expect(page.getByRole("link", { name: /Notes/ })).toBeVisible();
});
