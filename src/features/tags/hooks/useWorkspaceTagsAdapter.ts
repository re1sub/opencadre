import { createEffect, createSignal } from "solid-js";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";
import type { Tag } from "../types";

type TagRow = Tables<"tags">;

const toTag = (row: TagRow): Tag => ({
	id: row.id,
	name: row.name,
	color: row.color,
	createdAt: row.created_at,
});

export function useWorkspaceTagsAdapter(workspaceId: () => string) {
	const [tags, setTags] = createSignal<Tag[]>([]);

	const fetchTags = async (wsId: string) => {
		const { data, error } = await supabase
			.from("tags")
			.select("*")
			.eq("workspace_id", wsId)
			.order("created_at", { ascending: true });
		if (error) throw error;
		setTags(data.map(toTag));
	};

	createEffect(() => {
		const wsId = workspaceId();
		if (wsId) fetchTags(wsId);
	});

	const addTag = async (name: string, color: string): Promise<Tag> => {
		const { data, error } = await supabase
			.from("tags")
			.insert({
				workspace_id: workspaceId(),
				name,
				color,
			})
			.select()
			.single();
		if (error) throw error;

		const tag = toTag(data);
		setTags((prev) => [...prev, tag]);
		return tag;
	};

	const updateTag = async (tagId: string, name: string, color: string) => {
		const { error } = await supabase
			.from("tags")
			.update({ name, color })
			.eq("id", tagId);
		if (error) throw error;

		setTags((prev) =>
			prev.map((t) => (t.id === tagId ? { ...t, name, color } : t)),
		);
	};

	const deleteTag = async (tagId: string) => {
		const { error } = await supabase.from("tags").delete().eq("id", tagId);
		if (error) throw error;

		setTags((prev) => prev.filter((t) => t.id !== tagId));
	};

	return {
		tags,
		addTag,
		updateTag,
		deleteTag,
	};
}
