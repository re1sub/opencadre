export type PageKind = "markdown" | "kanban" | "table";

export interface Page {
	id: string;
	title: string;
	kind: PageKind;
	content: string;
}

export interface PageKindMeta {
	label: string;
	icon: string;
	iconLabel: string;
}

export const PAGE_KIND_META = {
	markdown: {
		label: "Page (Markdown)",
		icon: "file-text",
		iconLabel: "Markdown page",
	},
	kanban: {
		label: "Board (Kanban)",
		icon: "kanban",
		iconLabel: "Board",
	},
	table: {
		label: "Table",
		icon: "table",
		iconLabel: "Table",
	},
} satisfies Record<PageKind, PageKindMeta>;
