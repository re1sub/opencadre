import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";

export type TagRow = Tables<"tags">;

const toTag = (row: TagRow) => ({
	id: row.id,
	name: row.name,
	color: row.color,
	createdAt: row.created_at,
});

export function useTagQueries(workspaceId: string | undefined) {
	const tagsQuery = createQuery(() => ({
		queryKey: ["tags", workspaceId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("tags")
				.select("*")
				.eq("workspace_id", workspaceId!)
				.order("created_at", { ascending: true });
			if (error) throw error;
			return data.map(toTag);
		},
		enabled: !!workspaceId,
	}));

	const createTag = createMutation(() => ({
		mutationFn: async (input: { name: string; color: string }) => {
			const { data, error } = await supabase
				.from("tags")
				.insert({
					workspace_id: workspaceId!,
					name: input.name,
					color: input.color,
				})
				.select()
				.single();
			if (error) throw error;
			return toTag(data);
		},
	}));

	const updateTag = createMutation(() => ({
		mutationFn: async (input: { id: string; name: string; color: string }) => {
			const { error } = await supabase
				.from("tags")
				.update({ name: input.name, color: input.color })
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	const deleteTag = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("tags").delete().eq("id", id);
			if (error) throw error;
		},
	}));

	const assignTag = createMutation(() => ({
		mutationFn: async (input: { cardId: string; tagId: string }) => {
			const { error } = await supabase
				.from("card_tags")
				.insert({ card_id: input.cardId, tag_id: input.tagId });
			if (error) throw error;
		},
	}));

	const unassignTag = createMutation(() => ({
		mutationFn: async (input: { cardId: string; tagId: string }) => {
			const { error } = await supabase
				.from("card_tags")
				.delete()
				.eq("card_id", input.cardId)
				.eq("tag_id", input.tagId);
			if (error) throw error;
		},
	}));

	const cardTagsQuery = createQuery(() => ({
		queryKey: ["card_tags", workspaceId],
		queryFn: async () => {
			const { data, error } = await supabase.from("card_tags").select("*");
			if (error) throw error;
			return data;
		},
		enabled: !!workspaceId,
	}));

	return {
		tags: tagsQuery,
		cardTags: cardTagsQuery,
		createTag,
		updateTag,
		deleteTag,
		assignTag,
		unassignTag,
	};
}
