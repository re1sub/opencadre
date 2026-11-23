import { render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceAdapter } from "./useWorkspaceAdapter";

const V3_SEALED =
	"v3.11111111-1111-4111-8111-111111111111.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA==";

const h = vi.hoisted(() => ({
	events: [] as string[],
	inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
	updates: [] as Array<{ table: string; payload: Record<string, unknown> }>,
	ensureWorkspaceKey: vi.fn(),
	sealText: vi.fn(),
}));

vi.mock("#/features/crypto/VaultProvider", () => ({
	useVault: () => ({
		status: () => "locked",
		epoch: () => 0,
		openText: async () => "",
		openTextSafe: async () => "",
		sealText: h.sealText,
		ensureWorkspaceKey: h.ensureWorkspaceKey,
		missingKeys: () => [],
	}),
}));

vi.mock("#/features/crypto/vault", () => ({
	workspaceFieldAad: (id: string, field: string) => `workspaces:${id}:${field}`,
}));

vi.mock("#/utils/realtime/registrar", () => ({
	registerRealtimeHandlers: () => () => {},
}));

vi.mock("#/utils/supabase", () => {
	type Row = Record<string, unknown>;

	const makeBuilder = (table: string) => {
		const builder = {
			insert: (payload: Row) => {
				h.events.push(`insert:${table}`);
				h.inserts.push({ table, payload });
				return builder;
			},
			select: () => builder,
			single: async () => ({
				data: {
					id: "ws-1",
					name_ciphertext: null,
					owner_id: "u1",
					default_page_kind: "markdown",
					created_at: "2026-01-01T00:00:00Z",
					updated_at: "2026-01-01T00:00:00Z",
				},
				error: null,
			}),
			update: (payload: Row) => {
				h.events.push(`update:${table}`);
				h.updates.push({ table, payload });
				return builder;
			},
			eq: () => builder,
		};
		return builder;
	};

	return {
		supabase: {
			auth: {
				getUser: async () => ({
					data: { user: { id: "u1", email: "owner@example.com" } },
				}),
			},
			from: (table: string) => makeBuilder(table),
		},
	};
});

let hook: ReturnType<typeof useWorkspaceAdapter> | null = null;

const Probe = () => {
	hook = useWorkspaceAdapter();
	return null;
};

beforeEach(() => {
	h.events = [];
	h.inserts = [];
	h.updates = [];
	h.ensureWorkspaceKey.mockReset();
	h.sealText.mockReset();
	h.ensureWorkspaceKey.mockImplementation(async () => {
		h.events.push("ensure");
		return true;
	});
	h.sealText.mockImplementation(async () => {
		h.events.push("seal");
		return V3_SEALED;
	});
});

describe("useWorkspaceAdapter.addWorkspace", () => {
	it("creates membership before the key and sealed name so RLS allows the writes", async () => {
		render(() => <Probe />);

		const workspace = await hook?.addWorkspace("My workspace");

		expect(h.events).toEqual([
			"insert:workspaces",
			"insert:workspace_members",
			"ensure",
			"seal",
			"update:workspaces",
		]);
		expect(workspace?.name).toBe("My workspace");
		expect(h.inserts[0]?.payload.name_ciphertext).toBeUndefined();
		expect(h.updates[0]?.payload.name_ciphertext).toBe(V3_SEALED);
	});
});
