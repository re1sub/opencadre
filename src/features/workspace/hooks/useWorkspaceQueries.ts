import { createMutation, createQuery } from "@tanstack/solid-query";
import type { Tables } from "#/types/database";
import { supabase } from "#/utils/supabase";

export type WorkspaceRow = Tables<"workspaces">;
export type WorkspaceMemberRow = Tables<"workspace_members">;

const toWorkspace = (row: WorkspaceRow) => ({
	id: row.id,
	name: row.name,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

export function useWorkspaceQueries(userId: string | undefined) {
	const workspacesQuery = createQuery(() => ({
		queryKey: ["workspaces"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("workspaces")
				.select("*")
				.order("created_at", { ascending: true });
			if (error) throw error;
			return data.map(toWorkspace);
		},
		enabled: !!userId,
	}));

	const membersQuery = createQuery(() => ({
		queryKey: ["workspace_members"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("workspace_members")
				.select("*");
			if (error) throw error;
			return data;
		},
		enabled: !!userId,
	}));

	const createWorkspace = createMutation(() => ({
		mutationFn: async (input: { name: string; description?: string }) => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Not authenticated");

			const { data: workspace, error: wsError } = await supabase
				.from("workspaces")
				.insert({
					name: input.name,
					description: input.description,
					owner_id: user.id,
				})
				.select()
				.single();
			if (wsError) throw wsError;

			const { error: memberError } = await supabase
				.from("workspace_members")
				.insert({
					workspace_id: workspace.id,
					user_id: user.id,
					role: "owner",
				});
			if (memberError) throw memberError;

			return toWorkspace(workspace);
		},
	}));

	const renameWorkspace = createMutation(() => ({
		mutationFn: async (input: { id: string; name: string }) => {
			const { error } = await supabase
				.from("workspaces")
				.update({ name: input.name })
				.eq("id", input.id);
			if (error) throw error;
		},
	}));

	const deleteWorkspace = createMutation(() => ({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("workspaces").delete().eq("id", id);
			if (error) throw error;
		},
	}));

	return {
		workspaces: workspacesQuery,
		members: membersQuery,
		createWorkspace,
		renameWorkspace,
		deleteWorkspace,
	};
}

export function useAddWorkspaceMember() {
	return createMutation(() => ({
		mutationFn: async (input: {
			workspaceId: string;
			userId: string;
			role: "owner" | "admin" | "member" | "guest";
		}) => {
			const { error } = await supabase.from("workspace_members").insert({
				workspace_id: input.workspaceId,
				user_id: input.userId,
				role: input.role,
			});
			if (error) throw error;
		},
	}));
}

export function useUpdateWorkspaceMember() {
	return createMutation(() => ({
		mutationFn: async (input: {
			workspaceId: string;
			userId: string;
			role: "owner" | "admin" | "member" | "guest";
		}) => {
			const { error } = await supabase
				.from("workspace_members")
				.update({ role: input.role })
				.eq("workspace_id", input.workspaceId)
				.eq("user_id", input.userId);
			if (error) throw error;
		},
	}));
}

export function useRemoveWorkspaceMember() {
	return createMutation(() => ({
		mutationFn: async (input: { workspaceId: string; userId: string }) => {
			const { error } = await supabase
				.from("workspace_members")
				.delete()
				.eq("workspace_id", input.workspaceId)
				.eq("user_id", input.userId);
			if (error) throw error;
		},
	}));
}
