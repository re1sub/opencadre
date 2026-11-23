import { withSupabase } from "npm:@supabase/server";

const RETENTION_DAYS = {
	activity_logs: 90,
	security_events: 365,
	ai_requests: 30,
	notifications: 90,
} as const;

const cutoffFor = (days: number, now: Date): string =>
	new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const constantTimeEquals = (a: string, b: string): boolean => {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
};

export default {
	fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
		const { supabaseAdmin } = ctx;

		const authHeader = req.headers.get("Authorization");
		const cronSecret = req.headers.get("X-Cron-Secret");
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		const expectedCronSecret = Deno.env.get("CRON_SECRET");

		const isValidAuth =
			authHeader !== null &&
			serviceRoleKey !== undefined &&
			constantTimeEquals(authHeader, `Bearer ${serviceRoleKey}`);
		const isValidCronSecret =
			expectedCronSecret !== undefined &&
			cronSecret !== null &&
			constantTimeEquals(cronSecret, expectedCronSecret);

		if (!isValidAuth && !isValidCronSecret) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const now = new Date();
		const results = await Promise.all(
			Object.entries(RETENTION_DAYS).map(([table, days]) =>
				supabaseAdmin
					.from(table)
					.delete()
					.lt("created_at", cutoffFor(days, now)),
			),
		);

		const errors = results.map((result) => result.error).filter(Boolean);
		if (errors.length > 0) {
			console.error("Retention cleanup errors:", errors);
			return Response.json(
				{ success: false, errors: errors.map((error) => error?.message) },
				{ status: 500 },
			);
		}

		return Response.json({
			success: true,
			deletedBefore: Object.fromEntries(
				Object.entries(RETENTION_DAYS).map(([table, days]) => [
					table,
					cutoffFor(days, now),
				]),
			),
			cleanedAt: now.toISOString(),
		});
	}),
};
