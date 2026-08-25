import { z } from "zod";

export const signInSchema = z.object({
	email: z.email("Enter a valid email address."),
	password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z.object({
	email: z.email("Enter a valid email address."),
	password: z.string().min(6, "Password must be at least 6 characters."),
});

export const forgotPasswordSchema = z.object({
	email: z.email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
	password: z.string().min(6, "Password must be at least 6 characters."),
});
