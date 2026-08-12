import { style } from "@vanilla-extract/css";

// Baseline borderless/transparent input reset
export const inlineInputStyle = style({
	width: "fit-content",
	fieldSizing: "content",
	minWidth: "1ch",
	vars: {
		"--wa-form-control-border-width": "0",
		"--wa-form-control-border-style": "none",
		"--wa-form-control-background-color": "transparent",
		"--wa-form-control-height": "auto",
		"--wa-form-control-padding-inline": "0",
		"--wa-focus-ring-style": "none",
	},
	selectors: {
		"&::part(input)": {
			width: "fit-content",
			fieldSizing: "content",
			minWidth: "1ch",
		},
	},
});
