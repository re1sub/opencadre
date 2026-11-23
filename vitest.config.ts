import { fileURLToPath } from "node:url";
import solid from "vite-plugin-solid";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [solid()],
	resolve: {
		alias: {
			"#": fileURLToPath(new URL("./src", import.meta.url)),
		},
		conditions: ["development", "browser"],
	},
	test: {
		environment: "jsdom",
		globals: true,
		pool: "vmThreads",
		setupFiles: ["./src/test/setup.ts"],
		exclude: [...configDefaults.exclude, "e2e/**"],
	},
});
