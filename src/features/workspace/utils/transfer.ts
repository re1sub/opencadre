import { unzipSync, zipSync } from "fflate";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { cardAad, columnAad, tagAad } from "#/features/crypto/vault";
import type { Page, PageKind, Workspace } from "#/features/workspace/types";
import { nowIso } from "#/utils/date";
import { downloadBlob } from "#/utils/download";
import { toSlug } from "#/utils/string";
import { supabase } from "#/utils/supabase";

interface KanbanExportColumn {
	title: string;
	color: string;
	cards: {
		title: string;
		description: string;
		dueDate: string | null;
		assigneeIds: string[];
		tagNames: string[];
	}[];
}

interface PageManifestEntry {
	title: string;
	kind: PageKind;
	filename: string;
}

const slugify = toSlug;

type SealedOpener = (sealed: string, aad: string) => Promise<string | null>;

const requiredOpen = async (
	openSealed: SealedOpener | undefined,
	sealed: string,
	aad: string,
	errorKey: string,
): Promise<string> => {
	if (!openSealed) {
		const err = new VaultDecryptionError(
			"Content could not be decrypted because no unlocked key is available.",
		);
		reportDecryptionError(errorKey, err);
		throw err;
	}
	const raw = await openSealed(sealed, aad);
	if (!raw) {
		const err = new VaultDecryptionError(
			"This content could not be decrypted.",
		);
		reportDecryptionError(errorKey, err);
		throw err;
	}
	return raw;
};

const requireString = (
	value: unknown,
	label: string,
	errorKey: string,
): string => {
	if (typeof value !== "string") {
		const err = new VaultDecryptionError(`Decrypted ${label} was malformed.`);
		reportDecryptionError(errorKey, err);
		throw err;
	}
	return value;
};

const openSealedJson = async <T>(
	openSealed: SealedOpener | undefined,
	sealed: string,
	aad: string,
	workspaceId: string,
	field: string,
): Promise<T> => {
	const errorKey = `${workspaceId}:export:${field}`;
	const raw = await requiredOpen(openSealed, sealed, aad, errorKey);
	try {
		return JSON.parse(raw) as T;
	} catch {
		const err = new VaultDecryptionError(
			"Decrypted board metadata was malformed.",
		);
		reportDecryptionError(errorKey, err);
		throw err;
	}
};

const fetchKanbanBoard = async (
	pageId: string,
	workspaceId: string,
	openSealed: SealedOpener | undefined,
): Promise<KanbanExportColumn[]> => {
	const { data: colData, error: colError } = await supabase
		.from("columns")
		.select("*")
		.eq("page_id", pageId)
		.order("position", { ascending: true });
	if (colError) throw colError;

	const { data: cardData, error: cardError } = await supabase
		.from("cards")
		.select("*, card_tags(tag_id)")
		.eq("page_id", pageId)
		.order("position", { ascending: true });
	if (cardError) throw cardError;

	const { data: tagData, error: tagError } = await supabase
		.from("tags")
		.select("id, ciphertext");
	if (tagError) throw tagError;

	const tagNameById = new Map<string, string>();
	for (const tag of tagData ?? []) {
		const name = await requiredOpen(
			openSealed,
			tag.ciphertext,
			tagAad(tag.id),
			`${workspaceId}:export:tag:${tag.id}`,
		);
		tagNameById.set(tag.id, name);
	}

	const columnsById = new Map<string, KanbanExportColumn>();
	for (const col of colData ?? []) {
		const errorKey = `${workspaceId}:export:column:${col.id}`;
		const meta = await openSealedJson<{ title?: unknown }>(
			openSealed,
			col.ciphertext,
			columnAad(col.id),
			workspaceId,
			`column:${col.id}`,
		);
		columnsById.set(col.id, {
			title: requireString(meta.title, "column title", errorKey),
			color: col.color ?? "",
			cards: [],
		});
	}

	for (const card of cardData ?? []) {
		const column = columnsById.get(card.column_id);
		if (!column) continue;
		const tagNames = (card.card_tags ?? [])
			.map((ct: { tag_id: string }) => tagNameById.get(ct.tag_id))
			.filter((name): name is string => Boolean(name));
		const errorKey = `${workspaceId}:export:card:${card.id}`;
		const meta = await openSealedJson<{
			title?: unknown;
			description?: unknown;
		}>(
			openSealed,
			card.ciphertext,
			cardAad(card.id),
			workspaceId,
			`card:${card.id}`,
		);
		column.cards.push({
			title: requireString(meta.title, "card title", errorKey),
			description: requireString(
				meta.description,
				"card description",
				errorKey,
			),
			dueDate: card.due_date,
			assigneeIds: card.assignee_ids ?? [],
			tagNames,
		});
	}

	return Array.from(columnsById.values());
};

export const exportAllPages = async (
	workspace: Workspace,
	pages: Page[],
	openSealed?: SealedOpener,
) => {
	const manifest: PageManifestEntry[] = [];
	const files: Record<string, Uint8Array> = {};

	for (const [index, page] of pages.entries()) {
		const n = index + 1;
		let filename: string;
		let payload: string;

		if (page.kind === "markdown") {
			filename = `pages/${n}.md`;
			payload = page.content;
		} else if (page.kind === "table") {
			filename = `pages/${n}.json`;
			payload = page.content;
		} else {
			filename = `pages/${n}-kanban.json`;
			const board = await fetchKanbanBoard(page.id, workspace.id, openSealed);
			payload = JSON.stringify(board, null, 2);
		}

		manifest.push({ title: page.title, kind: page.kind, filename });
		files[filename] = new TextEncoder().encode(payload);
	}

	files["pages.json"] = new TextEncoder().encode(
		JSON.stringify(manifest, null, 2),
	);
	files["workspace.json"] = new TextEncoder().encode(
		JSON.stringify(
			{
				name: workspace.name,
				workspaceId: workspace.id,
				exportedAt: nowIso(),
			},
			null,
			2,
		),
	);

	const zipped = zipSync(files, { level: 6 });
	downloadBlob(
		new Blob([zipped], { type: "application/zip" }),
		`${slugify(workspace.name)}-pages.zip`,
	);
};

const parseKanbanBoard = (raw: string): KanbanExportColumn[] => {
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed)) return [];
	return parsed.map((col) => ({
		title: col.title ?? "",
		color: col.color ?? "",
		cards: (col.cards ?? []).map((card: Record<string, unknown>) => ({
			title: card.title ?? "",
			description: card.description ?? "",
			dueDate: card.dueDate ?? null,
			assigneeIds: card.assigneeIds ?? [],
			tagNames: card.tagNames ?? [],
		})),
	}));
};

const uniqueTitle = (title: string, existing: Set<string>): string => {
	if (!existing.has(title)) return title;
	let n = 2;
	while (existing.has(`${title} (${n})`)) n += 1;
	return `${title} (${n})`;
};
export const importAllPages = async (
	file: File,
	options: {
		workspaceId: string;
		addPage: (
			kind: PageKind,
			opts?: { title?: string; content?: string },
		) => Promise<Page>;
		sealText: (text: string, aad: string) => Promise<string>;
		openSealed: (sealed: string, aad: string) => Promise<string | null>;
	},
): Promise<number> => {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch {
		throw new Error("The selected file is not a valid pages archive.");
	}

	const decode = (path: string): string =>
		new TextDecoder().decode(unzipped[path]);

	const manifest = JSON.parse(decode("pages.json")) as PageManifestEntry[];
	const existingTitles = new Set<string>();

	let imported = 0;

	for (const entry of manifest) {
		let content: string;
		let board: KanbanExportColumn[] | undefined;

		if (entry.kind === "kanban") {
			board = parseKanbanBoard(decode(entry.filename));
			content = board ? JSON.stringify(board) : "";
		} else {
			content = decode(entry.filename);
		}

		const title = uniqueTitle(entry.title, existingTitles);
		const page = await options.addPage(entry.kind, { title, content });
		existingTitles.add(title);

		if (entry.kind === "kanban" && board) {
			await importKanbanBoard(
				options.workspaceId,
				page.id,
				board,
				options.sealText,
				options.openSealed,
			);
		}

		imported += 1;
	}

	return imported;
};

const importKanbanBoard = async (
	workspaceId: string,
	pageId: string,
	board: KanbanExportColumn[],
	sealText: (text: string, aad: string) => Promise<string>,
	openSealed: (sealed: string, aad: string) => Promise<string | null>,
) => {
	const normalized = board.map((col) => ({
		...col,
		cards: col.cards.map((card) => ({
			...card,
			title: card.title.trim(),
		})),
	}));

	const { data: existingTags, error: tagFetchError } = await supabase
		.from("tags")
		.select("id, ciphertext")
		.eq("workspace_id", workspaceId);
	if (tagFetchError) throw tagFetchError;

	const tagIdByName = new Map<string, string>();
	for (const tag of existingTags ?? []) {
		const name = await requiredOpen(
			openSealed,
			tag.ciphertext,
			tagAad(tag.id),
			`${workspaceId}:import:tag:${tag.id}`,
		);
		tagIdByName.set(name, tag.id);
	}

	const ensureTag = async (name: string): Promise<string> => {
		const existing = tagIdByName.get(name);
		if (existing) return existing;
		const tagId = crypto.randomUUID();
		const sealed = await sealText(name, tagAad(tagId));
		const { data, error } = await supabase
			.from("tags")
			.insert({
				id: tagId,
				workspace_id: workspaceId,
				ciphertext: sealed,
				color: "#6b7280",
			})
			.select("id")
			.single();
		if (error) throw error;
		tagIdByName.set(name, data.id);
		return data.id;
	};

	for (const [columnIndex, col] of normalized.entries()) {
		const columnId = crypto.randomUUID();
		const sealedColumn = await sealText(
			JSON.stringify({ title: col.title }),
			columnAad(columnId),
		);
		const { data: column, error: colError } = await supabase
			.from("columns")
			.insert({
				id: columnId,
				page_id: pageId,
				ciphertext: sealedColumn,
				position: columnIndex,
				color: col.color || null,
			})
			.select()
			.single();
		if (colError) throw colError;

		for (const [cardIndex, card] of col.cards.entries()) {
			const cardId = crypto.randomUUID();
			const sealedCard = await sealText(
				JSON.stringify({
					title: card.title,
					description: card.description,
				}),
				cardAad(cardId),
			);
			const { data: createdCard, error: cardError } = await supabase
				.from("cards")
				.insert({
					id: cardId,
					page_id: pageId,
					column_id: column.id,
					ciphertext: sealedCard,
					position: cardIndex,
					due_date: card.dueDate,
					assignee_ids: card.assigneeIds ?? [],
				})
				.select()
				.single();
			if (cardError) throw cardError;

			for (const tagName of card.tagNames ?? []) {
				const name = tagName.trim();
				if (!name) continue;
				const tagId = await ensureTag(name);
				const { error: relError } = await supabase
					.from("card_tags")
					.insert({ card_id: createdCard.id, tag_id: tagId });
				if (relError) throw relError;
			}
		}
	}
};
