import { createEffect, createSignal, onCleanup } from "solid-js";
import { sealInviteLabel } from "#/features/crypto/inviteLabel";
import { logSecurityEvent } from "#/features/crypto/securityEvents";
import { featureFlags } from "#/utils/featureFlags";
import { logActivity } from "#/utils/log";
import { registerRealtimeHandlers } from "#/utils/realtime/registrar";
import { isEmail } from "#/utils/string";
import { supabase } from "#/utils/supabase";
import type { WorkspaceMember, WorkspaceRole } from "../types";

const EDGE_FUNCTION_URL = `${import.meta.env.SUPABASE_PUBLIC_URL}/functions/v1/invite-member`;

interface WorkspaceMemberRow {
	id?: string;
	workspace_id?: string | null;
	user_id?: string | null;
	role: string;
	email?: string | null;
	avatar_url?: string | null;
}

export type InviteStatus = "invited" | "added" | "already-member";

const toMember = (m: WorkspaceMemberRow): WorkspaceMember => ({
	id: m.user_id ?? m.email ?? "",
	name: m.email?.trim() || (m.user_id ? m.user_id.slice(0, 8) : "Unknown"),
	email: m.email ?? "",
	role: m.role as WorkspaceRole,
	avatarUrl: m.avatar_url ?? null,
});

export function useWorkspaceMembersAdapter(workspaceId: () => string) {
	const [members, setMembers] = createSignal<WorkspaceMember[]>([]);
	const [myRole, setMyRole] = createSignal<WorkspaceRole>("member");
	const [meUserId, setMeUserId] = createSignal<string | null>(null);

	const unregister = registerRealtimeHandlers("workspace_members", {
		applyInsert: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) => [
				...prev.filter((m) => m.id !== mapped.id && m.email !== mapped.email),
				mapped,
			]);
		},
		applyUpdate: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) =>
				prev.map((m) =>
					m.id === mapped.id || (m.email && m.email === mapped.email)
						? { ...mapped, avatarUrl: mapped.avatarUrl ?? m.avatarUrl }
						: m,
				),
			);

			if (r.user_id && r.user_id === meUserId()) {
				setMyRole(r.role as WorkspaceRole);
			}
		},
		applyDelete: (row) => {
			const r = row as unknown as WorkspaceMemberRow;
			if (r.workspace_id !== workspaceId()) return;
			const mapped = toMember(r);
			setMembers((prev) =>
				prev.filter((m) => m.id !== mapped.id && m.email !== mapped.email),
			);
		},
	});

	onCleanup(unregister);

	const fetchMembers = async (wsId: string) => {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;
		setMeUserId(user.id);

		const { data, error } = await supabase
			.from("workspace_members")
			.select("workspace_id, user_id, role, email")
			.eq("workspace_id", wsId);
		if (error) throw error;

		const rows = (data ?? []) as WorkspaceMemberRow[];
		const userIds = rows
			.map((row) => row.user_id)
			.filter((id): id is string => Boolean(id));

		const avatarById = new Map<string, string | null>();
		if (userIds.length > 0) {
			const { data: profiles } = await supabase
				.from("profiles")
				.select("id, avatar_url")
				.in("id", userIds);
			for (const profile of profiles ?? []) {
				avatarById.set(profile.id, profile.avatar_url);
			}
		}

		const mapped: WorkspaceMember[] = rows.map((row) =>
			toMember({
				...row,
				avatar_url: row.user_id ? (avatarById.get(row.user_id) ?? null) : null,
			}),
		);

		setMembers(mapped);

		const me = rows.find((m) => m.user_id === user.id);
		if (me) setMyRole(me.role as WorkspaceRole);
	};

	createEffect(() => {
		const wsId = workspaceId();
		if (wsId) fetchMembers(wsId);
	});

	const inviteMember = async (
		email: string,
		role: "admin" | "member" | "guest",
		workspaceName: string,
	): Promise<InviteStatus> => {
		if (!featureFlags.memberInvites) {
			throw new Error("Member invites are disabled.");
		}

		const {
			data: { session },
		} = await supabase.auth.getSession();
		const token = session?.access_token ?? "";

		const inviteLabel = workspaceName
			? await sealInviteLabel(workspaceName)
			: null;

		const response = await fetch(EDGE_FUNCTION_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				workspace_id: workspaceId(),
				email,
				role,
				invite_label: inviteLabel,
			}),
		});

		const payload = (await response.json().catch(() => null)) as {
			status?: InviteStatus;
		} | null;

		if (!response.ok || !payload?.status) {
			const message =
				response.status === 403
					? "You don't have permission to invite members."
					: response.status === 409
						? "That person is already a member."
						: "Failed to send the invite. Please try again.";
			throw new Error(message);
		}

		await fetchMembers(workspaceId());
		await logActivity(workspaceId(), "member", null, "member_invite", {
			role,
		});
		return payload.status;
	};

	const updateRole = async (memberId: string, role: WorkspaceRole) => {
		if (memberId === meUserId()) {
			throw new Error("You can't change your own role.");
		}
		const isEmailAddress = isEmail(memberId);
		let query = supabase
			.from("workspace_members")
			.update({ role })
			.eq("workspace_id", workspaceId());
		query = isEmailAddress
			? query.eq("email", memberId)
			: query.eq("user_id", memberId);
		const { error } = await query;
		if (error) throw error;

		await logActivity(workspaceId(), "member", memberId, "member_role_update", {
			role,
		});

		setMembers((prev) =>
			prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
		);

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user?.id === memberId) setMyRole(role);
		if (isEmailAddress) await fetchMembers(workspaceId());
	};

	const removeMember = async (memberId: string) => {
		if (memberId === meUserId()) {
			throw new Error("You can't remove yourself from the workspace.");
		}
		const isEmailAddress = isEmail(memberId);
		if (isEmailAddress) {
			const { error } = await supabase
				.from("workspace_members")
				.delete()
				.eq("workspace_id", workspaceId())
				.eq("email", memberId);
			if (error) throw error;
		} else {
			const { error } = await supabase.rpc("remove_workspace_member", {
				p_workspace_id: workspaceId(),
				p_user_id: memberId,
			});
			if (error) throw error;
			await logSecurityEvent("member.removed", {
				workspace_id: workspaceId(),
			});
		}

		await logActivity(workspaceId(), "member", memberId, "member_remove");

		setMembers((prev) => prev.filter((m) => m.id !== memberId));
	};

	return {
		members,
		myRole,
		meUserId,
		inviteMember,
		updateRole,
		removeMember,
	};
}
