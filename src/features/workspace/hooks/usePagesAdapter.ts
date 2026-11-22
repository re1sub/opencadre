import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { reportDecryptionError } from "#/features/crypto/decryptionErrors";
import { VaultDecryptionError } from "#/features/crypto/errors";
import { useVault } from "#/features/crypto/VaultProvider";
import {
	cardAad,
	columnAad,
	pageAad,
	pageTitleAad,
} from "#/features/crypto/vault";
import { DEFAULT_MARKDOWN_CONTENT } from "#/features/markdown/constants";
import type { Json, Tables } from "#/types/database";
import { nowIso } from "#/utils/date";
import { logActivity } from "#/utils/log";
import { createReconcileGuard } from "#/utils/realtime/reconcile";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { supabase } from "#/utils/supabase";
import type { Page, PageKind } from "../types";

const RECENT_MAX = 5;

type PageRow = Tables<"pages">;
type PageContentRow = Tables<"page_content">;

export interface AddPageOptions {
	title?: string;
	content?: Json;
}

const EMPTY_TABLE_CONTENT = {
	columns: [1, 2, 3].map((i) => ({
		accessor: `col_${i}`,
		label: `Column ${i}`,
		width: 200,
	})),
	rows: [1, 2, 3].map((i) => ({
		id: `row_${i}`,
		col_1: "",
		col_2: "",
		col_3: "",
	})),
} satisfies Json;

const DEFAULT_CONTENT: Record<PageKind, Json> = {
	markdown: DEFAULT_MARKDOWN_CONTENT,
	kanban: {},
	table: EMPTY_TABLE_CONTENT,
};

const contentToString = (kind: PageKind, raw: Json | undefined): string => {
	if (raw == null) return "";
	if (typeof raw === "string") return raw;
	if (
		kind === "markdown" &&
		typeof raw === "object" &&
		!Array.isArray(raw) &&
		Object.keys(raw).length === 0
	) {
		return "";
	}
	return JSON.stringify(raw);
};

const toPageBase = (row: PageRow, title = ""): Page => ({
	id: row.id,
	workspaceId: row.workspace_id,
	title,
	kind: row.kind as PageKind,
	content: "",
	createdAt: row.created_at,
	updatedAt: row.updated_at,
	ownerId: row.owner_id,
});

const recentsKey = (workspaceId: string) => `opencadre:recents:${workspaceId}`;

const readRecents = (workspaceId: string): string[] => {
	try {
		const raw = window.localStorage.getItem(recentsKey(workspaceId));
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed)
			? parsed.filter((id): id is string => typeof id === "string")
			: [];
	} catch {
		return [];
	}
};

const writeRecents = (workspaceId: string, ids: string[]): void => {
	try {
		window.localStorage.setItem(recentsKey(workspaceId), JSON.stringify(ids));
	} catch {}
};

export function usePagesAdapter(
	activeWorkspaceId: () => string,
	setActiveWorkspaceId: (id: string) => void,
) {
	const navigate = useNavigate();
	const params = useParams<{ rest?: string }>();

	const pageIdFromUrl = () => {
		const [segment, id] = (params.rest ?? "").split("/");
		if (segment === "p" && id) return id;
		return "";
	};

	const [allPages, setAllPages] = createSignal<Page[]>([]);
	const [activePageId, setActivePageId] = createSignal<string | null>(null);
	const [recentIds, setRecentIds] = createSignal<string[]>([]);
	const [loaded, setLoaded] = createSignal(false);

	const vault = useVault();
	const reconcile = createReconcileGuard();

	const openTitle = async (row: PageRow): Promise<string> =>
		vault.openTextSafe(
			row.workspace_id,
			row.title_ciphertext,
			pageTitleAad(row.id),
			`page:${row.id}:title`,
		);

	const unregister = registerRealtimeHandlers("pages", {
		applyInsert: (row) => {
			const r = row as unknown as PageRow;
			if (r.workspace_id !== activeWorkspaceId() || r.is_deleted) return;
			if (allPages().some((p) => p.id === r.id)) return;
			void openTitle(r)
				.then((title) => {
					setAllPages((prev) =>
						prev.some((p) => p.id === r.id)
							? prev
							: [...prev, toPageBase(r, title)],
					);
				})
				.catch(() => {});
		},
		applyUpdate: (row) => {
			const r = row as unknown as PageRow;
			if (r.is_deleted) {
				setAllPages((prev) => prev.filter((p) => p.id !== r.id));
				return;
			}
			void openTitle(r)
				.then((title) => {
					setAllPages((prev) =>
						prev.map((p) =>
							p.id === r.id ? { ...p, title, updatedAt: r.updated_at } : p,
						),
					);
				})
				.catch(() => {});
		},
		applyDelete: (row) => {
			const r = row as unknown as PageRow;
			setAllPages((prev) => prev.filter((p) => p.id !== r.id));
			setRecentIds((prev) => prev.filter((id) => id !== r.id));
		},
	});

	const unregisterContent = registerRealtimeHandlers("page_content", {
		applyInsert: (row) => {
			void applyRemoteContent(row).catch(() => {});
		},
		applyUpdate: (row) => {
			void applyRemoteContent(row).catch(() => {});
		},
		applyDelete: () => {},
	});

	const applyRemoteContent = async (row: Record<string, unknown>) => {
		const r = row as unknown as PageContentRow;
		const page = allPages().find((p) => p.id === r.page_id);
		if (!page) return;

		const blob = await vault.openTextSafe(
			page.workspaceId,
			r.ciphertext,
			pageAad(r.page_id),
			`page:${r.page_id}:content`,
		);

		if (
			!reconcile.shouldApply("page_content", r.id, {
				version: r.version,
				content: blob,
			})
		) {
			return;
		}

		setAllPages((prev) =>
			prev.map((p) =>
				p.id === r.page_id
					? { ...p, content: blob, updatedAt: r.updated_at }
					: p,
			),
		);

		reconcile.recordWrite("page_content", r.id, {
			version: r.version,
			blob,
			updatedAt: r.updated_at,
		});
	};

	onCleanup(() => {
		unregister();
		unregisterContent();
	});

	const recordVisit = (workspaceId: string, pageId: string) => {
		setRecentIds((prev) => {
			const next = [pageId, ...prev.filter((id) => id !== pageId)].slice(
				0,
				RECENT_MAX,
			);
			writeRecents(workspaceId, next);
			return next;
		});
	};

	const fetchPages = async (workspaceId: string) => {
		const { data: pages, error: pagesError } = await supabase
			.from("pages")
			.select("*")
			.eq("workspace_id", workspaceId)
			.eq("is_deleted", false)
			.order("position", { ascending: true });
		if (pagesError) throw pagesError;

		if (!pages || pages.length === 0) {
			setAllPages((prev) => prev.filter((p) => p.workspaceId !== workspaceId));
			setLoaded(true);
			return;
		}

		const pageIds = pages.map((p) => p.id);
		const { data: contents, error: contentsError } = await supabase
			.from("page_content")
			.select("*")
			.in("page_id", pageIds);
		if (contentsError) throw contentsError;

		const contentMap = new Map(contents?.map((c) => [c.page_id, c]) ?? []);
		const mapped: Page[] = [];
		for (const row of pages) {
			const content = contentMap.get(row.id);
			try {
				const [opened, title] = await Promise.all([
					content
						? vault.openTextSafe(
								row.workspace_id,
								content.ciphertext,
								pageAad(row.id),
								`page:${row.id}:content`,
							)
						: Promise.resolve(""),
					openTitle(row),
				]);
				mapped.push({ ...toPageBase(row, title), content: opened });
			} catch {
				// Field errors are reported by openTextSafe; skip this page.
			}
		}

		setAllPages((prev) => {
			const other = prev.filter((p) => p.workspaceId !== workspaceId);
			return [...other, ...mapped];
		});
		setLoaded(true);
	};

	createEffect(() => {
		const wsId = activeWorkspaceId();
		const vaultStatus = vault.status();
		vault.epoch();
		if (!wsId) return;

		if (vaultStatus !== "unlocked") {
			setAllPages((prev) => prev.map((p) => ({ ...p, content: "" })));
			setLoaded(false);
			return;
		}

		setRecentIds(readRecents(wsId));
		void fetchPages(wsId).catch(() => {});
	});

	const activePages = () =>
		allPages().filter((p) => p.workspaceId === activeWorkspaceId());

	const activePage = () =>
		activePages().find((entry) => entry.id === activePageId()) ?? null;

	let lastUrlSegment = "";
	createEffect(() => {
		const rest = params.rest ?? "";
		const pageId = pageIdFromUrl();

		const urlChanged = rest !== lastUrlSegment;
		lastUrlSegment = rest;

		if (!pageId) {
			setActivePageId(null);
			return;
		}

		const page = allPages().find((p) => p.id === pageId);
		if (page) {
			if (urlChanged && page.workspaceId !== activeWorkspaceId()) {
				setActiveWorkspaceId(page.workspaceId);
			}
			if (activePageId() !== page.id) {
				setActivePageId(page.id);
			}
		} else {
			const fallbackPage = activePages()[0];
			if (fallbackPage) {
				navigate(`/workspace/p/${fallbackPage.id}`, { replace: true });
			}
		}
	});

	let lastRecordedKey = "";
	createEffect(() => {
		const wsId = activeWorkspaceId();
		const pageId = activePageId();
		if (!wsId || !pageId) return;
		const page = allPages().find(
			(p) => p.id === pageId && p.workspaceId === wsId,
		);
		if (!page) return;
		const key = `${wsId}:${pageId}`;
		if (key === lastRecordedKey) return;
		lastRecordedKey = key;
		recordVisit(wsId, pageId);
	});

	const recentPages = () => {
		const wsId = activeWorkspaceId();
		return recentIds()
			.map((id) =>
				allPages().find((p) => p.id === id && p.workspaceId === wsId),
			)
			.filter((page): page is Page => Boolean(page));
	};

	const addPage = async (kind: PageKind, options?: AddPageOptions) => {
		const targetWorkspaceId = activeWorkspaceId();
		const defaultTitle = "Untitled";

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("Not authenticated");

		const currentPages = activePages();
		const nextPosition = currentPages.length;

		const pageId = crypto.randomUUID();
		const title = options?.title ?? defaultTitle;
		const sealedTitle = await vault.sealText(
			targetWorkspaceId,
			title,
			pageTitleAad(pageId),
		);

		const { data: page, error: pageError } = await supabase
			.from("pages")
			.insert({
				id: pageId,
				workspace_id: targetWorkspaceId,
				title_ciphertext: sealedTitle,
				kind,
				position: nextPosition,
				owner_id: user.id,
			})
			.select()
			.single();
		if (pageError) throw pageError;

		await logActivity(targetWorkspaceId, "page", page.id, "page_create");

		const content = options?.content ?? DEFAULT_CONTENT[kind];
		const serialized = contentToString(kind, content);
		const sealed = await vault.sealText(
			targetWorkspaceId,
			serialized,
			pageAad(page.id),
		);

		const { error: contentError } = await supabase
			.from("page_content")
			.insert({ page_id: page.id, ciphertext: sealed });
		if (contentError) throw contentError;

		const mapped: Page = {
			...toPageBase(page, title),
			kind,
			content: serialized,
		};
		setAllPages((prev) =>
			prev.some((p) => p.id === page.id) ? prev : [...prev, mapped],
		);
		navigate(`/workspace/p/${mapped.id}`);
		return mapped;
	};

	const removePage = async (id: string) => {
		const page = allPages().find((p) => p.id === id);

		const { error } = await supabase
			.from("pages")
			.update({ is_deleted: true, deleted_at: nowIso() })
			.eq("id", id);
		if (error) throw error;

		await logActivity(page!.workspaceId, "page", id, "page_delete");

		setAllPages((prev) => prev.filter((p) => p.id !== id));
		setRecentIds((prev) => {
			const next = prev.filter((pageId) => pageId !== id);
			if (page) writeRecents(page.workspaceId, next);
			return next;
		});

		if (activePageId() === id) {
			const remaining = activePages().filter((p) => p.id !== id);
			if (remaining[0]) {
				navigate(`/workspace/p/${remaining[0].id}`);
			}
		}

		return page;
	};

	const renamePage = (id: string, title: string) => {
		setAllPages((prev) =>
			prev.map((entry) =>
				entry.id === id ? { ...entry, title, updatedAt: nowIso() } : entry,
			),
		);
	};

	const persistPageTitle = async (id: string, title: string) => {
		const page = allPages().find((p) => p.id === id);
		if (!page) return;

		const sealed = await vault.sealText(
			page.workspaceId,
			title,
			pageTitleAad(id),
		);
		const { error } = await supabase
			.from("pages")
			.update({ title_ciphertext: sealed, updated_at: nowIso() })
			.eq("id", id);
		if (error) throw error;

		await logActivity(page.workspaceId, "page", id, "page_edit");
	};

	const persistPagePositions = async (workspaceId: string, pages: Page[]) => {
		const workspacePages = pages.filter((p) => p.workspaceId === workspaceId);
		if (workspacePages.length === 0) return;

		const results = await Promise.all(
			workspacePages.map((p, index) =>
				supabase.from("pages").update({ position: index }).eq("id", p.id),
			),
		);
		const failed = results.find((result) => result.error);
		if (failed?.error) throw failed.error;
	};

	const reorderPages = async (pageId: string, newIndex: number) => {
		let updatedPages: Page[] = [];
		setAllPages((prev) => {
			const currentWsId = activeWorkspaceId();
			const workspacePages = prev.filter((p) => p.workspaceId === currentWsId);
			const otherPages = prev.filter((p) => p.workspaceId !== currentWsId);

			const oldIndex = workspacePages.findIndex((p) => p.id === pageId);
			if (oldIndex === -1 || oldIndex === newIndex) return prev;

			const reordered = [...workspacePages];
			const [moved] = reordered.splice(oldIndex, 1);
			reordered.splice(newIndex, 0, moved);

			updatedPages = [...otherPages, ...reordered];
			return updatedPages;
		});

		if (updatedPages.length > 0) {
			await persistPagePositions(activeWorkspaceId(), updatedPages);
		}
	};

	const updatePageContent = async (id: string, content: string) => {
		const existing = allPages().find((p) => p.id === id);
		if (!existing) throw new Error("Page not found");
		if (existing.content === content) return;

		const sealed = await vault.sealText(
			existing.workspaceId,
			content,
			pageAad(id),
		);

		const { data: saved, error } = await supabase
			.from("page_content")
			.upsert({ page_id: id, ciphertext: sealed }, { onConflict: "page_id" })
			.select("id, version")
			.single();
		if (error) throw error;

		if (saved) {
			reconcile.recordWrite("page_content", saved.id, {
				version: saved.version,
				blob: content,
			});
		}

		const now = nowIso();
		const { error: pageError } = await supabase
			.from("pages")
			.update({ updated_at: now })
			.eq("id", id);
		if (pageError) throw pageError;

		setAllPages((prev) =>
			prev.map((entry) =>
				entry.id === id ? { ...entry, content, updatedAt: now } : entry,
			),
		);

		await logActivity(existing.workspaceId, "page", id, "page_edit");
	};

	const duplicatePage = async (id: string) => {
		const source = allPages().find((p) => p.id === id);
		if (!source) return;

		let clonedContent: Json;
		try {
			clonedContent = JSON.parse(source.content);
		} catch {
			clonedContent = source.content;
		}

		const targetWorkspaceId = activeWorkspaceId();

		if (source.kind === "kanban") {
			const pageId = crypto.randomUUID();
			const copiedTitle = `${source.title} (Copy)`;
			const sealedTitle = await vault.sealText(
				targetWorkspaceId,
				copiedTitle,
				pageTitleAad(pageId),
			);
			const { data: page, error: pageError } = await supabase
				.from("pages")
				.insert({
					id: pageId,
					workspace_id: targetWorkspaceId,
					title_ciphertext: sealedTitle,
					kind: source.kind,
				})
				.select()
				.single();
			if (pageError) throw pageError;

			const content = clonedContent ?? DEFAULT_CONTENT[source.kind];
			const sealed = await vault.sealText(
				targetWorkspaceId,
				contentToString(source.kind, content),
				pageAad(page.id),
			);
			const { error: contentError } = await supabase
				.from("page_content")
				.insert({ page_id: page.id, ciphertext: sealed });
			if (contentError) throw contentError;

			const { data: sourceColumns } = await supabase
				.from("columns")
				.select("*")
				.eq("page_id", id)
				.order("position", { ascending: true });

			const columnIdMap = new Map<string, string>();

			if (sourceColumns) {
				for (const col of sourceColumns) {
					const errorKey = `column:${col.id}`;
					const openedColumn = await vault.openTextSafe(
						source.workspaceId,
						col.ciphertext,
						columnAad(col.id),
						errorKey,
					);
					let columnTitle: string;
					try {
						const meta = JSON.parse(openedColumn) as { title?: unknown };
						if (typeof meta.title !== "string") throw new Error("invalid");
						columnTitle = meta.title;
					} catch {
						const err = new VaultDecryptionError(
							"Decrypted column metadata was malformed.",
						);
						reportDecryptionError(`${source.workspaceId}:${errorKey}`, err);
						throw err;
					}
					const newColumnId = crypto.randomUUID();
					const sealedColumn = await vault.sealText(
						targetWorkspaceId,
						JSON.stringify({ title: columnTitle }),
						columnAad(newColumnId),
					);
					const { error: insertError } = await supabase.from("columns").insert({
						id: newColumnId,
						page_id: page.id,
						ciphertext: sealedColumn,
						color: col.color,
						position: col.position,
					});
					if (insertError) throw insertError;
					columnIdMap.set(col.id, newColumnId);
				}

				const { data: sourceCards } = await supabase
					.from("cards")
					.select("*")
					.eq("page_id", id)
					.order("position", { ascending: true });

				if (sourceCards) {
					const { data: sourceCardTags } = await supabase
						.from("card_tags")
						.select("card_id, tag_id")
						.in(
							"card_id",
							sourceCards.map((c) => c.id),
						);

					const cardTagMap = new Map<string, string[]>();
					for (const ct of sourceCardTags ?? []) {
						const tags = cardTagMap.get(ct.card_id) ?? [];
						tags.push(ct.tag_id);
						cardTagMap.set(ct.card_id, tags);
					}

					for (const card of sourceCards) {
						const newColumnId = columnIdMap.get(card.column_id);
						if (!newColumnId) continue;

						const errorKey = `card:${card.id}`;
						const openedCard = await vault.openTextSafe(
							source.workspaceId,
							card.ciphertext,
							cardAad(card.id),
							errorKey,
						);
						let meta: { title: string; description: string };
						try {
							const parsed = JSON.parse(openedCard) as {
								title?: unknown;
								description?: unknown;
							};
							if (
								typeof parsed.title !== "string" ||
								typeof parsed.description !== "string"
							) {
								throw new Error("invalid");
							}
							meta = { title: parsed.title, description: parsed.description };
						} catch {
							const err = new VaultDecryptionError(
								"Decrypted card metadata was malformed.",
							);
							reportDecryptionError(`${source.workspaceId}:${errorKey}`, err);
							throw err;
						}

						const newCardId = crypto.randomUUID();
						const sealedCard = await vault.sealText(
							targetWorkspaceId,
							JSON.stringify(meta),
							cardAad(newCardId),
						);
						const { error: insertError } = await supabase.from("cards").insert({
							id: newCardId,
							column_id: newColumnId,
							page_id: page.id,
							ciphertext: sealedCard,
							due_date: card.due_date,
							assignee_ids: card.assignee_ids,
							position: card.position,
						});
						if (insertError) throw insertError;

						const tagIds = cardTagMap.get(card.id);
						if (tagIds?.length) {
							const { error: tagsError } = await supabase
								.from("card_tags")
								.insert(
									tagIds.map((tid) => ({ card_id: newCardId, tag_id: tid })),
								);
							if (tagsError) throw tagsError;
						}
					}
				}
			}

			const mapped: Page = {
				...toPageBase(page, copiedTitle),
				kind: source.kind,
				content: contentToString(source.kind, content),
			};
			setAllPages((prev) =>
				prev.some((p) => p.id === page.id) ? prev : [...prev, mapped],
			);
			navigate(`/workspace/p/${mapped.id}`);
			return mapped;
		}

		return addPage(source.kind, {
			title: `${source.title} (Copy)`,
			content: clonedContent,
		});
	};

	return {
		allPages,
		setAllPages,
		activePageId,
		activePages,
		activePage,
		recentPages,
		addPage,
		removePage,
		renamePage,
		persistPageTitle,
		reorderPages,
		updatePageContent,
		duplicatePage,
		loaded,
	};
}
