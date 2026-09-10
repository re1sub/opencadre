import { describe, expect, it } from "vitest";
import { createReconcileGuard } from "./reconcile";

describe("createReconcileGuard", () => {
	it("applies event when no prior write recorded", () => {
		const guard = createReconcileGuard();
		expect(
			guard.shouldApply("pages", "1", { updatedAt: "2025-01-01T00:00:00Z" }),
		).toBe(true);
	});

	it("drops event with same updatedAt as recorded write", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", {
			updatedAt: "2025-01-01T00:00:00Z",
		});
		expect(
			guard.shouldApply("pages", "1", { updatedAt: "2025-01-01T00:00:00Z" }),
		).toBe(false);
	});

	it("applies event with different updatedAt", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", {
			updatedAt: "2025-01-01T00:00:00Z",
		});
		expect(
			guard.shouldApply("pages", "1", { updatedAt: "2025-01-01T00:01:00Z" }),
		).toBe(true);
	});

	it("drops event with same or older version", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", { version: 3 });
		expect(guard.shouldApply("pages", "1", { version: 3 })).toBe(false);
		// re-record because shouldApply deletes on drop
		guard.recordWrite("pages", "1", { version: 3 });
		expect(guard.shouldApply("pages", "1", { version: 2 })).toBe(false);
	});

	it("applies event with newer version", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", { version: 3 });
		expect(guard.shouldApply("pages", "1", { version: 4 })).toBe(true);
	});

	it("drops event with matching blob content", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", {
			updatedAt: "2025-01-01T00:00:00Z",
			blob: "hello",
		});
		expect(
			guard.shouldApply("pages", "1", {
				updatedAt: "2025-01-01T00:00:00Z",
				content: "hello",
			}),
		).toBe(false);
	});

	it("applies event with different blob content", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", {
			updatedAt: "2025-01-01T00:00:00Z",
			blob: "hello",
		});
		// use a different updatedAt so the updatedAt check does not also trigger
		expect(
			guard.shouldApply("pages", "1", {
				updatedAt: "2025-01-01T00:01:00Z",
				content: "world",
			}),
		).toBe(true);
	});

	it("clear removes recorded write", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", { updatedAt: "2025-01-01T00:00:00Z" });
		guard.clear("pages", "1");
		expect(
			guard.shouldApply("pages", "1", { updatedAt: "2025-01-01T00:00:00Z" }),
		).toBe(true);
	});

	it("isolates by table and id", () => {
		const guard = createReconcileGuard();
		guard.recordWrite("pages", "1", { updatedAt: "2025-01-01T00:00:00Z" });
		expect(
			guard.shouldApply("pages", "2", { updatedAt: "2025-01-01T00:00:00Z" }),
		).toBe(true);
		expect(
			guard.shouldApply("cards", "1", { updatedAt: "2025-01-01T00:00:00Z" }),
		).toBe(true);
	});
});
