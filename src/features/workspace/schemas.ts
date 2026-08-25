import { z } from "zod";

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
