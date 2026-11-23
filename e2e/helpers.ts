import { expect, type Page, type TestInfo } from "@playwright/test";

export const PASSWORD = "dev-password-123";

export interface E2EAccount {
	email: string;
	password: string;
}

export const account = (index: number): E2EAccount => ({
	email: `e2e-${String(index).padStart(3, "0")}@opencadre.local`,
	password: PASSWORD,
});

const waitForSupabaseWrite = (
	page: Page,
	table: string,
	bodyIncludes?: string,
) =>
	page.waitForResponse((response) => {
		if (!new URL(response.url()).pathname.endsWith(`/rest/v1/${table}`)) {
			return false;
		}
		if (!["POST", "PATCH", "PUT"].includes(response.request().method())) {
			return false;
		}
		if (!bodyIncludes) return true;
		return (response.request().postData() ?? "")
			.replace(/\s/g, "")
			.includes(bodyIncludes);
	});

export const waitForYdocPersist = (
	page: Page,
	entityType: "markdown" | "table" | "kanban",
) => waitForSupabaseWrite(page, "ydocs", `"entity_type":"${entityType}"`);

export const waitForCardPersist = (page: Page) =>
	waitForSupabaseWrite(page, "cards");

export const waitForPageTitlePersist = (page: Page) =>
	waitForSupabaseWrite(page, "pages");

const PROJECT_OFFSETS: Record<string, number> = {
	chromium: 0,
	firefox: 1,
	webkit: 2,
};

const RETRY_STRIDE = 65;

const retryOffset = (testInfo: TestInfo) => testInfo.retry * RETRY_STRIDE;

/**
 * Give every test execution and retry its own seeded account so a retry never
 * inherits a vault, workspace, or trusted device from the failed attempt.
 */
export const testAccount = (testInfo: TestInfo, slot: number): E2EAccount =>
	account(
		5 +
			(slot - 1) * 3 +
			(PROJECT_OFFSETS[testInfo.project.name] ?? 0) +
			retryOffset(testInfo),
	);

/**
 * Extra users for tests that need an invitee, a second collaborator, or a
 * removable member. These occupy a separate band of the seeded pool for every
 * retry attempt so they never overlap primary or earlier-attempt accounts.
 */
export const secondaryAccount = (
	testInfo: TestInfo,
	role: number,
): E2EAccount =>
	account(
		47 +
			(role - 1) * 3 +
			(PROJECT_OFFSETS[testInfo.project.name] ?? 0) +
			retryOffset(testInfo),
	);

export const signIn = async (page: Page, user: E2EAccount) => {
	await page.goto("/auth/signin");
	await page.getByLabel("Email").fill(user.email);
	await page.getByLabel("Password", { exact: true }).fill(user.password);
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	await expect(page).toHaveURL(/\/workspace/);
};

export const finishVaultOnboarding = async (page: Page) => {
	const recoveryHeading = page.getByRole("heading", {
		name: "Save your recovery code",
	});
	try {
		await expect(recoveryHeading).toBeVisible({ timeout: 15000 });
	} catch (cause) {
		const reload = page.getByRole("button", { name: "Reload page" });
		if (!(await reload.isVisible())) throw cause;
		await reload.click();
		await expect(recoveryHeading).toBeVisible({ timeout: 15000 });
	}
	const recoveryCode = (await page.locator("code").innerText()).trim();
	await page.getByRole("button", { name: "I saved it" }).click();
	return recoveryCode;
};

export const unlockWithRecoveryCode = async (page: Page, code: string) => {
	await page
		.getByRole("button", { name: "Use a recovery code instead" })
		.click();
	await page.getByLabel("Recovery code").fill(code);
	await page.getByRole("button", { name: "Unlock with recovery code" }).click();
};

export const onboard = async (
	page: Page,
	user: E2EAccount,
	workspaceName: string,
) => {
	await signIn(page, user);
	const recoveryCode = await finishVaultOnboarding(page);
	await expect(
		page.getByRole("heading", { name: "Create your first workspace" }),
	).toBeVisible();
	await page.getByLabel("Workspace name").fill(workspaceName);
	await page.getByRole("button", { name: "Create workspace" }).click();
	await expect(
		page.getByRole("heading", { name: workspaceName }),
	).toBeVisible();
	return recoveryCode;
};

const PAGE_KINDS = new Set(["Page (Markdown)", "Board (Kanban)", "Table"]);

const pageViewReady = (page: Page, kindLabel: string) => {
	switch (kindLabel) {
		case "Page (Markdown)":
			return page.locator("main .tiptap");
		case "Board (Kanban)":
			return page.getByRole("button", { name: "+ Add column" });
		case "Table":
			return page.locator(".st-header-cell").first();
		default:
			throw new Error(`Unsupported page kind: ${kindLabel}`);
	}
};

export const addPage = async (page: Page, kindLabel: string, title: string) => {
	if (!PAGE_KINDS.has(kindLabel)) {
		throw new Error(`Unsupported page kind: ${kindLabel}`);
	}

	await page.getByRole("button", { name: "Choose template" }).click();
	const menu = page.getByRole("menu");
	await expect(menu).toBeVisible();
	const templateItem = page
		.getByRole("menuitem")
		.filter({ hasText: kindLabel });
	await expect(templateItem).toBeVisible({ timeout: 15_000 });
	await templateItem.click();
	await expect(page).toHaveURL(/\/workspace\/p\//, { timeout: 15_000 });
	await expect(pageViewReady(page, kindLabel)).toBeVisible({ timeout: 15_000 });

	const titleInput = page
		.locator('wa-input[aria-label="Page title"]')
		.locator("input");
	const titleHeading = page.locator("main").getByRole("heading", { level: 1 });
	await expect
		.poll(
			async () => {
				if (await titleInput.isVisible()) return true;
				await titleHeading.first().click();
				return false;
			},
			{ timeout: 15_000 },
		)
		.toBe(true);

	const titlePersisted = waitForPageTitlePersist(page);
	await titleInput.fill(title);
	await titleInput.press("Enter");
	await titlePersisted;
	await expect(
		page.getByRole("heading", { name: title, level: 1 }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: new RegExp(title) }),
	).toBeVisible();
};

export const openSettings = async (page: Page, user: E2EAccount) => {
	await page.getByRole("button", { name: user.email }).first().click();
	await page.getByRole("menuitem", { name: /Settings/ }).click();
	await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
};

export const confirmDelete = async (page: Page) => {
	await page
		.getByText("Are you sure you want to delete", { exact: false })
		.locator("xpath=..")
		.getByText("Delete", { exact: true })
		.click();
};
