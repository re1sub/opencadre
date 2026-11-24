import { expect, test } from "@playwright/test";
import { addPage, onboard, testAccount } from "./helpers";

test("table rows, columns, and cells can be edited", async ({
	page,
}, testInfo) => {
	test.setTimeout(120_000);
	const user = testAccount(testInfo, 8);
	await onboard(page, user, "Table E2E");
	await addPage(page, "Table", "Directory");

	const headers = page.locator(".st-header-cell[data-accessor]");
	await expect(headers.first()).toBeVisible();
	const editableHeader = page
		.getByRole("columnheader")
		.filter({ has: page.getByRole("textbox") })
		.first();
	const headerInput = editableHeader.getByRole("textbox");
	await headerInput.fill("Owner");
	await headerInput.press("Enter");
	try {
		await expect(headerInput).toHaveValue("Owner", { timeout: 5_000 });
	} catch {
		await headerInput.fill("");
		await headerInput.pressSequentially("Owner");
		await headerInput.press("Enter");
		await expect(headerInput).toHaveValue("Owner", { timeout: 10_000 });
	}

	const rowButtons = page.locator(
		'.st-row-buttons[aria-label^="Actions for row"]',
	);
	const initialRowCount = await rowButtons.count();
	await page.getByRole("button", { name: "Add row" }).last().click();
	await expect(rowButtons).toHaveCount(initialRowCount + 1);

	const firstAccessor = await editableHeader.getAttribute("data-accessor");
	if (!firstAccessor) throw new Error("Header is missing data-accessor");
	const cell = page
		.locator(`.st-cell[data-accessor="${firstAccessor}"]`)
		.first();
	// SimpleTable recreates the inline editor whenever the table re-renders,
	// which background Yjs persistence can do at any point in this test. Set
	// the value and commit in one browser-side task so no re-render can land
	// between the fill and the Enter keypress, then retry until the committed
	// value is visible in the cell.
	await expect
		.poll(
			async () => {
				if ((await cell.innerText()).includes("Ada Lovelace")) return true;
				const cellInput = cell.locator("input.editable-cell-input");
				if (!(await cellInput.isVisible())) await cell.dblclick();
				return cell.evaluate((element) => {
					const input = element.querySelector<HTMLInputElement>(
						"input.editable-cell-input",
					);
					if (!input) return false;
					input.focus();
					input.value = "Ada Lovelace";
					input.dispatchEvent(
						new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
					);
					return false;
				});
			},
			{ timeout: 30_000 },
		)
		.toBe(true);

	// The add-column control lives in SimpleTable's horizontally virtualized
	// header. Scroll its scrollbar to the far right so the header cell mounts,
	// then click the custom element directly.
	await page.evaluate(() => {
		const bar = document.querySelector<HTMLElement>(
			".st-horizontal-scrollbar-middle",
		);
		if (bar) {
			bar.scrollLeft = bar.scrollWidth;
			bar.dispatchEvent(new Event("scroll", { bubbles: true }));
		}

		for (const selector of [".st-header-main", ".st-body-main"]) {
			const pane = document.querySelector<HTMLElement>(selector);
			if (!pane) continue;
			pane.scrollLeft = pane.scrollWidth;
			pane.dispatchEvent(new Event("scroll", { bubbles: true }));
		}
	});

	const addColumn = page.locator("#header-__add_column__ wa-button");
	await expect(addColumn).toBeVisible();
	const headerCountBeforeAdd = await headers.count();
	await expect
		.poll(
			async () => {
				if ((await headers.count()) > headerCountBeforeAdd) return true;
				const approval = page.locator('wa-dialog[label="Confirm it\'s you"]');
				if (await approval.isVisible()) {
					await approval.getByRole("button", { name: "Reject" }).click();
				}
				try {
					await addColumn.click({ timeout: 5_000 });
				} catch {
					// A dialog or re-render can intercept the click. The poll retries.
				}
				return false;
			},
			{ timeout: 30_000 },
		)
		.toBe(true);
});
