import { createEffect, createSignal, onCleanup } from "solid-js";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import { tagAad } from "#/features/crypto/vault";
import type { Tables } from "#/types/database";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import type { Tag } from "../types";

type TagRow = Tables<"tags">;

const toTag = (row: TagRow, name: string): Tag => ({
	id: row.id,
	name,
	color: row.color,
	createdAt: row.created_at,
});

export function useWorkspaceTagsAdapter(workspaceId: () => string) {
	const vault = useVault();
	const [tags, setTags] = createSignal<Tag[]>([]);

	const openName = async (workspace: string, row: TagRow): Promise<string> => {
		if (!workspace) {
			const err = new VaultDecryptionError("Missing workspace for this tag.");
			reportDecryptionError(`unknown:tag:${row.id}`, err);
			throw err;
		}
		return vault.openTextSafe(
			workspace,
			row.ciphertext,
			tagAad(row.id),
			`tag:${row.id}`,
		);
	};

	const upsertTag = async (row: TagRow) => {
		const wsId = workspaceId();
		if (!wsId) return;
		const tag = toTag(row, await openName(wsId, row));
		setTags((prev) => [...prev.filter((t) => t.id !== tag.id), tag]);
	};

	const unregister = registerRealtimeHandlers("tags", {
		applyInsert: (row) => {
			void upsertTag(row as unknown as TagRow).catch(() => {});
		},
		applyUpdate: (row) => {
			const r = row as unknown as TagRow;
			void (async () => {
				const tag = toTag(r, await openName(workspaceId(), r));
				setTags((prev) => prev.map((t) => (t.id === r.id ? tag : t)));
			})().catch(() => {});
		},
		applyDelete: (row) => {
			setTags((prev) => prev.filter((t) => t.id !== row.id));
		},
	});

	onCleanup(unregister);

	const fetchTags = async (wsId: string) => {
		const { data, error } = await supabase
			.from("tags")
			.select("*")
			.eq("workspace_id", wsId)
			.order("created_at", { ascending: true });
		if (error) throw error;
		const opened = await Promise.all(
			(data ?? []).map(async (row) => toTag(row, await openName(wsId, row))),
		);
		setTags(opened);
	};

	createEffect(() => {
		const wsId = workspaceId();
		const status = vault.status();
		vault.epoch();
		if (!wsId) return;
		if (status !== "unlocked") {
			setTags([]);
			return;
		}
		void fetchTags(wsId).catch(() => {});
	});

	const addTag = async (name: string, color: string): Promise<Tag> => {
		const wsId = workspaceId();
		const id = crypto.randomUUID();
		const sealed = await vault.sealText(wsId, name, tagAad(id));

		const { data, error } = await supabase
			.from("tags")
			.insert({
				id,
				workspace_id: wsId,
				ciphertext: sealed,
				color,
			})
			.select("id, color, created_at")
			.single();
		if (error) throw error;

		const tag: Tag = {
			id: data.id,
			name,
			color: data.color,
			createdAt: data.created_at,
		};
		setTags((prev) => [...prev, tag]);
		return tag;
	};

	const updateTag = async (tagId: string, name: string, color: string) => {
		const sealed = await vault.sealText(workspaceId(), name, tagAad(tagId));
		const { error } = await supabase
			.from("tags")
			.update({ ciphertext: sealed, color })
			.eq("id", tagId);
		if (error) throw error;

		setTags((prev) =>
			prev.map((t) => (t.id === tagId ? { ...t, name, color } : t)),
		);
	};

	const deleteTag = async (tagId: string) => {
		const { error } = await supabase.from("tags").delete().eq("id", tagId);
		if (error) throw error;

		setTags((prev) => prev.filter((t) => t.id !== tagId));
	};

	return {
		tags,
		addTag,
		updateTag,
		deleteTag,
	};
}
