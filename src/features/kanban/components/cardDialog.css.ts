import { globalStyle, style } from "@vanilla-extract/css";

export const dialogContainer = style({
	vars: {
		"--width": "auto",
		"--spacing": "0",
	},
	selectors: {
		"&::part(dialog)": {
			marginLeft: "15%",
			marginRight: "15%",
		},
	},
	"@media": {
		"(max-width: 768px)": {
			vars: {
				"--width": "90vw",
			},
			selectors: {
				"&::part(dialog)": {
					marginLeft: "auto",
					marginRight: "auto",
				},
			},
		},
	},
});

export const dialogContent = style({
	display: "flex",
	gap: "var(--wa-space-l)",
	"@media": {
		"(max-width: 1200px)": {
			flexDirection: "column",
		},
	},
});

export const dialogLeftColumn = style({
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	padding: "var(--wa-space-l)",
	width: "100%",
});

export const customLabel = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	marginBottom: "var(--wa-space-xs)",
});

export const dialogCardTitle = style({
	fontSize: "1.8rem",
	marginBottom: "var(--wa-space-m)",
	border: "1px solid transparent",
	borderBottom: "1px solid var(--wa-form-control-border-color)",
	padding: "var(--wa-space-s) var(--wa-space-xs)",
	borderRadius: "0",
	transition: "border-color 0.2s ease-in-out",
	width: "100%",
	":focus": {
		border: "1px solid var(--wa-color-brand)",
		borderRadius: "var(--wa-border-radius-m)",
	},
});

export const dialogTags = style({
	display: "flex",
	alignItems: "flex-start",
	flexWrap: "wrap",
	gap: "var(--wa-space-xs)",
	height: "80px",
	overflowY: "auto",
	margin: "0",
	paddingBottom: "var(--wa-space-m)",
});

globalStyle(`${dialogTags} wa-button, wa-popup wa-button`, {
	borderRadius: "var(--wa-border-radius-m)",
});

globalStyle(
	`${dialogTags} wa-button::part(base), wa-popup wa-button::part(base)`,
	{
		color: "var(--wa-color-neutral-0)",
	},
);
