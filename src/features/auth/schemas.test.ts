import { describe, expect, it } from "vitest";
import {
	forgotPasswordSchema,
	resetPasswordSchema,
	signInSchema,
	signUpSchema,
} from "./schemas";

describe("signInSchema", () => {
	it("accepts valid credentials", () => {
		const result = signInSchema.safeParse({
			email: "alice@example.com",
			password: "secret",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid email", () => {
		const result = signInSchema.safeParse({
			email: "not-an-email",
			password: "secret",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty password", () => {
		const result = signInSchema.safeParse({
			email: "alice@example.com",
			password: "",
		});
		expect(result.success).toBe(false);
	});
});

describe("signUpSchema", () => {
	it("accepts valid registration", () => {
		const result = signUpSchema.safeParse({
			displayName: "Alice",
			email: "alice@example.com",
			password: "12345678",
			consent: true,
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty displayName", () => {
		const result = signUpSchema.safeParse({
			displayName: "",
			email: "alice@example.com",
			password: "12345678",
			consent: true,
		});
		expect(result.success).toBe(false);
	});

	it("rejects displayName over 50 characters", () => {
		const result = signUpSchema.safeParse({
			displayName: "a".repeat(51),
			email: "alice@example.com",
			password: "12345678",
			consent: true,
		});
		expect(result.success).toBe(false);
	});

	it("rejects short password", () => {
		const result = signUpSchema.safeParse({
			displayName: "Alice",
			email: "alice@example.com",
			password: "1234567",
			consent: true,
		});
		expect(result.success).toBe(false);
	});

	it("rejects consent=false", () => {
		const result = signUpSchema.safeParse({
			displayName: "Alice",
			email: "alice@example.com",
			password: "12345678",
			consent: false,
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid email", () => {
		const result = signUpSchema.safeParse({
			displayName: "Alice",
			email: "bad",
			password: "12345678",
			consent: true,
		});
		expect(result.success).toBe(false);
	});
});

describe("forgotPasswordSchema", () => {
	it("accepts valid email", () => {
		expect(
			forgotPasswordSchema.safeParse({ email: "alice@example.com" }).success,
		).toBe(true);
	});

	it("rejects invalid email", () => {
		expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(
			false,
		);
	});
});

describe("resetPasswordSchema", () => {
	it("accepts valid password", () => {
		expect(
			resetPasswordSchema.safeParse({ password: "12345678" }).success,
		).toBe(true);
	});

	it("rejects short password", () => {
		expect(resetPasswordSchema.safeParse({ password: "1234567" }).success).toBe(
			false,
		);
	});
});
