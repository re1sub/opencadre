import { globalStyle, style } from "@vanilla-extract/css";

export const board = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-m)",
	height: "calc(100dvh - 170px)",
	minHeight: 480,
});

export const boardHeader = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--wa-space-m)",
});

export const boardTitle = style({
	margin: 0,
	fontSize: "1.5rem",
	fontWeight: 600,
});

export const boardSubtitle = style({
	margin: 0,
	color: "var(--wa-color-text-quiet)",
	fontSize: "0.85rem",
});

export const columnsTrack = style({
	display: "flex",
	alignItems: "flex-start",
	gap: "var(--wa-space-xs)",
	overflowX: "auto",
	minHeight: "85vh",
	paddingBottom: "var(--wa-space-m)",
	"@media": {
		"(max-width: 480px)": {
			scrollSnapType: "x mandatory",
			scrollBehavior: "smooth",
			scrollPaddingLeft: "var(--wa-space-m)",
			scrollPaddingRight: "var(--wa-space-m)",
		},
	},
});

globalStyle(
	`${board}:has([aria-grabbed="true"], [data-dragging="true"], .is-dragging) ${columnsTrack}`,
	{
		scrollSnapType: "none",
		scrollBehavior: "auto",
	},
);

globalStyle(
	`body:has([aria-grabbed="true"], [data-dragging="true"], .is-dragging) ${columnsTrack}`,
	{
		scrollSnapType: "none",
		scrollBehavior: "auto",
	},
);

export const column = style({
	width: 288,
	flexShrink: 0,
	display: "flex",
	flexDirection: "column",
	maxHeight: "100%",
	backgroundColor: "color-mix(in srgb, var(--column-accent) 30%, transparent)",
	border: "1px solid var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-l)",
	overflow: "hidden",
	transition: "border-color 0.15s ease, box-shadow 0.15s ease",
	"@media": {
		"(max-width: 480px)": {
			scrollSnapAlign: "start",
			scrollSnapStop: "always",
		},
	},
});

export const columnDropTarget = style({
	borderColor: "var(--wa-color-brand)",
	boxShadow:
		"0 0 0 2px color-mix(in srgb, var(--wa-color-brand) 30%, transparent)",
});

export const columnCardDropTarget = style({
	border: "1px dashed var(--wa-color-brand)",
	boxShadow:
		"0 0 0 2px color-mix(in srgb, var(--wa-color-brand) 30%, transparent)",
});

export const columnDragging = style({
	opacity: 0.4,
});

export const columnHeader = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	padding: "var(--wa-space-m)",
});

export const columnHeaderTitle = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-xs)",
	flexGrow: 1,
	minWidth: 0,
	borderRadius: "var(--wa-border-radius-l)",
	padding: "0.2rem 1rem",
	paddingRight: "0.2rem",
	backgroundColor: "color-mix(in srgb, var(--column-accent) 40%, white 10%)",
	boxShadow: "0 0 1px 1px var(--column-accent)",
	cursor: "grab",
	touchAction: "manipulation",
	userSelect: "none",
});

export const columnDot = style({
	width: 10,
	height: 10,
	borderRadius: "50%",
	flexShrink: 0,
	backgroundColor: "var(--column-accent)",
	boxShadow:
		"0 0 1px 1px color-mix(in srgb, var(--column-accent) 40%, white 50%)",
});

export const columnTitle = style({
	flexGrow: 1,
	fontSize: "0.95rem",
	fontWeight: 600,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const columnCount = style({
	fontSize: "0.8rem",
	color: "var(--wa-color-text-quiet)",
	marginLeft: "var(--wa-space-xs)",
});

export const columnControlsButton = style({
	selectors: {
		"&::part(button):hover": {
			backgroundColor:
				"color-mix(in srgb, var(--column-accent) 10%, transparent)",
		},
		"&::part(label)": {
			color: "var(--wa-color-text-normal, #ffffff)",
			fontSize: "1.1rem",
		},
	},
});

export const columnCards = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
	padding: "0 var(--wa-space-m) var(--wa-space-m)",
	overflowY: "auto",
	overflowX: "hidden",
	scrollbarWidth: "none",
	flexGrow: 1,
});

export const card = style({
	width: "100%",
	textDecoration: "none",
	color: "inherit",
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
	padding: "var(--wa-space-m)",
	borderRadius: "var(--wa-border-radius-m)",
	cursor: "pointer",
	touchAction: "manipulation",
	userSelect: "none",
	backgroundColor: "color-mix(in srgb, var(--column-accent) 30%, transparent)",
	transition:
		"opacity 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
	selectors: {
		"&:hover": {
			boxShadow: "var(--wa-shadow-m)",
			backgroundColor:
				"color-mix(in srgb, var(--column-accent) 55%, transparent)",
		},
	},
});

export const cardDragging = style({
	opacity: 0.4,
});

export const cardDropTarget = style({
	borderColor: "var(--wa-color-brand)",
});

export const cardTags = style({
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--wa-space-2xs)",
	position: "relative",
});

export const cardTag = style({
	fontSize: "0.75rem",
	lineHeight: 1,
	padding: "3px 8px",
	borderRadius: "var(--wa-border-radius-m)",
	color: "var(--wa-color-text-normal)",
	whiteSpace: "nowrap",
});

export const cardTitle = style({
	margin: 0,
	fontSize: "0.9rem",
	fontWeight: 500,
});

export const cardMeta = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--wa-space-2xs)",
	color: "var(--wa-color-text-quiet)",
	fontSize: "0.75rem",
});

export const cardDescription = style({
	margin: 0,
	fontSize: "0.8rem",
	color: "var(--wa-color-text-quiet)",
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical",
	overflow: "hidden",
});

export const addCardButton = style({
	margin: "0 var(--wa-space-m) var(--wa-space-m)",
	selectors: {
		"&::part(button):hover": {
			backgroundColor:
				"color-mix(in srgb, var(--column-accent) 10%, transparent)",
		},
	},
});

export const addColumnButton = style({
	width: 288,
	flexShrink: 0,
	alignSelf: "flex-start",
	border: "1px dashed var(--wa-color-surface-border)",
	borderRadius: "var(--wa-border-radius-l)",
	color: "var(--wa-color-text-quiet)",
	transition: "border-color 0.15s ease, color 0.15s ease",
	scrollSnapAlign: "start",
	selectors: {
		"&:hover": {
			borderColor: "var(--wa-color-brand)",
			color: "var(--wa-color-text-normal)",
		},
	},
});

export const dialogBody = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-m)",
	padding: "var(--wa-space-m) var(--wa-space-m) 0",
});

export const dialogRow = style({
	display: "flex",
	flexDirection: "column",
	gap: "var(--wa-space-xs)",
});

export const dialogLabel = style({
	fontSize: "0.8rem",
	fontWeight: 600,
	color: "var(--wa-color-text-quiet)",
});

export const dialogActions = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	gap: "var(--wa-space-m)",
});
