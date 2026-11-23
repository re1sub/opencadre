import { withSupabase } from "npm:@supabase/server";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const constantTimeEquals = (a: string, b: string): boolean => {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
};

export default {
	fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
		const { supabaseAdmin, userClaims } = ctx;

		if (req.method !== "POST") {
			return Response.json({ error: "Method not allowed" }, { status: 405 });
		}

		let body: { user_id?: unknown };
		try {
			body = await req.json();
		} catch {
			return Response.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const target = body?.user_id;
		if (typeof target !== "string" || !UUID_RE.test(target)) {
			return Response.json({ error: "Invalid user_id" }, { status: 400 });
		}

		const authHeader = req.headers.get("Authorization") ?? "";
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		const isServiceRole =
			serviceRoleKey !== undefined &&
			constantTimeEquals(authHeader, `Bearer ${serviceRoleKey}`);
		const isSelf = userClaims?.id === target;

		if (!isServiceRole && !isSelf) {
			return Response.json({ error: "Not authorized" }, { status: 403 });
		}

		const { data, error } = await supabaseAdmin.rpc("delete_user_sessions", {
			p_user_id: target,
		});
		if (error) {
			console.error("delete_user_sessions failed:", error);
			return Response.json(
				{ error: "Failed to revoke sessions" },
				{ status: 500 },
			);
		}

		return Response.json({
			success: true,
			revokedSessions: data ?? 0,
			note: "Existing access tokens remain valid until they expire.",
		});
	}),
};
