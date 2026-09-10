import { describe, expect, it } from "vitest";
import {
	buildComboParts,
	formatComboKeys,
	formatComboParts,
	isModifierKey,
} from "./useHotkey";

describe("isModifierKey", () => {
	it("returns true for modifier keys", () => {
		expect(isModifierKey("Control")).toBe(true);
		expect(isModifierKey("Shift")).toBe(true);
		expect(isModifierKey("Alt")).toBe(true);
		expect(isModifierKey("Meta")).toBe(true);
		expect(isModifierKey("CapsLock")).toBe(true);
	});

	it("returns false for non-modifier keys", () => {
		expect(isModifierKey("a")).toBe(false);
		expect(isModifierKey("Enter")).toBe(false);
		expect(isModifierKey("Escape")).toBe(false);
	});
});

describe("buildComboParts", () => {
	it("builds combo from ctrl+a", () => {
		const event = new KeyboardEvent("keydown", {
			key: "a",
			ctrlKey: true,
		});
		expect(buildComboParts(event)).toEqual(["mod", "a"]);
	});

	it("builds combo from shift+b", () => {
		const event = new KeyboardEvent("keydown", {
			key: "b",
			shiftKey: true,
		});
		expect(buildComboParts(event)).toEqual(["shift", "b"]);
	});

	it("builds combo from ctrl+shift+z", () => {
		const event = new KeyboardEvent("keydown", {
			key: "z",
			ctrlKey: true,
			shiftKey: true,
		});
		expect(buildComboParts(event)).toEqual(["mod", "shift", "z"]);
	});

	it("normalizes key to lowercase", () => {
		const event = new KeyboardEvent("keydown", { key: "A" });
		expect(buildComboParts(event)).toEqual(["a"]);
	});

	it("skips modifier-only keys", () => {
		const event = new KeyboardEvent("keydown", { key: "Shift" });
		expect(buildComboParts(event)).toEqual([]);
	});

	it("skips Escape", () => {
		const event = new KeyboardEvent("keydown", { key: "Escape" });
		expect(buildComboParts(event)).toEqual([]);
	});
});

describe("formatComboParts", () => {
	it("formats modifier keys", () => {
		expect(formatComboParts(["ctrl", "shift", "a"])).toEqual([
			expect.any(String),
			expect.any(String),
			"A",
		]);
	});

	it("formats special key names", () => {
		const parts = formatComboParts([" ", "arrowup", "arrowdown"]);
		expect(parts).toContain("Space");
		expect(parts).toContain("\u2191");
		expect(parts).toContain("\u2193");
	});

	it("capitalizes single character keys", () => {
		expect(formatComboParts(["a"])).toEqual(["A"]);
	});

	it("capitalizes first letter of multi-character keys", () => {
		expect(formatComboParts(["enter"])).toEqual(["Enter"]);
	});
});

describe("formatComboKeys", () => {
	it("splits combo string and formats parts", () => {
		const result = formatComboKeys("ctrl+shift+a");
		expect(result).toHaveLength(3);
		expect(result[2]).toBe("A");
	});
});
