import { withSupabase } from "npm:@supabase/server";
import nodemailer from "npm:nodemailer@6.9.13";

type RequestBody = {
	workspace_id: string;
	email: string;
	role: "admin" | "member" | "guest";
	invite_label?: string | null;
};

const INVITE_REDIRECT_PATH = "/accept-invite?token=";

export default {
	fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
		const { supabase, supabaseAdmin, userClaims } = ctx;

		if (req.method !== "POST") {
			return Response.json({ error: "Method not allowed" }, { status: 405 });
		}

		let body: RequestBody;
		try {
			body = await req.json();
		} catch {
			return Response.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const email = body.email?.trim().toLowerCase();
		const { workspace_id: workspaceId, role } = body;

		const rawLabel = body.invite_label;
		const inviteLabel =
			typeof rawLabel === "string" &&
			rawLabel.length <= 4096 &&
			/^n1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(rawLabel)
				? rawLabel
				: null;
		if (
			!workspaceId ||
			!email ||
			!["admin", "member", "guest"].includes(role)
		) {
			return Response.json(
				{ error: "Missing or invalid workspace_id, email or role" },
				{ status: 400 },
			);
		}

		const { data: membership, error: membershipError } = await supabase
			.from("workspace_members")
			.select("role")
			.eq("workspace_id", workspaceId)
			.eq("user_id", userClaims.id)
			.maybeSingle();
		if (membershipError) {
			return Response.json(
				{ error: "Failed to authorize invite" },
				{ status: 500 },
			);
		}
		if (
			!membership ||
			(membership.role !== "owner" && membership.role !== "admin")
		) {
			return Response.json({ error: "Forbidden" }, { status: 403 });
		}

		const { data: existingByEmail, error: existingByEmailError } =
			await supabaseAdmin
				.from("workspace_members")
				.select("id, user_id")
				.eq("workspace_id", workspaceId)
				.eq("email", email)
				.maybeSingle();
		if (existingByEmailError) {
			console.error("existingByEmail error", existingByEmailError);
			return Response.json(
				{
					error: `Failed to check existing member: ${existingByEmailError.message}`,
				},
				{ status: 500 },
			);
		}
		if (existingByEmail?.user_id) {
			return Response.json({ status: "already-member" }, { status: 409 });
		}
		let pendingId: string | null = existingByEmail?.id ?? null;
		let inviteToken: string;

		if (pendingId) {
			inviteToken = crypto.randomUUID();
			const { error: updateError } = await supabaseAdmin
				.from("workspace_members")
				.update({ invite_token: inviteToken, role })
				.eq("id", pendingId);
			if (updateError) {
				console.error("pending update error", updateError);
				return Response.json(
					{ error: `Failed to update invite: ${updateError.message}` },
					{ status: 500 },
				);
			}
		} else {
			inviteToken = crypto.randomUUID();
			const { data: inserted, error: pendingError } = await supabaseAdmin
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
				return Response.json(
					{ error: `Failed to create invite: ${pendingError.message}` },
					{ status: 500 },
				);
			}
			pendingId = inserted.id;
		}

		const origin = req.headers.get("origin");
		const fragment = inviteLabel ? `#n=${encodeURIComponent(inviteLabel)}` : "";
		const redirectTo = origin
			? `${origin}${INVITE_REDIRECT_PATH}${inviteToken}${fragment}`
			: null;

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
					subject: "You've been invited to a workspace on OpenCadre",
					text: `You've been invited to join a workspace as ${role}.\n\nOpen this link to accept:\n${redirectTo}\n\nIf you don't have an account yet you'll be asked to sign up first, the link itself does not create an account until you do.`,
					html: `<p>You've been invited to join a workspace as ${role}.</p><p><a href="${redirectTo}">Accept invite</a></p><p style="color:#6b7280;font-size:12px">If you don't have an account yet you'll be asked to sign up first. Opening the link alone does not create an account. The workspace name is shown when you open the link.</p>`,
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

		return Response.json({
			status: "invited",
			pending: true,
			token: inviteToken,
			redirectTo,
			emailSent,
			emailError,
		});
	}),
};
