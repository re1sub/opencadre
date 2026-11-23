type NavigatorWithHints = Navigator & {
	userAgentData?: { platform?: string };
};

type WindowWithTauri = Window & {
	__TAURI__?: unknown;
	__TAURI_INTERNALS__?: unknown;
};

const browserFrom = (ua: string): string | null => {
	if (/Edg\//.test(ua)) return "Edge";
	if (/OPR\//.test(ua)) return "Opera";
	if (/Firefox\//.test(ua)) return "Firefox";
	if (/Chrome\//.test(ua)) return "Chrome";
	if (/Version\/[\d.]+.*Safari\//.test(ua)) return "Safari";
	return null;
};

const platformFrom = (ua: string, platform: string): string | null => {
	if (/Android/i.test(ua)) return "Android";
	if (/iPad/i.test(ua)) return "iPadOS";
	if (/iPhone|iPod/i.test(ua)) return "iOS";
	if (/Windows/i.test(ua) || /Win/.test(platform)) return "Windows";
	if (/CrOS/.test(ua)) return "ChromeOS";
	if (/Mac OS X|Macintosh/i.test(ua) || /Mac/.test(platform)) return "macOS";
	if (/Linux/i.test(ua) || /Linux/.test(platform)) return "Linux";
	return null;
};

const isDesktopApp = (): boolean => {
	if (typeof window === "undefined") return false;
	const win = window as WindowWithTauri;
	return Boolean(win.__TAURI__ || win.__TAURI_INTERNALS__);
};

export const detectDeviceLabel = (): string => {
	if (typeof navigator === "undefined") return "This device";
	const ua = navigator.userAgent || "";
	const nav = navigator as NavigatorWithHints;
	const platform = nav.userAgentData?.platform || navigator.platform || "";
	const os = platformFrom(ua, platform);

	// A Tauri WebView reports a browser engine in its user agent (WebKitGTK on
	// Linux looks like Safari). That token says nothing about the app, so use
	// the app name and OS instead.
	if (isDesktopApp()) {
		return os ? `OpenCadre on ${os}` : "OpenCadre desktop app";
	}

	const browser = browserFrom(ua);
	if (browser && os) return `${browser} on ${os}`;
	if (os) return `${os} device`;
	if (browser) return `${browser} browser`;
	return "This device";
};
