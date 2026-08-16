import { style } from "@vanilla-extract/css";

export const commentsPanel = style({
  border: "1px solid var(--wa-color-surface-border)",
  borderRadius: "var(--wa-border-radius-l)",
  padding: "var(--wa-space-m)",
  backgroundColor: "var(--wa-color-surface-raised)",
  display: "flex",
  flexDirection: "column",
  gap: 0,
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
  "@media": {
    "(max-width: 768px)": {
      maxWidth: "65vw",
    },
  },
});

export const commentsFeed = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: "var(--wa-space-s)",
  overflowY: "auto",
  flex: 1,
  paddingTop: "var(--wa-space-xs)",
});

export const commentBubble = style({
  flex: 1,
  backgroundColor: "var(--wa-color-surface-default)",
  padding: "var(--wa-space-s)",
  borderRadius: "var(--wa-border-radius-m)",
  border: "1px solid var(--wa-color-surface-border)",
});

export const commentMeta = style({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "0.75rem",
  marginBottom: "0.25rem",
});

export const commentText = style({
  fontSize: "0.85rem",
  color: "var(--wa-color-text-normal)",
  lineHeight: 1.4,
  marginTop: "var(--wa-space-m)",
});
