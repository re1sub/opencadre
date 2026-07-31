import { registerIconLibrary } from "@awesome.me/webawesome";

// TypeScript definitions
import "@awesome.me/webawesome/dist/custom-elements-jsx.d.ts";

// Web Awesome styles
import "@awesome.me/webawesome/dist/styles/webawesome.css";

// Register icon libraries
registerIconLibrary("default", {
	resolver: (name) =>
		`https://cdn.jsdelivr.net/npm/lucide-static@1.8.0/icons/${name}.svg`,
	mutator: (svg) =>
		svg.querySelectorAll("path").forEach((path) => {
			path.setAttribute("fill", "none");
			path.setAttribute("stroke", "currentColor");
		}),
});

// Import the components you want to use
import "@awesome.me/webawesome/dist/components/badge/badge.js";
import "@awesome.me/webawesome/dist/components/button/button.js";
import "@awesome.me/webawesome/dist/components/icon/icon.js";
import "@awesome.me/webawesome/dist/components/input/input.js";
import "@awesome.me/webawesome/dist/components/drawer/drawer.js";
