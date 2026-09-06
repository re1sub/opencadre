import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Json, Tables } from "#/types/database";
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
	markdown: "",
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

const toPage = (row: PageRow, content?: PageContentRow): Page => ({
	id: row.id,
	workspaceId: row.workspace_id,
	title: row.title,
	kind: row.kind as PageKind,
	content: contentToString(row.kind as PageKind, content?.content),
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

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

	const reconcile = createReconcileGuard();

	// Apply remote page changes (titles, delete/restore) and page_content
	// updates to the local signal, with author-echo suppression.
	const unregister = registerRealtimeHandlers("pages", {
		applyInsert: (row) => {
			const r = row as unknown as PageRow;
			if (r.workspace_id === activeWorkspaceId() && !r.is_deleted) {
				if (allPages().some((p) => p.id === r.id)) return;
				setAllPages((prev) => [...prev, toPage(r)]);
			}
		},
		applyUpdate: (row) => {
			const r = row as unknown as PageRow;
			if (r.is_deleted) {
				setAllPages((prev) => prev.filter((p) => p.id !== r.id));
				return;
			}
			setAllPages((prev) =>
				prev.map((p) =>
					p.id === r.id
						? {
								...p,
								title: r.title,
								updatedAt: r.updated_at,
								content: p.content,
							}
						: p,
				),
			);
		},
		applyDelete: (row) => {
			const r = row as unknown as PageRow;
			setAllPages((prev) => prev.filter((p) => p.id !== r.id));
			setRecentIds((prev) => prev.filter((id) => id !== r.id));
		},
	});

	const unregisterContent = registerRealtimeHandlers("page_content", {
		applyInsert: (row) => applyRemoteContent(row),
		applyUpdate: (row) => applyRemoteContent(row),
		applyDelete: () => {},
	});

	const applyRemoteContent = (row: Record<string, unknown>) => {
		const r = row as unknown as PageContentRow;
		const page = allPages().find((p) => p.id === r.page_id);
		if (!page) return;

		const blob =
			typeof r.content === "string"
				? r.content
				: page.kind === "markdown" &&
						r.content &&
						typeof r.content === "object" &&
						!Array.isArray(r.content) &&
						Object.keys(r.content).length === 0
					? ""
					: JSON.stringify(r.content);

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

	const fetchRecents = async (workspaceId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;
		const { data, error } = await supabase
			.from("page_visits")
			.select("page_id")
			.eq("user_id", user.id)
			.eq("workspace_id", workspaceId)
			.order("viewed_at", { ascending: false })
			.limit(RECENT_MAX);
		if (error) return;
		setRecentIds(data?.map((visit) => visit.page_id) ?? []);
	};

	const recordVisit = async (workspaceId: string, pageId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		try {
			await supabase.from("page_visits").upsert(
				{
					user_id: user.id,
					page_id: pageId,
					workspace_id: workspaceId,
					viewed_at: new Date().toISOString(),
				},
				{ onConflict: "user_id,page_id" },
			);
		} catch {
			// recents are best-effort
		}

		setRecentIds((prev) =>
			[pageId, ...prev.filter((id) => id !== pageId)].slice(0, RECENT_MAX),
		);
	};

	const fetchPages = async (workspaceId: string) => {
		const { data: pages, error: pagesError } = await supabase
			.from("pages")
			.select("*")
			.eq("workspace_id", workspaceId)
			.eq("is_deleted", false)
			.order("created_at", { ascending: true });
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
		const mapped = pages.map((p) => toPage(p, contentMap.get(p.id)));

		setAllPages((prev) => {
			const other = prev.filter((p) => p.workspaceId !== workspaceId);
			return [...other, ...mapped];
		});
		setLoaded(true);
	};

	// Fetch pages and recent visits when workspace changes
	createEffect(() => {
		const wsId = activeWorkspaceId();
		if (wsId) {
			fetchPages(wsId);
			void fetchRecents(wsId);
		}
	});

	const activePages = () =>
		allPages().filter((p) => p.workspaceId === activeWorkspaceId());

	const activePage = () =>
		activePages().find((entry) => entry.id === activePageId()) ?? null;

	// URL-to-state sync
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

	// Record recently visited pages
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
		void recordVisit(wsId, pageId);
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

		const { data: page, error: pageError } = await supabase
			.from("pages")
			.insert({
				workspace_id: targetWorkspaceId,
				title: options?.title ?? defaultTitle,
				kind,
			})
			.select()
			.single();
		if (pageError) throw pageError;

		const content = options?.content ?? DEFAULT_CONTENT[kind];

		const { error: contentError } = await supabase
			.from("page_content")
			.insert({ page_id: page.id, content });
		if (contentError) throw contentError;

		const mapped: Page = {
			id: page.id,
			workspaceId: targetWorkspaceId,
			title: page.title,
			kind,
			content: contentToString(kind, content),
			createdAt: page.created_at,
			updatedAt: page.updated_at,
		};
		setAllPages((prev) => [...prev, mapped]);
		navigate(`/workspace/p/${mapped.id}`);
		return mapped;
	};

	const removePage = async (id: string) => {
		const page = allPages().find((p) => p.id === id);

		const { error } = await supabase
			.from("pages")
			.update({ is_deleted: true, deleted_at: new Date().toISOString() })
			.eq("id", id);
		if (error) throw error;

		setAllPages((prev) => prev.filter((p) => p.id !== id));
		await supabase.from("page_visits").delete().eq("page_id", id);
		setRecentIds((prev) => prev.filter((pageId) => pageId !== id));

		if (activePageId() === id) {
			const remaining = activePages().filter((p) => p.id !== id);
			if (remaining[0]) {
				navigate(`/workspace/p/${remaining[0].id}`);
			}
		}

		return page;
	};

	const renamePage = async (id: string, title: string) => {
		const { error } = await supabase
			.from("pages")
			.update({ title })
			.eq("id", id);
		if (error) throw error;

		const now = new Date().toISOString();
		setAllPages((prev) =>
			prev.map((entry) =>
				entry.id === id ? { ...entry, title, updatedAt: now } : entry,
			),
		);
	};

	const reorderPages = async (pageId: string, newIndex: number) => {
		setAllPages((prev) => {
			const currentWsId = activeWorkspaceId();
			const workspacePages = prev.filter((p) => p.workspaceId === currentWsId);
			const otherPages = prev.filter((p) => p.workspaceId !== currentWsId);

			const oldIndex = workspacePages.findIndex((p) => p.id === pageId);
			if (oldIndex === -1 || oldIndex === newIndex) return prev;

			const reordered = [...workspacePages];
			const [moved] = reordered.splice(oldIndex, 1);
			reordered.splice(newIndex, 0, moved);

			return [...otherPages, ...reordered];
		});
	};

	const updatePageContent = async (id: string, content: string) => {
		const existing = allPages().find((p) => p.id === id);
		if (existing && existing.content === content) return;

		let parsed: Json;
		try {
			parsed = JSON.parse(content);
		} catch {
			parsed = content;
		}

		const { data: saved, error } = await supabase
			.from("page_content")
			.upsert({ page_id: id, content: parsed }, { onConflict: "page_id" })
			.select("id, version")
			.single();
		if (error) throw error;

		if (saved) {
			reconcile.recordWrite("page_content", saved.id, {
				version: saved.version,
				blob: content,
			});
		}

		const now = new Date().toISOString();
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
			const { data: page, error: pageError } = await supabase
				.from("pages")
				.insert({
					workspace_id: targetWorkspaceId,
					title: `${source.title} (Copy)`,
					kind: source.kind,
				})
				.select()
				.single();
			if (pageError) throw pageError;

			const content = clonedContent ?? DEFAULT_CONTENT[source.kind];
			const { error: contentError } = await supabase
				.from("page_content")
				.insert({ page_id: page.id, content });
			if (contentError) throw contentError;

			const { data: sourceColumns } = await supabase
				.from("columns")
				.select("*")
				.eq("page_id", id)
				.order("position", { ascending: true });

			const columnIdMap = new Map<string, string>();

			if (sourceColumns) {
				for (const col of sourceColumns) {
					const { data: newCol } = await supabase
						.from("columns")
						.insert({
							page_id: page.id,
							title: col.title,
							color: col.color,
							position: col.position,
						})
						.select()
						.single();
					if (newCol) columnIdMap.set(col.id, newCol.id);
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

						const { data: newCard } = await supabase
							.from("cards")
							.insert({
								column_id: newColumnId,
								page_id: page.id,
								title: card.title,
								description: card.description,
								due_date: card.due_date,
								assignee_ids: card.assignee_ids,
								position: card.position,
							})
							.select()
							.single();

						const tagIds = cardTagMap.get(card.id);
						if (newCard && tagIds?.length) {
							await supabase
								.from("card_tags")
								.insert(
									tagIds.map((tid) => ({ card_id: newCard.id, tag_id: tid })),
								);
						}
					}
				}
			}

			const mapped: Page = {
				id: page.id,
				workspaceId: targetWorkspaceId,
				title: page.title,
				kind: source.kind,
				content: contentToString(source.kind, content),
				createdAt: page.created_at,
				updatedAt: page.updated_at,
			};
			setAllPages((prev) => [...prev, mapped]);
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
		reorderPages,
		updatePageContent,
		duplicatePage,
		loaded,
	};
}
