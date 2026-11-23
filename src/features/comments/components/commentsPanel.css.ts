import { style } from "@vanilla-extract/css";

export const commentsPanel = style({
	border: "1px solid var(--wa-color-surface-border)",
	padding: "var(--wa-space-l)",

	backgroundColor: "var(--wa-color-fill-quiet)",
	display: "flex",
	flexDirection: "column",
	gap: 0,
	width: "100%",
	justifyContent: "space-between",
});

export const commentsHeader = style({
	fontSize: "0.95rem",
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	marginBottom: "var(--wa-space-s)",
});

export const commentForm = style({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-s)",
	position: "relative",
	width: "100%",
});

export const commentsFeed = style({
	display: "flex",
	flexDirection: "column-reverse",
	gap: "var(--wa-space-s)",
	overflowY: "auto",
	flex: 1,
	padding: "var(--wa-space-xs)",
	maxHeight: "var(--comments-max-height, 200px)",
});

export const commentBubble = style({
	flex: 1,
	backgroundColor: "var(--wa-color-surface-default)",
	borderRadius: "var(--wa-border-radius-m)",
	border: "1px solid var(--wa-color-surface-border)",
	position: "relative",
});

export const commentMeta = style({
	display: "flex",
	justifyContent: "space-between",
	fontSize: "0.75rem",
	padding: "var(--wa-space-xs)",
	backgroundColor: "var(--wa-color-fill-quiet)",
});

export const commentText = style({
	fontSize: "0.85rem",
	color: "var(--wa-color-text-normal)",
	lineHeight: 1.4,
	padding: "var(--wa-space-m)",
});

export const flexGapS = style({
	display: "flex",
	gap: "var(--wa-space-s)",
});

export const saveButton = style({
	position: "absolute",
	bottom: "0.2rem",
	right: "0.5rem",
});

export const sendIcon = style({
	fontSize: "1.2rem",
});

export const dividerSpacingS = style({
	vars: {
		"--spacing": "var(--wa-space-s)",
	},
});

export const metaAuthorGroup = style({
	display: "flex",
	gap: "var(--wa-space-s)",
	alignItems: "center",
});

export const smallAvatar = style({
	vars: {
		"--size": "25px",
	},
});

export const authorName = style({
	fontWeight: 600,
	color: "var(--wa-color-text-normal)",
});

export const quietText = style({
	color: "var(--wa-color-text-quiet)",
});

export const reactionBar = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-3xs)",
	position: "absolute",
	bottom: 0,
	right: 0,
});

export const reactionIcon = style({
	color: "var(--comments-reaction-color, currentColor)",
	marginRight: "var(--wa-space-3xs)",
});

export const tooltipUsers = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-3xs)",
});

export const tooltipUserRow = style({
	display: "flex",
	gap: "var(--wa-space-xs)",
	alignItems: "center",
});

export const dividerSpacing3xs = style({
	vars: {
		"--spacing": "var(--wa-space-3xs)",
	},
});

export const extraUsersFontSize = style({
	fontSize: "var(--wa-font-size-xs)",
});

export const reactionPicker = style({
	display: "flex",
	flexWrap: "wrap",
});

export const dropdownItemPadding = style({
	padding: "var(--wa-space-xs)",
});

export const dropdownReactionIcon = style({
	color: "var(--comments-dropdown-reaction-color, currentColor)",
});
