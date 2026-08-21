import { uid } from "#/utils/uid";
import type { Column } from "../types";

export const INITIAL_COLUMNS: Column[] = [
	{
		id: uid(),
		title: "Backlog",
		color: "#8b8b8b",
		cards: [
			{
				id: uid(),
				title: "Design landing page hero",
				description:
					"Explore layout options and pick a direction for the hero section.",
			},
			{
				id: uid(),
				title: "Research color palette",
				description:
					"Compare accessible palette candidates against the design tokens.",
			},
			{
				id: uid(),
				title: "Set up CI pipeline",
				description: "Lint, typecheck and deploy on every push to main.",
			},
		],
	},
	{
		id: uid(),
		title: "To Do",
		color: "#3b82f6",
		cards: [
			{
				id: uid(),
				title: "Write API spec",
				description: "Draft the request and response shapes for the pages API.",
			},
			{
				id: uid(),
				title: "Create logo drafts",
				description: "Three quick variations on the monogram mark.",
			},
		],
	},
	{
		id: uid(),
		title: "In Progress",
		color: "#f59e0b",
		cards: [
			{
				id: uid(),
				title: "Implement auth flow",
				description: "Wire up Supabase auth and persist the session.",
			},
			{
				id: uid(),
				title: "Build kanban board",
				description: "Drag and drop cards between columns with dnd-kit.",
			},
		],
	},
	{
		id: uid(),
		title: "In Review",
		color: "#8b5cf6",
		cards: [
			{
				id: uid(),
				title: "Refactor sidebar components",
				description: "Break the navigation into smaller, testable pieces.",
			},
		],
	},
	{
		id: uid(),
		title: "Done",
		color: "#10b981",
		cards: [
			{
				id: uid(),
				title: "Set up Supabase project",
				description: "Project created and anon key wired into the client.",
			},
			{
				id: uid(),
				title: "Design system tokens",
				description: "Spacing, color and radius tokens published.",
			},
		],
	},
];

export const KANBAN_EMPTY_COLUMNS: Column[] = INITIAL_COLUMNS.map(
	({ cards: _, ...rest }) => ({ ...rest, cards: [] }),
);
