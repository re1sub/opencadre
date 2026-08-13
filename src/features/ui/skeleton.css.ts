import { style } from "@vanilla-extract/css";

export const skeletonContainer = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  width: "100%",
  height: "100%",
  padding: "1rem",
});

export const skeletonItem = style({
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
});
