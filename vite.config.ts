import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import devtools from "solid-devtools/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { qrcode } from "vite-plugin-qrcode";

export default defineConfig({
	plugins: [devtools(), solidPlugin(), vanillaExtractPlugin(), qrcode()],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 3000,
		host: "0.0.0.0",
	},
	build: {
		target: "esnext",
	},
});
