import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";

export type ColumnRow = Tables<"columns">;

const toColumn = (row: ColumnRow) => ({
	id: row.id,
	title: row.title,
	color: row.color ?? "",
	position: row.position,
});

export function useColumnQueries(pageId: string | undefined) {
	const columnsQuery = createQuery(() => ({
		queryKey: ["columns", pageId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("columns")
				.select("*")
				.eq("page_id", pageId!)
				.order("position", { ascending: true });
			if (error) throw error;
			return data.map(toColumn);
		},
		enabled: !!pageId,
	}));

	const createColumn = createMutation(() => ({
		mutationFn: async (input: {
			pageId: string;
			title: string;
			color?: string;
			position?: number;
		}) => {
			const { data: existing } = await supabase
				.from("columns")
				.select("id")
				.eq("page_id", input.pageId);

			const { data, error } = await supabase
				.from("columns")
				.insert({
					page_id: input.pageId,
					title: input.title,
					color: input.color ?? null,
					position: input.position ?? existing?.length ?? 0,
				})
				.select()
				.single();
			if (error) throw error;
			return toColumn(data);
		},
	}));

	const updateColumn = createMutation(() => ({
		mutationFn: async (input: {
			id: string;
			title?: string;
			color?: string;
			position?: number;
		}) => {
			const { error } = await supabase
				.from("columns")
				.update({
					...(input.title !== undefined && { title: input.title }),
					...(input.color !== undefined && { color: input.color || null }),
					...(input.position !== undefined && { position: input.position }),
				})
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	const deleteColumn = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("columns").delete().eq("id", id);
			if (error) throw error;
		},
	}));

	const reorderColumns = createMutation(() => ({
		mutationFn: async (input: { columnIds: string[] }) => {
			const updates = input.columnIds.map((id, index) =>
				supabase.from("columns").update({ position: index }).eq("id", id),
			);
			const results = await Promise.all(updates);
			const firstError = results.find((r) => r.error);
			if (firstError) throw firstError.error;
		},
	}));

	return {
		columns: columnsQuery,
		createColumn,
		updateColumn,
		deleteColumn,
		reorderColumns,
	};
}
