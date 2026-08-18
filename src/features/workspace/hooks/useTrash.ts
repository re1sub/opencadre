import { createSignal } from "solid-js";
import type { Page, TrashEntry, Workspace } from "../types";

export const useTrash = (
	setWorkspaces: (fn: (prev: Workspace[]) => Workspace[]) => void,
	setAllPages: (fn: (prev: Page[]) => Page[]) => void,
) => {
	const [trash, setTrash] = createSignal<TrashEntry[]>([]);

	const moveToTrash = (
		entry:
			| { kind: "page"; page: Page }
			| { kind: "workspace"; workspace: Workspace; pages: Page[] },
	) => {
		setTrash((prev) => [
			...prev,
			{ ...entry, deletedAt: new Date().toISOString() } as TrashEntry,
		]);
	};

	const restoreEntry = (entry: TrashEntry) => {
		if (entry.kind === "workspace") {
			setWorkspaces((prev) =>
				prev.some((w) => w.id === entry.workspace.id)
					? prev
					: [...prev, entry.workspace],
			);
			setAllPages((prev) => [
				...prev,
				...entry.pages.filter((p) => !prev.some((c) => c.id === p.id)),
			]);
			setTrash((prev) =>
				prev.filter(
					(t) =>
						!(
							t.kind === "workspace" && t.workspace.id === entry.workspace.id
						) &&
						!(t.kind === "page" && t.page.workspaceId === entry.workspace.id),
				),
			);
			return;
		}

		setAllPages((prev) =>
			prev.some((p) => p.id === entry.page.id) ? prev : [...prev, entry.page],
		);
		setTrash((prev) =>
			prev.filter((t) => !(t.kind === "page" && t.page.id === entry.page.id)),
		);
	};

	const purgeEntry = (entry: TrashEntry) => {
		setTrash((prev) => {
			if (entry.kind === "workspace") {
				return prev.filter(
					(t) =>
						!(
							t.kind === "workspace" && t.workspace.id === entry.workspace.id
						) &&
						!(t.kind === "page" && t.page.workspaceId === entry.workspace.id),
				);
			}
			return prev.filter(
				(t) => !(t.kind === "page" && t.page.id === entry.page.id),
			);
		});
	};

	const emptyTrash = () => setTrash([]);

	return {
		trash,
		moveToTrash,
		restoreEntry,
		purgeEntry,
		emptyTrash,
	};
};
