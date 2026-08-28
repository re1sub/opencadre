import { createEffect, createSignal } from "solid-js";
import { supabase } from "#/utils/supabase";
import type { WorkspaceMember, WorkspaceRole } from "../types";

export function useWorkspaceMembersAdapter(workspaceId: () => string) {
	const [members, setMembers] = createSignal<WorkspaceMember[]>([]);
	const [myRole, setMyRole] = createSignal<WorkspaceRole>("member");

	const fetchMembers = async (wsId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const { data, error } = await supabase
			.from("workspace_members")
			.select("workspace_id, user_id, role, email")
			.eq("workspace_id", wsId);
		if (error) throw error;

		const mapped: WorkspaceMember[] = (data ?? []).map((m: any) => ({
			id: m.user_id ?? m.email,
			name: m.email || "Unknown",
			email: m.email ?? "",
			role: m.role as WorkspaceRole,
		}));

		setMembers(mapped);

		const me = (data ?? []).find((m: any) => m.user_id === user.id);
		if (me) setMyRole(me.role as WorkspaceRole);
	};

	createEffect(() => {
		const wsId = workspaceId();
		if (wsId) fetchMembers(wsId);
	});

	const addMember = async (email: string, role: WorkspaceRole) => {
		const { error } = await supabase.from("workspace_members").insert({
			workspace_id: workspaceId(),
			email,
			role,
		});
		if (error) throw error;

		await fetchMembers(workspaceId());
	};

	const updateRole = async (userId: string, role: WorkspaceRole) => {
		const { error } = await supabase
			.from("workspace_members")
			.update({ role })
			.eq("workspace_id", workspaceId())
			.eq("user_id", userId);
		if (error) throw error;

		setMembers((prev) =>
			prev.map((m) => (m.id === userId ? { ...m, role } : m)),
		);

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user?.id === userId) setMyRole(role);
	};

	const removeMember = async (userId: string) => {
		const { error } = await supabase
			.from("workspace_members")
			.delete()
			.eq("workspace_id", workspaceId())
			.eq("user_id", userId);
		if (error) throw error;

		setMembers((prev) => prev.filter((m) => m.id !== userId));
	};

	return {
		members,
		myRole,
		addMember,
		updateRole,
		removeMember,
	};
}
