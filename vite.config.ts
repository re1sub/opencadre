import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

export default defineConfig({
  plugins: [devtools(), solidPlugin(), vanillaExtractPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
