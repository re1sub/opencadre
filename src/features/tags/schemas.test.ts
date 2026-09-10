import { describe, expect, it } from "vitest";
import { tagSchema } from "./schemas";

describe("tagSchema", () => {
	it("accepts valid tag name", () => {
		expect(tagSchema.safeParse({ name: "bug" }).success).toBe(true);
	});

	it("trims whitespace", () => {
		const result = tagSchema.safeParse({ name: "  bug  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("bug");
		}
	});

	it("rejects empty name", () => {
		expect(tagSchema.safeParse({ name: "" }).success).toBe(false);
	});

	it("rejects name over 50 characters", () => {
		expect(tagSchema.safeParse({ name: "a".repeat(51) }).success).toBe(false);
	});

	it("accepts name at exactly 50 characters", () => {
		expect(tagSchema.safeParse({ name: "a".repeat(50) }).success).toBe(true);
	});

	it("rejects non-string name", () => {
		expect(tagSchema.safeParse({ name: 123 }).success).toBe(false);
	});
});
