import { withSupabase } from "npm:@supabase/server";

export default {
	fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
		const { supabaseAdmin, userClaims } = ctx;

		if (req.method !== "POST") {
			return Response.json({ error: "Method not allowed" }, { status: 405 });
		}

		// Perform the erasure with the service role. All statements run inside a
		// single transaction in delete_user_account(), so a failure rolls the whole
		// deletion back instead of leaving a half-deleted account behind.
		const { error: rpcError } = await supabaseAdmin.rpc("delete_user_account", {
			p_user_id: userClaims.id,
		});

		if (rpcError) {
			console.error("delete_user_account failed:", rpcError);
			return Response.json(
				{ error: "Failed to delete account" },
				{ status: 500 },
			);
		}

		return Response.json({ success: true });
	}),
};
