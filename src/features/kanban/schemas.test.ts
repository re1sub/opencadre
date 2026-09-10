import { describe, expect, it } from "vitest";
import { cardDraftSchema, columnSchema } from "./schemas";

describe("columnSchema", () => {
	it("accepts valid title", () => {
		expect(columnSchema.safeParse({ title: "To Do" }).success).toBe(true);
	});

	it("trims whitespace before validating", () => {
		expect(columnSchema.safeParse({ title: "  Hi  " }).success).toBe(true);
	});

	it("rejects empty title", () => {
		const result = columnSchema.safeParse({ title: "" });
		expect(result.success).toBe(false);
	});

	it("rejects title over 50 characters", () => {
		const result = columnSchema.safeParse({ title: "a".repeat(51) });
		expect(result.success).toBe(false);
	});

	it("accepts title at exactly 50 characters", () => {
		const result = columnSchema.safeParse({ title: "a".repeat(50) });
		expect(result.success).toBe(true);
	});

	it("rejects non-string title", () => {
		expect(columnSchema.safeParse({ title: 123 }).success).toBe(false);
	});
});

describe("cardDraftSchema", () => {
	it("accepts empty object (all fields optional)", () => {
		expect(cardDraftSchema.safeParse({}).success).toBe(true);
	});

	it("accepts valid card draft", () => {
		const result = cardDraftSchema.safeParse({
			title: "My card",
			description: "Some description",
			dueDate: "2025-12-31",
		});
		expect(result.success).toBe(true);
	});

	it("trims title", () => {
		const result = cardDraftSchema.safeParse({ title: "  Hi  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe("Hi");
		}
	});

	it("rejects empty title", () => {
		const result = cardDraftSchema.safeParse({ title: "" });
		expect(result.success).toBe(false);
	});

	it("rejects title over 200 characters", () => {
		const result = cardDraftSchema.safeParse({ title: "a".repeat(201) });
		expect(result.success).toBe(false);
	});

	it("accepts title at exactly 200 characters", () => {
		const result = cardDraftSchema.safeParse({ title: "a".repeat(200) });
		expect(result.success).toBe(true);
	});

	it("accepts null dueDate", () => {
		const result = cardDraftSchema.safeParse({ dueDate: null });
		expect(result.success).toBe(true);
	});

	it("rejects invalid dueDate format", () => {
		const result = cardDraftSchema.safeParse({ dueDate: "not-a-date" });
		expect(result.success).toBe(false);
	});
});
