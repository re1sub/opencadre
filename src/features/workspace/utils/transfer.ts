import { unzipSync, zipSync } from "fflate";
import type { Page, PageKind, Workspace } from "#/features/workspace/types";
import { nowIso } from "#/utils/date";
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

const downloadBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};

const fetchKanbanBoard = async (
	pageId: string,
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
		.select("id, name");
	if (tagError) throw tagError;

	const tagNameById = new Map((tagData ?? []).map((t) => [t.id, t.name]));

	const columnsById = new Map<string, KanbanExportColumn>();
	for (const col of colData ?? []) {
		columnsById.set(col.id, {
			title: col.title,
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
		column.cards.push({
			title: card.title,
			description: card.description ?? "",
			dueDate: card.due_date,
			assigneeIds: card.assignee_ids ?? [],
			tagNames,
		});
	}

	return Array.from(columnsById.values());
};

export const exportAllPages = async (workspace: Workspace, pages: Page[]) => {
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
			const board = await fetchKanbanBoard(page.id);
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
			await importKanbanBoard(options.workspaceId, page.id, board);
		}

		imported += 1;
	}

	return imported;
};

const importKanbanBoard = async (
	workspaceId: string,
	pageId: string,
	board: KanbanExportColumn[],
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
		.select("id, name")
		.eq("workspace_id", workspaceId);
	if (tagFetchError) throw tagFetchError;

	const tagIdByName = new Map((existingTags ?? []).map((t) => [t.name, t.id]));

	const ensureTag = async (name: string): Promise<string> => {
		const existing = tagIdByName.get(name);
		if (existing) return existing;
		const { data, error } = await supabase
			.from("tags")
			.insert({ workspace_id: workspaceId, name, color: "#6b7280" })
			.select()
			.single();
		if (error) throw error;
		tagIdByName.set(name, data.id);
		return data.id;
	};

	for (const [columnIndex, col] of normalized.entries()) {
		const { data: column, error: colError } = await supabase
			.from("columns")
			.insert({
				page_id: pageId,
				title: col.title,
				position: columnIndex,
				color: col.color || null,
			})
			.select()
			.single();
		if (colError) throw colError;

		for (const [cardIndex, card] of col.cards.entries()) {
			const { data: createdCard, error: cardError } = await supabase
				.from("cards")
				.insert({
					page_id: pageId,
					column_id: column.id,
					title: card.title,
					description: card.description || null,
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
