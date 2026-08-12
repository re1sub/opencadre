import type { Column } from "../types";

export const INITIAL_COLUMNS: Column[] = [
	{
		id: "col-backlog",
		title: "Backlog",
		color: "#8b8b8b",
		cards: [
			{
				id: "card-1",
				title: "Design landing page hero",
				description:
					"Explore layout options and pick a direction for the hero section.",
			},
			{
				id: "card-2",
				title: "Research color palette",
				description:
					"Compare accessible palette candidates against the design tokens.",
			},
			{
				id: "card-3",
				title: "Set up CI pipeline",
				description: "Lint, typecheck and deploy on every push to main.",
			},
		],
	},
	{
		id: "col-todo",
		title: "To Do",
		color: "#3b82f6",
		cards: [
			{
				id: "card-4",
				title: "Write API spec",
				description: "Draft the request and response shapes for the pages API.",
			},
			{
				id: "card-5",
				title: "Create logo drafts",
				description: "Three quick variations on the monogram mark.",
			},
		],
	},
	{
		id: "col-progress",
		title: "In Progress",
		color: "#f59e0b",
		cards: [
			{
				id: "card-6",
				title: "Implement auth flow",
				description: "Wire up Supabase auth and persist the session.",
			},
			{
				id: "card-7",
				title: "Build kanban board",
				description: "Drag and drop cards between columns with dnd-kit.",
			},
		],
	},
	{
		id: "col-review",
		title: "In Review",
		color: "#8b5cf6",
		cards: [
			{
				id: "card-8",
				title: "Refactor sidebar components",
				description: "Break the navigation into smaller, testable pieces.",
			},
		],
	},
	{
		id: "col-done",
		title: "Done",
		color: "#10b981",
		cards: [
			{
				id: "card-9",
				title: "Set up Supabase project",
				description: "Project created and anon key wired into the client.",
			},
			{
				id: "card-10",
				title: "Design system tokens",
				description: "Spacing, color and radius tokens published.",
			},
		],
	},
];
