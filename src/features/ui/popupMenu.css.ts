import { style } from "@vanilla-extract/css";

export const popupMenuContent = style({
	backgroundColor: "var(--wa-color-surface-default)",
	borderRadius: "var(--wa-border-radius-m)",
	boxShadow: "var(--wa-shadow-small)",
	border: "1px solid var(--wa-color-neutral-200)",
	display: "flex",
	flexDirection: "column",
	justifyContent: "flex-start",
});
