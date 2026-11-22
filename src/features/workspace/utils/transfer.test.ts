import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearDecryptionErrorsFor,
	decryptionErrors,
} from "#/features/crypto/decryptionErrors";
import type { Page, Workspace } from "#/features/workspace/types";
import { exportAllPages } from "./transfer";

const h = vi.hoisted(() => ({
	from: vi.fn(),
	downloadBlob: vi.fn(),
}));

vi.mock("#/utils/supabase", () => ({
	supabase: { from: h.from },
}));

vi.mock("#/utils/download", () => ({
	downloadBlob: h.downloadBlob,
}));

const queryBuilder = (data: unknown) => {
	const builder: Record<string, unknown> = {};
	for (const method of ["select", "eq", "order", "in"]) {
		builder[method] = () => builder;
	}
	// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
	Object.defineProperty(builder, "then", {
		value: (resolve: (value: { data: unknown; error: null }) => unknown) =>
			Promise.resolve({ data, error: null }).then(resolve),
	});
	return builder;
};

beforeEach(() => {
	vi.clearAllMocks();
	clearDecryptionErrorsFor("ws-1");
	h.from.mockImplementation((table: string) => {
		if (table === "columns") {
			return queryBuilder([
				{
					id: "col-1",
					page_id: "page-1",
					ciphertext: "v3.sealed",
					color: null,
					position: 0,
				},
			]);
		}
		return queryBuilder([]);
	});
});

describe("exportAllPages", () => {
	it("fails exports instead of writing empty decrypted fields", async () => {
		const workspace = { id: "ws-1", name: "Workspace" } as Workspace;
		const page = {
			id: "page-1",
			kind: "kanban",
			title: "Board",
			content: "[]",
		} as Page;

		await expect(
			exportAllPages(workspace, [page], async () => null),
		).rejects.toThrow("could not be decrypted");

		expect(decryptionErrors().get("ws-1:export:column:col-1")).toBeDefined();
		expect(h.downloadBlob).not.toHaveBeenCalled();
	});
});
