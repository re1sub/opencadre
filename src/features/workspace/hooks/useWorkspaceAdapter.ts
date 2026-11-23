import { createEffect, createSignal, onCleanup } from "solid-js";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import { workspaceFieldAad } from "#/features/crypto/vault";
import type { Tables } from "#/types/database";
import { nowIso } from "#/utils/date";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import type { PageKind, Workspace } from "../types";

type WorkspaceRow = Tables<"workspaces">;

const toWorkspace = (
	row: WorkspaceRow,
	name: string,
	description: string | null,
) => ({
	id: row.id,
	name,
	description: description ?? undefined,
	defaultPageKind: row.default_page_kind as PageKind,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

export function useWorkspaceAdapter() {
	const vault = useVault();
	const [workspaces, setWorkspaces] = createSignal<Workspace[]>([]);
	const [activeWorkspaceId, setActiveWorkspaceId] = createSignal<string>("");
	const [loaded, setLoaded] = createSignal(false);

	const openName = async (row: WorkspaceRow): Promise<string> => {
		if (!row.name_ciphertext) {
			const err = new VaultDecryptionError(
				"This workspace does not have an encrypted name yet.",
			);
			reportDecryptionError(`${row.id}:name`, err);
			throw err;
		}
		return vault.openTextSafe(
			row.id,
			row.name_ciphertext,
			workspaceFieldAad(row.id, "name"),
			"name",
		);
	};

	const openDescription = async (row: WorkspaceRow): Promise<string | null> => {
		if (!row.description_ciphertext) return null;
		return vault.openTextSafe(
			row.id,
			row.description_ciphertext,
			workspaceFieldAad(row.id, "description"),
			"description",
		);
	};

	const unregister = registerRealtimeHandlers("workspaces", {
		applyInsert: (row) => {
			const r = row as unknown as WorkspaceRow;
			if (workspaces().some((w) => w.id === r.id)) return;
			void Promise.all([openName(r), openDescription(r)])
				.then(([name, description]) => {
					setWorkspaces((prev) =>
						prev.some((w) => w.id === r.id)
							? prev
							: [...prev, toWorkspace(r, name, description)],
					);
				})
				.catch(() => {});
		},
		applyUpdate: (row) => {
			const r = row as unknown as WorkspaceRow;
			void Promise.all([openName(r), openDescription(r)])
				.then(([name, description]) => {
					setWorkspaces((prev) =>
						prev.map((w) =>
							w.id === r.id ? toWorkspace(r, name, description) : w,
						),
					);
				})
				.catch(() => {});
		},
		applyDelete: (row) => {
			setWorkspaces((prev) => prev.filter((w) => w.id !== row.id));
		},
	});

	onCleanup(unregister);

	const fetchWorkspaces = async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const { data: memberships, error: memberError } = await supabase
			.from("workspace_members")
			.select("workspace_id")
			.eq("user_id", user.id);
		if (memberError) throw memberError;

		if (!memberships || memberships.length === 0) {
			setLoaded(true);
			return;
		}

		const workspaceIds = memberships.map((m) => m.workspace_id);
		const { data: wsData, error: wsError } = await supabase
			.from("workspaces")
			.select("*")
			.in("id", workspaceIds)
			.order("created_at", { ascending: true });
		if (wsError) throw wsError;

		const mapped: Workspace[] = [];
		for (const row of wsData) {
			try {
				mapped.push(
					toWorkspace(row, await openName(row), await openDescription(row)),
				);
			} catch {
				// The field error is already reported by openTextSafe.
			}
		}
		setWorkspaces(mapped);
		if (!activeWorkspaceId() && mapped.length > 0) {
			setActiveWorkspaceId(mapped[0].id);
		}
		setLoaded(true);
	};

	createEffect(() => {
		const status = vault.status();
		vault.epoch();
		if (status !== "unlocked") {
			setWorkspaces([]);
			return;
		}
		void fetchWorkspaces();
	});

	const activeWorkspace = () =>
		workspaces().find((w) => w.id === activeWorkspaceId()) ?? null;

	const addWorkspace = async (name?: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return null;

		const workspaceId = crypto.randomUUID();
		const workspaceName = name ?? "Untitled workspace";

		const { data: workspace, error } = await supabase
			.from("workspaces")
			.insert({
				id: workspaceId,
				owner_id: user.id,
			})
			.select()
			.single();
		if (error) throw error;

		// Key creation, nonce reservation, and the sealed-name update all check
		// RLS against the caller's membership, so it must exist first.
		const { error: memberError } = await supabase
			.from("workspace_members")
			.insert({
				workspace_id: workspace.id,
				user_id: user.id,
				email: user.email ?? "",
				role: "owner",
			});
		if (memberError && memberError.code !== "23505") throw memberError;

		const available = await vault.ensureWorkspaceKey(workspace.id);
		if (!available) {
			throw new Error("Could not create the workspace encryption key");
		}

		const sealedName = await vault.sealText(
			workspace.id,
			workspaceName,
			workspaceFieldAad(workspace.id, "name"),
		);
		const { error: nameError } = await supabase
			.from("workspaces")
			.update({ name_ciphertext: sealedName })
			.eq("id", workspace.id);
		if (nameError) throw nameError;

		const mapped = toWorkspace(
			{ ...workspace, name_ciphertext: sealedName },
			workspaceName,
			null,
		);
		setWorkspaces((prev) => [
			...prev.filter((entry) => entry.id !== mapped.id),
			mapped,
		]);
		return mapped;
	};

	const removeWorkspace = async (id: string) => {
		const target = workspaces().find((w) => w.id === id);
		const remaining = workspaces().filter((w) => w.id !== id);

		const { error } = await supabase.from("workspaces").delete().eq("id", id);
		if (error) throw error;

		setWorkspaces(remaining);
		if (activeWorkspaceId() === id) {
			setActiveWorkspaceId(remaining[0]?.id ?? "");
		}

		return target ?? null;
	};

	const renameWorkspace = async (id: string, name: string) => {
		const sealed = await vault.sealText(
			id,
			name,
			workspaceFieldAad(id, "name"),
		);
		const { error } = await supabase
			.from("workspaces")
			.update({ name_ciphertext: sealed })
			.eq("id", id);
		if (error) throw error;

		setWorkspaces((prev) =>
			prev.map((w) => (w.id === id ? { ...w, name, updatedAt: nowIso() } : w)),
		);
	};

	const updateWorkspace = async (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => {
		const update: {
			name_ciphertext?: string;
			description_ciphertext?: string | null;
			default_page_kind?: PageKind;
		} = {};
		if (fields.name !== undefined) {
			update.name_ciphertext = await vault.sealText(
				id,
				fields.name,
				workspaceFieldAad(id, "name"),
			);
		}
		if (fields.description !== undefined) {
			update.description_ciphertext =
				fields.description === null || fields.description === ""
					? null
					: await vault.sealText(
							id,
							fields.description,
							workspaceFieldAad(id, "description"),
						);
		}
		if (fields.defaultPageKind !== undefined)
			update.default_page_kind = fields.defaultPageKind;

		if (Object.keys(update).length === 0) return;

		const { error } = await supabase
			.from("workspaces")
			.update(update)
			.eq("id", id);
		if (error) throw error;

		setWorkspaces((prev) =>
			prev.map((w) =>
				w.id === id
					? {
							...w,
							name: fields.name ?? w.name,
							description:
								fields.description === null
									? undefined
									: (fields.description ?? w.description),
							defaultPageKind: fields.defaultPageKind ?? w.defaultPageKind,
							updatedAt: nowIso(),
						}
					: w,
			),
		);
	};

	return {
		workspaces,
		activeWorkspaceId,
		setActiveWorkspaceId,
		activeWorkspace,
		addWorkspace,
		removeWorkspace,
		renameWorkspace,
		updateWorkspace,
		setWorkspaces,
		loaded,
	};
}
