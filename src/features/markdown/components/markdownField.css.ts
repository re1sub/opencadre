import { globalStyle, style } from "@vanilla-extract/css";
import { applyMarkdownContentStyles } from "../markdownContent.css";

export const field = style({
	display: "flex",
	flexDirection: "column",
	border: "1px solid var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-m)",
	backgroundColor: "var(--wa-color-surface-default)",
	overflow: "hidden",
});

export const toolbar = style({
	display: "flex",
	alignItems: "center",
	maxWidth: "100%",
	gap: "var(--wa-space-2xs)",
	padding: "var(--wa-space-2xs)",
	borderBottom: "1px solid var(--wa-color-surface-border)",
	backgroundColor: "var(--wa-color-surface-raised)",
	overflowY: "hidden",
	overflowX: "auto",
	selectors: {
		"&::-webkit-scrollbar": {
			height: "5px",
		},
	},
});

export const content = style({
	padding: "var(--wa-space-xs)",
	outline: "none",
	cursor: "text",
	fontSize: "0.9rem",
	lineHeight: 1.5,
	overflowY: "auto",
	maxHeight: "150px",
});

applyMarkdownContentStyles(content, "compact");

export const activeButton = style({});

globalStyle(`.${toolbar} wa-button.${activeButton}::part(base)`, {
	backgroundColor: "var(--wa-color-brand-fill-quiet)",
	color: "var(--wa-color-brand-on-quiet)",
});

globalStyle(`.${content} p.is-editor-empty:first-child::before`, {
	content: "attr(data-placeholder)",
	color: "var(--wa-color-text-quiet)",
	opacity: 0.8,
	float: "left",
	height: 0,
	pointerEvents: "none",
});
