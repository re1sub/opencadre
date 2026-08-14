import { style } from "@vanilla-extract/css";

export const popupPanel = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-xs)",
	border: "1px solid var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-raised)",
	boxShadow: "var(--wa-shadow-m)",
	maxWidth: "var(--auto-size-available-width)",
	maxHeight: "var(--auto-size-available-height)",
});

export const anchorText = style({
	fontSize: "0.8rem",
	fontStyle: "italic",
	color: "var(--wa-color-text-quiet)",
	padding: "0 var(--wa-space-xs)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});
