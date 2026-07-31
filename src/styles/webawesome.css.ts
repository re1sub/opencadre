import { globalStyle } from "@vanilla-extract/css";

globalStyle(":where(:root), .wa-light, .wa-dark, .wa-invert", {
	vars: {
		"--wa-color-brand-95": "#f2f3fc",
		"--wa-color-brand-90": "#e5e7f9",
		"--wa-color-brand-80": "#ccd0f1",
		"--wa-color-brand-70": "#b3b9e8",
		"--wa-color-brand-60": "#9ba1df",
		"--wa-color-brand-50": "#8288d2",
		"--wa-color-brand-40": "#6a70c0",
		"--wa-color-brand-30": "#565b9e",
		"--wa-color-brand-20": "#41457a",
		"--wa-color-brand-10": "#2d3055",
		"--wa-color-brand-05": "#1f2140",
		"--wa-color-brand": "#8288d2",
		"--wa-color-brand-on": "#fafbfc",
	},
});

globalStyle(":where(:root), .wa-light, .wa-dark .wa-invert", {
	vars: {
		"--wa-color-surface-default": "#fafbfc",
		"--wa-color-surface-raised": "#fafbfc",
		"--wa-color-surface-border": "rgba(130, 136, 210, 0.6)",
		"--wa-color-text-normal": "#1b1d26",
		"--wa-color-text-quiet": "rgba(27, 29, 38, 0.8)",
		"--wa-color-text-link": "rgba(27, 29, 38, 0.8)",
	},
});

globalStyle(".wa-dark, .wa-invert", {
	vars: {
		"--wa-color-surface-default": "#000000",
		"--wa-color-surface-raised": "#000000",
		"--wa-color-surface-border": "rgba(250, 251, 252, 0.2)",
		"--wa-color-text-normal": "#fafbfc",
		"--wa-color-text-quiet": "rgba(250, 251, 252, 0.8)",
		"--wa-color-text-link": "rgba(250, 251, 252, 0.8)",
	},
});
