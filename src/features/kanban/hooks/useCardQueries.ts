import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";

export type CardRow = Tables<"cards">;

const toCard = (row: CardRow) => ({
	id: row.id,
	title: row.title,
	description: row.description ?? "",
	dueDate: row.due_date,
	assigneeIds: row.assignee_ids ?? [],
});

export function useCardQueries(pageId: string | undefined) {
	const cardsQuery = createQuery(() => ({
		queryKey: ["cards", pageId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("cards")
				.select("*")
				.eq("page_id", pageId!)
				.order("position", { ascending: true });
			if (error) throw error;
			return data.map(toCard);
		},
		enabled: !!pageId,
	}));

	const createCard = createMutation(() => ({
		mutationFn: async (input: {
			columnId: string;
			pageId: string;
			title: string;
			description?: string;
			dueDate?: string;
			assigneeIds?: string[];
		}) => {
			const { data: existing } = await supabase
				.from("cards")
				.select("id")
				.eq("column_id", input.columnId);

			const { data, error } = await supabase
				.from("cards")
				.insert({
					column_id: input.columnId,
					page_id: input.pageId,
					title: input.title,
					description: input.description ?? null,
					due_date: input.dueDate ?? null,
					assignee_ids: input.assigneeIds ?? [],
					position: existing?.length ?? 0,
				})
				.select()
				.single();
			if (error) throw error;
			return toCard(data);
		},
	}));

	const updateCard = createMutation(() => ({
		mutationFn: async (input: {
			id: string;
			title?: string;
			description?: string;
			dueDate?: string | null;
			assigneeIds?: string[];
			columnId?: string;
		}) => {
			const { error } = await supabase
				.from("cards")
				.update({
					...(input.title !== undefined && { title: input.title }),
					...(input.description !== undefined && {
						description: input.description || null,
					}),
					...(input.dueDate !== undefined && { due_date: input.dueDate }),
					...(input.assigneeIds !== undefined && {
						assignee_ids: input.assigneeIds,
					}),
					...(input.columnId !== undefined && { column_id: input.columnId }),
				})
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	const deleteCard = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("cards").delete().eq("id", id);
			if (error) throw error;
		},
	}));

	const reorderCards = createMutation(() => ({
		mutationFn: async (input: { cardIds: string[] }) => {
			const updates = input.cardIds.map((id, index) =>
				supabase.from("cards").update({ position: index }).eq("id", id),
			);
			const results = await Promise.all(updates);
			const firstError = results.find((r) => r.error);
			if (firstError) throw firstError.error;
		},
	}));

	const moveCard = createMutation(() => ({
		mutationFn: async (input: {
			cardId: string;
			newColumnId: string;
			position: number;
		}) => {
			const { error } = await supabase
				.from("cards")
				.update({
					column_id: input.newColumnId,
					position: input.position,
				})
				.eq("id", input.cardId);
			if (error) throw error;
		},
	}));

	return {
		cards: cardsQuery,
		createCard,
		updateCard,
		deleteCard,
		reorderCards,
		moveCard,
	};
}
