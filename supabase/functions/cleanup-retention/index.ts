import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

// Retention periods in days
const PAGE_VISITS_RETENTION_DAYS = 90;
const ACTIVITY_LOGS_RETENTION_DAYS = 180;
const AI_REQUESTS_RETENTION_DAYS = 365;

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	// Verify cron secret or service role key (function has verify_jwt = false,
	// so the platform does not validate the token for us).
	const authHeader = req.headers.get("Authorization");
	const cronSecret = req.headers.get("X-Cron-Secret");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const expectedCronSecret = Deno.env.get("CRON_SECRET");

	const isValidAuth =
		authHeader !== null && authHeader === `Bearer ${serviceRoleKey}`;
	const isValidCronSecret =
		expectedCronSecret !== undefined && cronSecret === expectedCronSecret;

	if (!isValidAuth && !isValidCronSecret) {
		return new Response("Unauthorized", {
			status: 401,
			headers: corsHeaders,
		});
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	if (!supabaseUrl || !serviceRoleKey) {
		return new Response("Missing environment variables", {
			status: 500,
			headers: corsHeaders,
		});
	}

	const admin = createClient(supabaseUrl, serviceRoleKey);
	const now = new Date();

	const cutoffPageVisits = new Date(
		now.getTime() - PAGE_VISITS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	const cutoffActivityLogs = new Date(
		now.getTime() - ACTIVITY_LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	const cutoffAiRequests = new Date(
		now.getTime() - AI_REQUESTS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();

	try {
		// 1. Anonymize old activity logs: keep the history for the timeline,
		// but drop the personal link (user_id) once past the retention period.
		const { error: anonymizeError } = await admin
			.from("activity_logs")
			.update({ user_id: null })
			.lt("created_at", cutoffActivityLogs);

		// 2. Scrub invitee emails from old member_invite metadata (personal data).
		const { data: oldInvites } = await admin
			.from("activity_logs")
			.select("id, metadata")
			.lt("created_at", cutoffActivityLogs)
			.eq("action", "member_invite");

		let scrubError: { message: string } | null = null;
		const inviteIds = (oldInvites ?? [])
			.filter(
				(log) =>
					log.metadata !== null &&
					typeof log.metadata === "object" &&
					"email" in log.metadata,
			)
			.map((log) => {
				const metadata = log.metadata as { role?: string };
				return { id: log.id, metadata: { role: metadata.role } };
			});
		for (const invite of inviteIds) {
			const { error } = await admin
				.from("activity_logs")
				.update({ metadata: invite.metadata })
				.eq("id", invite.id);
			if (error) {
				scrubError = error;
				break;
			}
		}

		const [pageVisitsResult, aiRequestsResult] = await Promise.all([
			admin.from("page_visits").delete().lt("viewed_at", cutoffPageVisits),
			admin.from("ai_requests").delete().lt("created_at", cutoffAiRequests),
		]);

		const errors = [
			anonymizeError,
			scrubError,
			pageVisitsResult.error,
			aiRequestsResult.error,
		].filter(Boolean);

		if (errors.length > 0) {
			console.error("Retention cleanup errors:", errors);
			return new Response(
				JSON.stringify({
					success: false,
					errors: errors.map((e) => e?.message),
				}),
				{
					status: 500,
					headers: {
						...corsHeaders,
						"Content-Type": "application/json",
					},
				},
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				activityLogsAnonymizedBefore: cutoffActivityLogs,
				activityLogsAnonymized: inviteIds.length,
				deleted: {
					pageVisitsBefore: cutoffPageVisits,
					aiRequestsBefore: cutoffAiRequests,
				},
				cleanedAt: now.toISOString(),
			}),
			{
				status: 200,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	} catch (err) {
		console.error("Retention cleanup error:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: {
				...corsHeaders,
				"Content-Type": "application/json",
			},
		});
	}
});
