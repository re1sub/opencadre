import { z } from "zod";

export const workspaceNameSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Workspace name is required.")
		.max(50, "Workspace name must be 50 characters or fewer."),
});

export const addMemberSchema = z.object({
	email: z.email("Enter a valid email address."),
	role: z.enum(["admin", "member", "guest"]),
});

export const displayNameSchema = z.object({
	name: z
		.string()
		.trim()
		.max(50, "Display name must be 50 characters or fewer."),
});
