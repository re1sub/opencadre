import { afterEach, describe, expect, it, vi } from "vitest";
import { detectDeviceLabel } from "./deviceLabel";

const setNavigator = (userAgent: string, platform = "") => {
	vi.stubGlobal("navigator", { userAgent, platform });
};

afterEach(() => vi.unstubAllGlobals());

describe("detectDeviceLabel", () => {
	it("names Chrome on Android", () => {
		setNavigator(
			"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
		);
		expect(detectDeviceLabel()).toBe("Chrome on Android");
	});

	it("names Safari on iPhone", () => {
		setNavigator(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1",
		);
		expect(detectDeviceLabel()).toBe("Safari on iOS");
	});

	it("names Firefox on Windows from the platform hint", () => {
		setNavigator("Mozilla/5.0 Firefox/121.0", "Win32");
		expect(detectDeviceLabel()).toBe("Firefox on Windows");
	});

	it("names Chrome on Linux", () => {
		setNavigator(
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
			"Linux x86_64",
		);
		expect(detectDeviceLabel()).toBe("Chrome on Linux");
	});

	it("names the desktop app instead of its WebView browser", () => {
		setNavigator(
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
			"Linux x86_64",
		);
		vi.stubGlobal("__TAURI__", {});
		expect(detectDeviceLabel()).toBe("OpenCadre on Linux");
	});

	it("falls back to a generic label when nothing is recognized", () => {
		setNavigator("custom-agent");
		expect(detectDeviceLabel()).toBe("This device");
	});
});
