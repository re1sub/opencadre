import { z } from "zod";

export const signInSchema = z.object({
	email: z.email("Enter a valid email address."),
	password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z.object({
	displayName: z
		.string()
		.min(1, "Display name is required.")
		.max(50, "Display name must be 50 characters or fewer."),
	email: z.email("Enter a valid email address."),
	password: z.string().min(8, "Password must be at least 8 characters."),
	consent: z.literal(true, {
		message: "You must accept the terms and privacy policy.",
	}),
});

export const forgotPasswordSchema = z.object({
	email: z.email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
	password: z.string().min(8, "Password must be at least 8 characters."),
});
