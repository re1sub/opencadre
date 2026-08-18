import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { uid } from "#/utils/uid";
import { GETTING_STARTED_MARKDOWN } from "../constants/gettingStarted";
import type { Page, PageKind } from "../types";

export const usePages = (
	initialPages: Page[],
	activeWorkspaceId: () => string,
	setActiveWorkspaceId: (id: string) => void,
) => {
	const navigate = useNavigate();
	const params = useParams<{ pageId?: string }>();

	const [allPages, setAllPages] = createSignal<Page[]>(initialPages);
	const [activePageId, setActivePageId] = createSignal<string | null>(
		initialPages[0]?.id ?? null,
	);

	const activePages = () =>
		allPages().filter((p) => p.workspaceId === activeWorkspaceId());

	const activePage = () =>
		activePages().find((entry) => entry.id === activePageId()) ?? null;

	createEffect(() => {
		const pageId = params.pageId;

		if (!pageId) {
			const firstPage = activePages()[0];
			if (firstPage)
				navigate(`/workspace/p/${firstPage.id}`, { replace: true });
			return;
		}

		const page = allPages().find((p) => p.id === pageId);
		if (page) {
			if (page.workspaceId !== activeWorkspaceId()) {
				setActiveWorkspaceId(page.workspaceId);
			}
			if (activePageId() !== page.id) {
				setActivePageId(page.id);
			}
		} else {
			const fallbackPage = activePages()[0];
			if (fallbackPage) {
				navigate(`/workspace/p/${fallbackPage.id}`, { replace: true });
			} else {
				setActivePageId(null);
				navigate("/workspace", { replace: true });
			}
		}
	});

	const addPage = (kind: PageKind) => {
		const newPage: Page = {
			id: uid(),
			workspaceId: activeWorkspaceId(),
			title: kind === "kanban" ? "Kanban Board" : "Untitled",
			kind,
			content: kind === "markdown" ? GETTING_STARTED_MARKDOWN : "",
		};

		setAllPages((prev) => [...prev, newPage]);
		navigate(`/workspace/p/${newPage.id}`);
		return newPage;
	};

	const removePage = (id: string) => {
		const page = allPages().find((p) => p.id === id);
		setAllPages((prev) => prev.filter((p) => p.id !== id));

		if (activePageId() === id) {
			const remaining = activePages().filter((p) => p.id !== id);
			navigate(remaining[0] ? `/workspace/p/${remaining[0].id}` : "/workspace");
		}

		return page;
	};

	const renamePage = (id: string, title: string) => {
		setAllPages((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, title } : entry)),
		);
	};

	const reorderPages = (pageId: string, newIndex: number) => {
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

	const updatePageContent = (id: string, content: string) => {
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
		addPage,
		removePage,
		renamePage,
		reorderPages,
		updatePageContent,
	};
};
