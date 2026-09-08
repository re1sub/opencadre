import { createSignal } from "solid-js";
import { nowIso } from "#/utils/date";
import { uid } from "#/utils/misc";
import type { Workspace } from "../types";

const createWorkspace = (name: string): Workspace => ({
	id: uid(),
	name,
	createdAt: nowIso(),
	updatedAt: nowIso(),
});

export const useWorkspaces = (initialWorkspaces: Workspace[]) => {
	const [workspaces, setWorkspaces] =
		createSignal<Workspace[]>(initialWorkspaces);
	const [activeWorkspaceId, setActiveWorkspaceId] = createSignal<string>(
		initialWorkspaces[0]?.id ?? "",
	);

	const activeWorkspace = () =>
		workspaces().find((w) => w.id === activeWorkspaceId()) ?? null;

	const addWorkspace = () => {
		const ws = createWorkspace("Untitled workspace");
		setWorkspaces((prev) => [...prev, ws]);
		setActiveWorkspaceId(ws.id);
		return ws;
	};

	const removeWorkspace = (id: string) => {
		if (workspaces().length <= 1) return null;

		const target = workspaces().find((w) => w.id === id);
		const remaining = workspaces().filter((w) => w.id !== id);
		setWorkspaces(remaining);

		if (activeWorkspaceId() === id) {
			setActiveWorkspaceId(remaining[0]?.id ?? "");
		}

		return target;
	};

	const renameWorkspace = (id: string, name: string) => {
		setWorkspaces((prev) =>
			prev.map((w) => (w.id === id ? { ...w, name, updatedAt: nowIso() } : w)),
		);
	};

	return {
		workspaces,
		activeWorkspaceId,
		setActiveWorkspaceId,
		activeWorkspace,
		addWorkspace,
		removeWorkspace,
		renameWorkspace,
		setWorkspaces,
	};
};
