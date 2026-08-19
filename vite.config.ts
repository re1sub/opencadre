import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import devtools from "solid-devtools/vite";
import { defineConfig } from "vite";
import { qrcode } from "vite-plugin-qrcode";
import solidPlugin from "vite-plugin-solid";

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
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{
							name: "editor-vendor",
							test: /[\\/]node_modules[\\/](@tiptap|prosemirror.*|marked)[\\/]/,
						},
						{
							name: "table-vendor",
							test: /[\\/]node_modules[\\/]@simple-table[\\/]/,
						},
						{
							name: "webawesome-vendor",
							test: /[\\/]node_modules[\\/]@awesome\.me[\\/]/,
						},
						{
							name: "dnd-vendor",
							test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/,
						},
						{
							name: "solid-vendor",
							test: /[\\/]node_modules[\\/](solid-js|@solidjs|@tanstack\/solid-query)[\\/]/,
						},
					],
				},
			},
		},
	},
});
