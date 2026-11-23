import { render, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearDecryptionErrorsFor,
	decryptionErrors,
} from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useYjsDoc } from "./useYjsDoc";

const h = vi.hoisted(() => ({
	openBinary: vi.fn(),
	channel: vi.fn(),
	from: vi.fn(),
}));

vi.mock("#/features/crypto/VaultProvider", () => ({
	useVault: () => ({
		status: () => "unlocked",
		epoch: () => 0,
		openBinary: h.openBinary,
		sealBinary: async () => "v3.sealed",
	}),
}));

vi.mock("#/utils/supabase", () => ({
	supabase: {
		channel: h.channel,
		from: h.from,
	},
}));

const queryBuilder = () => {
	const builder: Record<string, unknown> = {};
	for (const method of ["select", "eq", "maybeSingle"]) {
		builder[method] = () => builder;
	}
	// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable.
	Object.defineProperty(builder, "then", {
		value: (
			resolve: (value: {
				data: { state: string } | null;
				error: null;
			}) => unknown,
		) =>
			Promise.resolve({
				data: { state: "v3.sealed" },
				error: null,
			}).then(resolve),
	});
	return builder;
};

let state: ReturnType<typeof useYjsDoc> | null = null;

const Probe = () => {
	state = useYjsDoc({
		entityType: () => "page",
		entityId: () => "page-1",
		workspaceId: () => "ws-1",
	});
	return <div>{state.locked() ? "locked" : "unlocked"}</div>;
};

beforeEach(() => {
	vi.clearAllMocks();
	state = null;
	clearDecryptionErrorsFor("ws-1");
	h.openBinary.mockRejectedValue(
		new VaultDecryptionError("The Yjs state was altered."),
	);
	h.from.mockImplementation(() => queryBuilder());
	const channel = {
		on: () => channel,
		subscribe: () => channel,
		unsubscribe: () => {},
	};
	h.channel.mockReturnValue(channel);
});

describe("useYjsDoc", () => {
	it("locks the document and reports a failed initial decrypt", async () => {
		render(() => <Probe />);

		await waitFor(() => expect(state?.locked()).toBe(true));
		expect(state?.doc()).toBeNull();
		expect(state?.loaded()).toBe(false);
		expect(decryptionErrors().get("ws-1:ydoc:page:page-1")).toBe(
			"The Yjs state was altered.",
		);
	});
});
