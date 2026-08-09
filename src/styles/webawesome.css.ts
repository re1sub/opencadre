import { globalStyle } from "@vanilla-extract/css";

globalStyle(":where(:root), .wa-light, .wa-dark, .wa-invert", {
	vars: {
		"--wa-color-brand-95": "oklch(1 0.01 281.08)",
		"--wa-color-brand-90": "oklch(0.9 0.02 280.85)",
		"--wa-color-brand-80": "oklch(0.9 0.05 279.93)",
		"--wa-color-brand-70": "oklch(0.8 0.07 279.08)",
		"--wa-color-brand-60": "oklch(0.7 0.09 279.63)",
		"--wa-color-brand-50": "oklch(0.7 0.11 279.33)",
		"--wa-color-brand-40": "oklch(0.6 0.12 278.58)",
		"--wa-color-brand-30": "oklch(0.5 0.11 278.58)",
		"--wa-color-brand-20": "oklch(0.4 0.09 278.53)",
		"--wa-color-brand-10": "oklch(0.3 0.07 278.59)",
		"--wa-color-brand-05": "oklch(0.3 0.06 278.87)",
		"--wa-color-brand": "oklch(0.7 0.11 279.33)",
		"--wa-color-brand-on": "oklch(1 0 247.84)",
	},
});

globalStyle(":where(:root), .wa-light, .wa-dark .wa-invert", {
	vars: {
		"--wa-color-surface-default": "oklch(1 0 247.84)",
		"--wa-color-surface-raised": "oklch(1 0 247.84)",
		"--wa-color-surface-border": "oklch(0.7 0.11 279.33 / 0.6)",
		"--wa-color-text-normal": "oklch(0.2 0.02 275.14)",
		"--wa-color-text-quiet": "oklch(0.2 0.02 275.14 / 0.8)",
		"--wa-color-text-link": "oklch(0.2 0.02 275.14 / 0.8)",
	},
});

globalStyle(".wa-dark, .wa-invert", {
	vars: {
		"--wa-color-surface-default": "oklch(0.2 0.01 258.39)",
		"--wa-color-surface-raised": "oklch(0.2 0.01 258.39)",
		"--wa-color-surface-border": "oklch(1 0 247.84 / 0.2)",
		"--wa-color-text-normal": "oklch(1 0 247.84)",
		"--wa-color-text-quiet": "oklch(1 0 247.84 / 0.8)",
		"--wa-color-text-link": "oklch(1 0 247.84 / 0.8)",
	},
});
