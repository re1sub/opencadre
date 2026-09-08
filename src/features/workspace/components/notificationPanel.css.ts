import { globalStyle, style } from "@vanilla-extract/css";

export const bellButton = style({
	selectors: {
		"&::part(base)": {
			position: "relative",
			paddingInline: "var(--wa-space-s)",
		},
	},
});

export const bellBadge = style({
	position: "absolute",
	top: "0",
	right: "0",
	minWidth: "1rem",
	height: "1rem",
	paddingInline: "var(--wa-space-3xs)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	border: "2px solid var(--wa-color-surface-default)",
	borderRadius: "999px",
	background: "var(--wa-color-brand)",
	color: "var(--wa-color-brand-on)",
	fontSize: "0.625rem",
	fontWeight: "700",
	lineHeight: "1",
	fontVariantNumeric: "tabular-nums",
	pointerEvents: "none",
	boxSizing: "border-box",
});

export const itemContainer = style({
	width: "100%",
	display: "flex",
	flexDirection: "column",
});

export const itemRow = style({
	position: "relative",
});

export const itemDelete = style({
	position: "absolute",
	top: "50%",
	right: "0.25rem",
	transform: "translateY(-50%)",
	opacity: "0",
	transition: "opacity 120ms ease",

	selectors: {
		"&::part(base)": {
			padding: "var(--wa-space-2xs)",
		},

		"&:focus-visible": {
			opacity: "1",
		},
	},
});

export const item = style({
	marginBottom: "1rem",

	selectors: {
		"&::part(base)": {
			padding: "var(--wa-space-s)",
			height: "100%",
			border: "var(--wa-border-width-s) solid var(--wa-color-surface-border)",
			borderRadius: "var(--wa-border-radius-s)",
			transition: "background-color 120ms ease, border-color 120ms ease",
		},

		"&::part(label)": {
			display: "flex",
			flexDirection: "column",
			alignItems: "stretch",
			gap: "var(--wa-space-3xs)",
			minWidth: 0,
		},

		"&:focus-visible::part(base)": {
			outline: "2px solid var(--wa-color-focus)",
			outlineOffset: "2px",
		},
	},
});

export const itemHeader = style({
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: "var(--wa-space-xs)",
	minWidth: 0,
});

export const itemTitle = style({
	minWidth: 0,
	color: "var(--wa-color-text-normal)",
	fontSize: "var(--wa-font-size-xs)",
	fontWeight: "600",
	whiteSpace: "wrap",
	marginBottom: "0.5rem",
});

export const itemTime = style({
	flexShrink: 0,
	color: "var(--wa-color-text-quiet)",
	fontSize: "var(--wa-font-size-2xs)",
	lineHeight: "1.4",
	whiteSpace: "nowrap",
	fontVariantNumeric: "tabular-nums",
});

export const itemBody = style({
	color: "var(--wa-color-text-quiet)",
	fontSize: "var(--wa-font-size-xs)",
	whiteSpace: "normal",
});

export const empty = style({
	padding: "var(--wa-space-l) var(--wa-space-s)",
	color: "var(--wa-color-text-quiet)",
	fontSize: "var(--wa-font-size-xs)",
	lineHeight: "1.5",
	textAlign: "center",
});

globalStyle(`${itemRow}:hover > ${itemDelete}`, {
	opacity: 1,
});

globalStyle(`${itemRow}:focus-within > ${itemDelete}`, {
	opacity: 1,
});
