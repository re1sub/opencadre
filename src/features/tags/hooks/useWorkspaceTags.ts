import { createSignal } from "solid-js";
import { nowIso } from "#/utils/date";
import { uid } from "#/utils/misc";
import type { Tag } from "../types";

interface WorkspaceTagStore {
	get: () => Tag[];
	set: (next: Tag[] | ((prev: Tag[]) => Tag[])) => void;
}

const stores = new Map<string, WorkspaceTagStore>();

const seedTags = (): Tag[] => [
	{
		id: "tag-bug",
		name: "bug",
		color: "#ef4444",
		createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "tag-urgent",
		name: "urgent",
		color: "#f97316",
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "tag-feature",
		name: "feature",
		color: "#3b82f6",
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "tag-important",
		name: "important",
		color: "#a855f7",
		createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
	},
];

export function useWorkspaceTags(workspaceId: string) {
	let store = stores.get(workspaceId);
	if (!store) {
		const [get, set] = createSignal<Tag[]>(seedTags());
		store = { get, set };
		stores.set(workspaceId, store);
	}

	const addTag = (name: string, color: string): Tag => {
		const tag: Tag = {
			id: uid(),
			name,
			color,
			createdAt: nowIso(),
		};
		store!.set((current) => [...current, tag]);
		return tag;
	};

	const updateTag = (tagId: string, name: string, color: string) => {
		store!.set((current) =>
			current.map((t) => (t.id === tagId ? { ...t, name, color } : t)),
		);
	};

	return {
		tags: store.get,
		addTag,
		updateTag,
	};
}
