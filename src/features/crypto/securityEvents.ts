import type { Json } from "#/types/database";
import { supabase } from "#/utils/supabase";

const ALLOWED_TYPES = new Set([
	"recovery.unlock_failed",
	"device_link.created",
	"device_link.approved",
	"device_link.rejected",
	"device_link.consumed",
	"rotation.started",
	"rotation.completed",
	"rotation.failed",
	"member.removed",
]);

const ALLOWED_METADATA_KEYS = new Set([
	"error_code",
	"workspace_id",
	"rotation_id",
	"request_id",
]);

type SecurityEventType = "recovery.unlock_failed" | (string & {});

const sanitize = (
	metadata: Record<string, unknown>,
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (!ALLOWED_METADATA_KEYS.has(key)) continue;
		if (typeof value !== "string" || value.length > 200) continue;
		out[key] = value;
	}
	return out;
};

export async function logSecurityEvent(
	type: SecurityEventType,
	metadata: Record<string, unknown> = {},
): Promise<void> {
	if (!ALLOWED_TYPES.has(type)) return;
	const { error } = await supabase.rpc("log_security_event", {
		p_type: type,
		p_metadata: sanitize(metadata) as unknown as Json,
	});
	if (error) console.error("logSecurityEvent failed", error);
}
