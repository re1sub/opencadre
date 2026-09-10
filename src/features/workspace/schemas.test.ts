import { describe, expect, it } from "vitest";
import {
	addMemberSchema,
	displayNameSchema,
	workspaceNameSchema,
} from "./schemas";

describe("workspaceNameSchema", () => {
	it("accepts valid name", () => {
		expect(workspaceNameSchema.safeParse({ name: "My Project" }).success).toBe(
			true,
		);
	});

	it("trims whitespace", () => {
		const result = workspaceNameSchema.safeParse({ name: "  Hi  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Hi");
		}
	});

	it("rejects empty name", () => {
		expect(workspaceNameSchema.safeParse({ name: "" }).success).toBe(false);
	});

	it("rejects name over 50 characters", () => {
		expect(
			workspaceNameSchema.safeParse({ name: "a".repeat(51) }).success,
		).toBe(false);
	});

	it("accepts name at exactly 50 characters", () => {
		expect(
			workspaceNameSchema.safeParse({ name: "a".repeat(50) }).success,
		).toBe(true);
	});
});

describe("addMemberSchema", () => {
	it("accepts valid email and role", () => {
		const result = addMemberSchema.safeParse({
			email: "alice@example.com",
			role: "member",
		});
		expect(result.success).toBe(true);
	});

	it("accepts all valid roles", () => {
		for (const role of ["admin", "member", "guest"]) {
			expect(
				addMemberSchema.safeParse({ email: "a@b.com", role }).success,
			).toBe(true);
		}
	});

	it("rejects invalid role", () => {
		const result = addMemberSchema.safeParse({
			email: "alice@example.com",
			role: "superadmin",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid email", () => {
		const result = addMemberSchema.safeParse({
			email: "not-email",
			role: "member",
		});
		expect(result.success).toBe(false);
	});
});

describe("displayNameSchema", () => {
	it("accepts valid name", () => {
		expect(displayNameSchema.safeParse({ name: "Alice" }).success).toBe(true);
	});

	it("accepts empty string (optional field)", () => {
		const result = displayNameSchema.safeParse({ name: "" });
		expect(result.success).toBe(true);
	});

	it("trims whitespace", () => {
		const result = displayNameSchema.safeParse({ name: "  Alice  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Alice");
		}
	});

	it("rejects name over 50 characters after trim", () => {
		const result = displayNameSchema.safeParse({ name: ` ${"a".repeat(51)} ` });
		expect(result.success).toBe(false);
	});
});
