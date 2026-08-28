import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import type { Json, Tables } from "#/types/database";
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

		setAllPages((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, title } : entry)),
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
		let parsed: Json;
		try {
			parsed = JSON.parse(content);
		} catch {
			parsed = content;
		}

		const { error } = await supabase
			.from("page_content")
			.upsert({ page_id: id, content: parsed }, { onConflict: "page_id" });
		if (error) throw error;

		setAllPages((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, content } : entry)),
		);
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
		loaded,
	};
}
