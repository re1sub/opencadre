import type { PageKind } from "../types";

export const PAGE_KIND_LOADERS: Record<PageKind, () => Promise<unknown>> = {
	markdown: () => import("#/features/markdown/MarkdownEditor"),
	kanban: () => import("#/features/kanban/KanbanBoard"),
	table: () => import("#/features/table/TablePage"),
};
