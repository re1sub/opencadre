import { style } from "@vanilla-extract/css";

export const popupPanel = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-m)",
	padding: "var(--wa-space-xs)",
	border: "var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	boxShadow: "var(--wa-shadow-m)",
	overflow: "auto",
	maxWidth: "var(--auto-size-available-width)",
	maxHeight: "var(--auto-size-available-height)",
});

export const swatchGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
	gap: "6px",
	marginTop: "8px",
	width: "100%",
});

export const swatchWrap = style({
	position: "relative",
});

export const swatchButton = style({
	width: "100%",
});

export const swatchIcon = style({
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
});