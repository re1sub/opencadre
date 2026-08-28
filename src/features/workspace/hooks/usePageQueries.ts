import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Json, Tables, TablesInsert } from "#/types/database";
import { supabase } from "#/utils/supabase";

export type PageRow = Tables<"pages">;
export type PageContentRow = Tables<"page_content">;

export interface PageWithContent {
	id: string;
	workspaceId: string;
	title: string;
	kind: "markdown" | "kanban" | "table";
	content: string;
	icon: string | null;
	isFavorite: boolean;
	isDeleted: boolean;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

const toPage = (row: PageRow, content?: PageContentRow): PageWithContent => ({
	id: row.id,
	workspaceId: row.workspace_id,
	title: row.title,
	kind: row.kind as "markdown" | "kanban" | "table",
	content: content ? JSON.stringify(content.content) : "",
	icon: row.icon,
	isFavorite: row.is_favorite,
	isDeleted: row.is_deleted,
	deletedAt: row.deleted_at,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

export function usePageQueries(workspaceId: string | undefined) {
	const pagesQuery = createQuery(() => ({
		queryKey: ["pages", workspaceId],
		queryFn: async () => {
			const { data: pages, error: pagesError } = await supabase
				.from("pages")
				.select("*")
				.eq("workspace_id", workspaceId!)
				.eq("is_deleted", false)
				.order("created_at", { ascending: true });
			if (pagesError) throw pagesError;

			const pageIds = pages.map((p) => p.id);
			const { data: contents, error: contentsError } = await supabase
				.from("page_content")
				.select("*")
				.in("page_id", pageIds);
			if (contentsError) throw contentsError;

			const contentMap = new Map(contents.map((c) => [c.page_id, c]));
			return pages.map((p) => toPage(p, contentMap.get(p.id)));
		},
		enabled: !!workspaceId,
	}));

	const trashQuery = createQuery(() => ({
		queryKey: ["pages", "trash", workspaceId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("pages")
				.select("*")
				.eq("workspace_id", workspaceId!)
				.eq("is_deleted", true)
				.order("deleted_at", { ascending: false });
			if (error) throw error;
			return data.map((p) => toPage(p));
		},
		enabled: !!workspaceId,
	}));

	const createPage = createMutation(() => ({
		mutationFn: async (input: {
			workspaceId: string;
			title: string;
			kind: "markdown" | "kanban" | "table";
			content?: Record<string, unknown>;
		}) => {
			const { data: page, error: pageError } = await supabase
				.from("pages")
				.insert({
					workspace_id: input.workspaceId,
					title: input.title,
					kind: input.kind,
				})
				.select()
				.single();
			if (pageError) throw pageError;

			const { error: contentError } = await supabase
				.from("page_content")
				.insert({
					page_id: page.id,
					content: (input.content ?? {}) as Json,
				});
			if (contentError) throw contentError;

			return toPage(page);
		},
	}));

	const updatePage = createMutation(() => ({
		mutationFn: async (input: {
			id: string;
			title?: string;
			icon?: string | null;
			isFavorite?: boolean;
		}) => {
			const { error } = await supabase
				.from("pages")
				.update({
					...(input.title !== undefined && { title: input.title }),
					...(input.icon !== undefined && { icon: input.icon }),
					...(input.isFavorite !== undefined && {
						is_favorite: input.isFavorite,
					}),
				})
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	const updatePageContent = createMutation(() => ({
		mutationFn: async (input: {
			pageId: string;
			content: Record<string, unknown>;
		}) => {
			const { error } = await supabase.from("page_content").upsert(
				{
					page_id: input.pageId,
					content: input.content as Json,
				},
				{ onConflict: "page_id" },
			);
			if (error) throw error;
		},
	}));

	const softDeletePage = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("pages")
				.update({ is_deleted: true, deleted_at: new Date().toISOString() })
				.eq("id", id);
			if (error) throw error;
		},
	}));

	const restorePage = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("pages")
				.update({ is_deleted: false, deleted_at: null })
				.eq("id", id);
			if (error) throw error;
		},
	}));

	const purgePage = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("pages").delete().eq("id", id);
			if (error) throw error;
		},
	}));

	const reorderPage = createMutation(() => ({
		mutationFn: async (input: { id: string; position: number }) => {
			const { error } = await supabase
				.from("pages")
				.update({ updated_at: new Date().toISOString() })
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	return {
		pages: pagesQuery,
		trash: trashQuery,
		createPage,
		updatePage,
		updatePageContent,
		softDeletePage,
		restorePage,
		purgePage,
		reorderPage,
	};
}
