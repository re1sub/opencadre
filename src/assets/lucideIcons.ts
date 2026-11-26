const iconModules = import.meta.glob(
	"../../node_modules/lucide-static/icons/*.svg",
	{ eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

const aliases: Record<string, string> = {
	xmark: "x",
	bars: "menu",
	"eye-slash": "eye-off",
	"circle-xmark": "circle-x",
};

export const normalizeIconName = (name: string): string =>
	aliases[name] ?? name;

const urls = new Map<string, string>();
for (const [path, svg] of Object.entries(iconModules)) {
	const name = path.match(/\/([^/]+)\.svg(?:\?raw)?$/)?.[1];
	if (name) urls.set(name, `data:image/svg+xml,${encodeURIComponent(svg)}`);
}

export const getLocalIconUrl = (name: string): string => {
	const normalized = normalizeIconName(name);
	return urls.get(normalized) ?? urls.get("circle") ?? "";
};
