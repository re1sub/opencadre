import { describe, expect, it } from "vitest";
import { getLocalIconUrl } from "./lucideIcons";

describe("getLocalIconUrl", () => {
	it("returns a bundled SVG data URL", () => {
		const url = getLocalIconUrl("settings");
		expect(url.startsWith("data:image/svg+xml,")).toBe(true);
		expect(decodeURIComponent(url)).toContain("<svg");
	});

	it("resolves aliases", () => {
		expect(getLocalIconUrl("xmark")).toBe(getLocalIconUrl("x"));
	});
});
