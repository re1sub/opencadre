import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (req.method !== "POST") {
		return new Response("Method not allowed", {
			status: 405,
			headers: corsHeaders,
		});
	}

	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

	if (!supabaseUrl || !serviceRoleKey || !anonKey) {
		return new Response("Missing environment variables", {
			status: 500,
			headers: corsHeaders,
		});
	}

	// Verify the user's JWT using the anon key (validates the caller identity).
	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } },
	});

	const {
		data: { user },
		error: authError,
	} = await userClient.auth.getUser();

	if (authError || !user) {
		return new Response("Invalid token", { status: 401, headers: corsHeaders });
	}

	const userId = user.id;

	// Perform the erasure with the service role. All statements run inside a
	// single transaction in delete_user_account(), so a failure rolls the whole
	// deletion back instead of leaving a half-deleted account behind.
	const admin = createClient(supabaseUrl, serviceRoleKey);

	const { error: rpcError } = await admin.rpc("delete_user_account", {
		p_user_id: userId,
	});

	if (rpcError) {
		console.error("delete_user_account failed:", rpcError);
		return new Response(JSON.stringify({ error: "Failed to delete account" }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
});
