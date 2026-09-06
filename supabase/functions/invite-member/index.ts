import { createClient } from "npm:@supabase/supabase-js";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type, x-run-id",
};

const corsResponse = (body: string, status: number): Response => {
	return new Response(body, { status, headers: corsHeaders });
};

type RequestBody = {
	workspace_id: string;
	email: string;
	role: "admin" | "member" | "guest";
};

const INVITE_REDIRECT_PATH = "/accept-invite?token=";

// Invites a user into a workspace. Only workspace owners and admins may do so;
// the caller's role is enforced through an RLS-scoped client using their own JWT.
Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}
	if (req.method !== "POST") {
		return corsResponse("Method not allowed", 405);
	}

	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return corsResponse("Unauthorized", 401);
	}

	const url = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	const serviceRoleKey =
		Deno.env.get("LEGACY_SERVICE_ROLE_KEY") ??
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!url || !anonKey || !serviceRoleKey) {
		return corsResponse("Server configuration error", 500);
	}

	let body: RequestBody;
	try {
		body = await req.json();
	} catch {
		return corsResponse("Invalid JSON body", 400);
	}

	const email = body.email?.trim().toLowerCase();
	const { workspace_id: workspaceId, role } = body;
	if (!workspaceId || !email || !["admin", "member", "guest"].includes(role)) {
		return corsResponse("Missing or invalid workspace_id, email or role", 400);
	}

	// Validate the caller's token and read their identity via an RLS-scoped client.
	const callerClient = createClient(url, anonKey, {
		global: { headers: { Authorization: authHeader } },
		auth: { persistSession: false, autoRefreshToken: false },
	});

	const {
		data: { user: caller },
		error: callerError,
	} = await callerClient.auth.getUser();
	if (callerError || !caller) {
		return corsResponse("Unauthorized", 401);
	}

	// Members are stored both by user_id (linked) and email (pending invites).
	// The caller's own membership (scoped by RLS) authorizes the invite.
	const { data: membership, error: membershipError } = await callerClient
		.from("workspace_members")
		.select("role")
		.eq("workspace_id", workspaceId)
		.eq("user_id", caller.id)
		.maybeSingle();
	if (membershipError) {
		return corsResponse("Failed to authorize invite", 500);
	}
	if (
		!membership ||
		(membership.role !== "owner" && membership.role !== "admin")
	) {
		return corsResponse("Forbidden", 403);
	}

	// Service-role client for admin Auth and member management.
	const adminClient = createClient(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	// Already a member (linked) or pending invite for this workspace by email?
	const { data: existingByEmail, error: existingByEmailError } =
		await adminClient
			.from("workspace_members")
			.select("id, user_id")
			.eq("workspace_id", workspaceId)
			.eq("email", email)
			.maybeSingle();
	if (existingByEmailError) {
		console.error("existingByEmail error", existingByEmailError);
		return corsResponse(
			`Failed to check existing member: ${existingByEmailError.message}`,
			500,
		);
	}
	if (existingByEmail?.user_id) {
		return corsResponse(JSON.stringify({ status: "already-member" }), 409);
	}
	// Pending invite already exists for this email in this workspace: allow
	// re-invite by refreshing the token and resending the email instead of
	// hard 409. Workspace invites are independent from app accounts, so
	// re-inviting must always be possible.
	let pendingId: string | null = existingByEmail?.id ?? null;
	let inviteToken: string;

	if (pendingId) {
		inviteToken = crypto.randomUUID();
		const { error: updateError } = await adminClient
			.from("workspace_members")
			.update({ invite_token: inviteToken, role })
			.eq("id", pendingId);
		if (updateError) {
			console.error("pending update error", updateError);
			return corsResponse(
				`Failed to update invite: ${updateError.message}`,
				500,
			);
		}
	} else {
		inviteToken = crypto.randomUUID();
		const { data: inserted, error: pendingError } = await adminClient
			.from("workspace_members")
			.insert({
				workspace_id: workspaceId,
				email,
				role,
				invite_token: inviteToken,
			})
			.select("id")
			.single();
		if (pendingError) {
			console.error("pending insert error", pendingError);
			return corsResponse(
				`Failed to create invite: ${pendingError.message}`,
				500,
			);
		}
		pendingId = inserted.id;
	}

	const origin = req.headers.get("origin");
	const redirectTo = origin
		? `${origin}${INVITE_REDIRECT_PATH}${inviteToken}`
		: null;

	// Send a plain workspace invite email via the Gmail SMTP already wired
	// for Auth. This does NOT create an auth.users row. The link itself
	// never creates an account on open, the account is only created when the
	// recipient follows the link and completes Sign up at the gate.
	let emailSent = false;
	let emailError: string | null = null;
	const smtpHost = Deno.env.get("SMTP_HOST");
	const smtpPort = Deno.env.get("SMTP_PORT");
	const smtpUser = Deno.env.get("SMTP_USER");
	const smtpPass = Deno.env.get("SMTP_PASS");
	const smtpFrom = Deno.env.get("SMTP_FROM") ?? smtpUser;
	const smtpFromName = Deno.env.get("SMTP_FROM_NAME") ?? "OpenCadre";
	if (smtpHost && smtpPort && smtpUser && smtpPass && redirectTo) {
		try {
			const { data: ws } = await adminClient
				.from("workspaces")
				.select("name")
				.eq("id", workspaceId)
				.maybeSingle();
			const workspaceName =
				(ws as { name?: string } | null)?.name ?? "a workspace";
			const port = Number(smtpPort);
			const cleanPass = smtpPass.replace(/\s+/g, "");
			const transporter = nodemailer.createTransport({
				host: smtpHost,
				port,
				secure: port === 465,
				auth: { user: smtpUser, pass: cleanPass },
			});
			await transporter.sendMail({
				from: smtpFromName ? `"${smtpFromName}" <${smtpFrom}>` : smtpFrom,
				to: email,
				subject: `You've been invited to ${workspaceName} on OpenCadre`,
				text: `You've been invited to join "${workspaceName}" as ${role}.\n\nOpen this link to accept:\n${redirectTo}\n\nIf you don't have an account yet you'll be asked to sign up first, the link itself does not create an account until you do.`,
				html: `<p>You've been invited to join "<strong>${workspaceName}</strong>" as ${role}.</p><p><a href="${redirectTo}">Accept invite</a></p><p style="color:#6b7280;font-size:12px">If you don't have an account yet you'll be asked to sign up first. Opening the link alone does not create an account.</p>`,
			});
			emailSent = true;
		} catch (e) {
			emailError = e instanceof Error ? e.message : String(e);
			console.error("smtp send error", e);
		}
	} else if (!smtpPass) {
		emailError = "SMTP_PASS not set";
		console.warn("smtp skipped: SMTP_PASS not set");
	} else if (!redirectTo) {
		emailError = "Missing origin for redirectTo";
	}

	// Workspace invites must NOT create an app account. The pending row with
	// invite_token is the source of truth.
	return corsResponse(
		JSON.stringify({
			status: "invited",
			pending: true,
			token: inviteToken,
			redirectTo,
			emailSent,
			emailError,
		}),
		200,
	);
});
