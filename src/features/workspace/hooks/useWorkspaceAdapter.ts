import { useQueryClient } from "@tanstack/solid-query";
import { createEffect, createSignal } from "solid-js";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";
import type { PageKind, Workspace } from "../types";

type WorkspaceRow = Tables<"workspaces">;

const toWorkspace = (row: WorkspaceRow) => ({
	id: row.id,
	name: row.name,
	description: row.description ?? undefined,
	defaultPageKind: row.default_page_kind as PageKind,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

export function useWorkspaceAdapter() {
	const queryClient = useQueryClient();
	const [workspaces, setWorkspaces] = createSignal<Workspace[]>([]);
	const [activeWorkspaceId, setActiveWorkspaceId] = createSignal<string>("");
	const [loaded, setLoaded] = createSignal(false);

	const fetchWorkspaces = async () => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		// Get workspaces the user is a member of
		const { data: memberships, error: memberError } = await supabase
			.from("workspace_members")
			.select("workspace_id")
			.eq("user_id", user.id);
		if (memberError) throw memberError;

		if (!memberships || memberships.length === 0) {
			setLoaded(true);
			return;
		}

		const workspaceIds = memberships.map((m) => m.workspace_id);
		const { data: wsData, error: wsError } = await supabase
			.from("workspaces")
			.select("*")
			.in("id", workspaceIds)
			.order("created_at", { ascending: true });
		if (wsError) throw wsError;

		const mapped = wsData.map(toWorkspace);
		setWorkspaces(mapped);
		if (!activeWorkspaceId() && mapped.length > 0) {
			setActiveWorkspaceId(mapped[0].id);
		}
		setLoaded(true);
	};

	// Initial fetch
	createEffect(() => {
		fetchWorkspaces();
	});

	const activeWorkspace = () =>
		workspaces().find((w) => w.id === activeWorkspaceId()) ?? null;

	const addWorkspace = async (name?: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return null;

		const { data: workspace, error } = await supabase
			.from("workspaces")
			.insert({ name: name ?? "Untitled workspace", owner_id: user.id })
			.select()
			.single();
		if (error) throw error;

		const { error: memberError } = await supabase
			.from("workspace_members")
			.insert({
				workspace_id: workspace.id,
				user_id: user.id,
				email: user.email ?? "",
				role: "owner",
			});
		if (memberError) throw memberError;

		const mapped = toWorkspace(workspace);
		setWorkspaces((prev) => [...prev, mapped]);
		return mapped;
	};

	const removeWorkspace = async (id: string) => {
		const target = workspaces().find((w) => w.id === id);
		const remaining = workspaces().filter((w) => w.id !== id);

		const { error } = await supabase.from("workspaces").delete().eq("id", id);
		if (error) throw error;

		setWorkspaces(remaining);
		if (activeWorkspaceId() === id) {
			setActiveWorkspaceId(remaining[0]?.id ?? "");
		}

		return target ?? null;
	};

	const renameWorkspace = async (id: string, name: string) => {
		const { error } = await supabase
			.from("workspaces")
			.update({ name })
			.eq("id", id);
		if (error) throw error;

		setWorkspaces((prev) =>
			prev.map((w) =>
				w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w,
			),
		);
	};

	const updateWorkspace = async (
		id: string,
		fields: {
			name?: string;
			description?: string | null;
			defaultPageKind?: PageKind;
		},
	) => {
		const update: {
			name?: string;
			description?: string | null;
			default_page_kind?: PageKind;
		} = {};
		if (fields.name !== undefined) update.name = fields.name;
		if (fields.description !== undefined)
			update.description = fields.description;
		if (fields.defaultPageKind !== undefined)
			update.default_page_kind = fields.defaultPageKind;

		if (Object.keys(update).length === 0) return;

		const { error } = await supabase
			.from("workspaces")
			.update(update)
			.eq("id", id);
		if (error) throw error;

		setWorkspaces((prev) =>
			prev.map((w) =>
				w.id === id
					? {
							...w,
							name: fields.name ?? w.name,
							description:
								fields.description === null
									? undefined
									: (fields.description ?? w.description),
							defaultPageKind: fields.defaultPageKind ?? w.defaultPageKind,
							updatedAt: new Date().toISOString(),
						}
					: w,
			),
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
		updateWorkspace,
		setWorkspaces,
		loaded,
	};
}
