import { style } from "@vanilla-extract/css";

export const editedBadge = style({
	marginLeft: "var(--wa-space-2xs)",
	fontSize: "var(--wa-font-size-2xs, 0.75rem)",
	color: "var(--wa-color-text-quiet)",
	whiteSpace: "nowrap",
	flexShrink: 0,
	selectors: {
		"&::part(base)": {
			color: "var(--wa-color-text-quiet)",
			fontSize: "var(--wa-font-size-2xs, 0.75rem)",
			padding: "0 4px",
			minHeight: "auto",
		},
		"&::part(label)": {
			color: "var(--wa-color-text-quiet)",
		},
	},
});

export const tooltipCard = style({
	padding: "var(--wa-space-sm)",
	backgroundColor: "var(--wa-color-panel-background)",
	borderRadius: "var(--wa-border-radius-medium)",
	boxShadow: "var(--wa-shadow-medium)",
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-2xs)",
	textAlign: "left",
});

export const tooltipLabel = style({
	fontSize: "var(--wa-font-size-xs)",
	fontWeight: "bold",
});

export const tooltipTime = style({
	fontSize: "var(--wa-font-size-2xs)",
	color: "var(--wa-color-text-quiet)",
});

export const tooltipTimeSpaced = style({
	fontSize: "var(--wa-font-size-2xs)",
	color: "var(--wa-color-text-quiet)",
	marginBottom: "var(--wa-space-xs)",
});

export const drawerBody = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-l)",
	padding: "var(--wa-space-s) 0",
});

export const detailSection = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-s)",
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--wa-font-size-sm)",
	fontWeight: "600",
	color: "var(--wa-color-text-normal)",
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-2xs)",
});

export const detailGrid = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
});

export const detailRow = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	gap: "var(--wa-space-s)",
	padding: "var(--wa-space-2xs) 0",
	borderBottom: "1px solid var(--wa-color-surface-border)",
	selectors: {
		"&:last-child": {
			borderBottom: "none",
		},
	},
});

export const detailLabel = style({
	fontSize: "var(--wa-font-size-xs)",
	color: "var(--wa-color-text-quiet)",
	flexShrink: 0,
});

export const detailValue = style({
	fontSize: "var(--wa-font-size-xs)",
	color: "var(--wa-color-text-normal)",
	fontWeight: "500",
	textAlign: "right",
	wordBreak: "break-all",
});

export const timeline = style({
	display: "flex",
	flexDirection: "column",
	gap: "0",
	maxHeight: "40vh",
	overflow: "auto",
});

export const timelineItem = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-3xs)",
	padding: "var(--wa-space-xs) 0",
	borderBottom: "1px solid var(--wa-color-surface-border)",
	selectors: {
		"&:last-child": {
			borderBottom: "none",
		},
	},
});

export const timelineHeader = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	minWidth: 0,
});

export const timelineActor = style({
	fontSize: "var(--wa-font-size-xs)",
	fontWeight: "600",
	color: "var(--wa-color-text-normal)",
});

export const timelineTime = style({
	fontSize: "var(--wa-font-size-2xs)",
	color: "var(--wa-color-text-quiet)",
	whiteSpace: "nowrap",
	flexShrink: 0,
});

export const timelineAction = style({
	fontSize: "var(--wa-font-size-xs)",
	color: "var(--wa-color-text-normal)",
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	maxWidth: "14rem",
	minWidth: 0,
	flex: 1,
	display: "block",
});

export const kindBadge = style({
	display: "inline-flex",
	alignItems: "center",
	gap: "var(--wa-space-3xs)",
});
