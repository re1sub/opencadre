import { supabase } from "#/utils/supabase";
import { aadFor } from "./aad";
import {
	openEnvelope,
	PLAINTEXT_CAPS,
	parseEnvelope,
	sealEnvelope,
} from "./envelope";

export interface RotationBatchRow {
	record_key: string;
	table_name: string;
	row_id: string;
	secondary_id: string | null;
	field: string;
	ciphertext: string;
}

export interface RotationRow {
	id: string;
	workspace_id: string;
	from_key_id: string;
	to_key_id: string;
	status: string;
	processed_count: number;
	last_record_key: string;
	total_count: number;
	error_code: string | null;
}

export interface RotationKeyAccess {
	keyFor: (keyId: string) => Promise<CryptoKey | null>;
	nonceFor: (keyId: string) => Promise<string>;
}

const capFor = (tableName: string): number => {
	if (tableName === "page_content") return PLAINTEXT_CAPS.page;
	if (tableName === "ydocs") return PLAINTEXT_CAPS.ydoc;
	if (tableName === "comments") return PLAINTEXT_CAPS.comment;
	return PLAINTEXT_CAPS.short;
};

const aadForRow = (row: RotationBatchRow, workspaceId: string): string => {
	switch (row.table_name) {
		case "workspaces":
			return aadFor({ kind: "workspace", workspaceId, field: row.field });
		case "pages":
			return aadFor({ kind: "page-title", pageId: row.row_id });
		case "page_content":
			return aadFor({ kind: "page", pageId: row.secondary_id ?? "" });
		case "tags":
			return aadFor({ kind: "tag", tagId: row.row_id });
		case "columns":
			return aadFor({ kind: "column", columnId: row.row_id });
		case "cards":
			return aadFor({ kind: "card", cardId: row.row_id });
		case "comments":
			return aadFor({ kind: "comment", commentId: row.row_id });
		case "notifications":
			return aadFor({
				kind: "notification",
				workspaceId,
				commentId: row.secondary_id ?? "",
				field: row.field,
			});
		case "ydocs": {
			const [entityType, entityId] = (row.secondary_id ?? "").split(":");
			return aadFor({ kind: "ydoc", entityType, entityId });
		}
		default:
			throw new Error(`Unknown rotation table ${row.table_name}`);
	}
};

const updateColumn = (row: RotationBatchRow): string => {
	if (row.table_name === "notifications") {
		return row.field === "title" ? "title_ciphertext" : "body_ciphertext";
	}
	if (row.table_name === "workspaces") {
		return row.field === "name" ? "name_ciphertext" : "description_ciphertext";
	}
	if (row.table_name === "pages") return "title_ciphertext";
	if (row.table_name === "ydocs") return "state";
	return "ciphertext";
};

export async function getActiveRotation(
	workspaceId: string,
): Promise<RotationRow | null> {
	const { data, error } = await supabase
		.from("key_rotations")
		.select(
			"id, workspace_id, from_key_id, to_key_id, status, processed_count, last_record_key, total_count, error_code",
		)
		.eq("workspace_id", workspaceId)
		.in("status", ["pending", "running"])
		.maybeSingle();
	if (error) throw error;
	return (data as unknown as RotationRow | null) ?? null;
}

export async function getFailedRotation(
	workspaceId: string,
): Promise<RotationRow | null> {
	const { data, error } = await supabase
		.from("key_rotations")
		.select(
			"id, workspace_id, from_key_id, to_key_id, status, processed_count, last_record_key, total_count, error_code",
		)
		.eq("workspace_id", workspaceId)
		.eq("status", "failed")
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return (data as unknown as RotationRow | null) ?? null;
}

export async function runRotation(
	rotation: RotationRow,
	access: RotationKeyAccess,
): Promise<void> {
	const oldKey = await access.keyFor(rotation.from_key_id);
	const newKey = await access.keyFor(rotation.to_key_id);
	if (!oldKey || !newKey) throw new Error("A rotation key is not available");

	let after = rotation.last_record_key;
	let processed = rotation.processed_count;

	for (;;) {
		const { data: batch, error } = await supabase.rpc("rotation_batch", {
			p_workspace_id: rotation.workspace_id,
			p_after: after,
			p_limit: 50,
		});
		if (error) throw error;
		const rows = (batch ?? []) as unknown as RotationBatchRow[];
		if (rows.length === 0) break;

		for (const row of rows) {
			processed += 1;
			after = row.record_key;
			if (parseEnvelope(row.ciphertext).keyId !== rotation.from_key_id)
				continue;

			const plain = await openEnvelope(
				row.ciphertext,
				oldKey,
				aadForRow(row, rotation.workspace_id),
			);
			const iv = await access.nonceFor(rotation.to_key_id);
			const resealed = await sealEnvelope(
				rotation.to_key_id,
				newKey,
				plain,
				aadForRow(row, rotation.workspace_id),
				capFor(row.table_name),
				Uint8Array.from(atob(iv), (char) => char.charCodeAt(0)),
			);
			const column = updateColumn(row);
			const { data: updated, error: updateError } = await supabase
				.from(row.table_name as "cards")
				.update({ [column]: resealed } as never)
				.eq("id", row.row_id)
				.eq(column, row.ciphertext)
				.select("id");
			if (updateError) throw updateError;
			if (!updated || updated.length === 0) continue;
		}

		const { error: ackError } = await supabase.rpc("ack_rotation_batch", {
			p_rotation_id: rotation.id,
			p_last_record_key: after,
			p_processed_count: processed,
		});
		if (ackError) throw ackError;
	}

	const { error: completeError } = await supabase.rpc("complete_rotation", {
		p_rotation_id: rotation.id,
	});
	if (completeError) throw completeError;
}
