export type PageKind = "markdown" | "kanban" | "table";

export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface WorkspaceMember {
	id: string;
	name: string;
	email: string;
	role: WorkspaceRole;
	color?: string;
}

export interface Workspace {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface Page {
	id: string;
	workspaceId: string;
	title: string;
	kind: PageKind;
	content: string;
}

export type TrashEntry =
	| { kind: "page"; page: Page; deletedAt: string }
	| {
			kind: "workspace";
			workspace: Workspace;
			pages: Page[];
			deletedAt: string;
	  };

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
