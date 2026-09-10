import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [solid()],
	resolve: {
		// Required for SolidJS: "development" exports dev-mode code paths,
		// "browser" ensures browser-targeted packages are resolved correctly.
		conditions: ["development", "browser"],
	},
	test: {
		environment: "jsdom",
		globals: true,
	},
});
