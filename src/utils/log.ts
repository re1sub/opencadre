import type { Json } from "#/types/database";
import { supabase } from "#/utils/supabase";

export const logActivity = async (
	workspaceId: string,
	entityType: string,
	entityId: string | null,
	action: string,
	metadata?: Json,
) => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;

	await supabase.from("activity_logs").insert({
		workspace_id: workspaceId,
		entity_type: entityType,
		entity_id: entityId,
		action,
		metadata,
		user_id: user.id,
	});
};
