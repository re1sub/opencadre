import { CURRENT_MEMBER_ID } from "#/features/workspace/constants/members";
import { toIsoDate } from "#/utils/date";
import { uid } from "#/utils/uid";
import type { Column } from "../types";

const isoFromToday = (offsetDays: number) => {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	return toIsoDate(date);
};

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
				assigneeIds: ["member-alice"],
				dueDate: isoFromToday(6),
			},
			{
				id: uid(),
				title: "Research color palette",
				description:
					"Compare accessible palette candidates against the design tokens.",
				assigneeIds: ["member-bob", "member-carol"],
			},
			{
				id: uid(),
				title: "Set up CI pipeline",
				description: "Lint, typecheck and deploy on every push to main.",
				assigneeIds: [CURRENT_MEMBER_ID],
				dueDate: isoFromToday(-2),
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
				assigneeIds: [CURRENT_MEMBER_ID, "member-alice"],
				dueDate: isoFromToday(0),
			},
			{
				id: uid(),
				title: "Create logo drafts",
				description: "Three quick variations on the monogram mark.",
				assigneeIds: ["member-carol"],
				dueDate: isoFromToday(1),
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
				assigneeIds: [CURRENT_MEMBER_ID],
				dueDate: isoFromToday(2),
			},
			{
				id: uid(),
				title: "Build kanban board",
				description: "Drag and drop cards between columns with dnd-kit.",
				assigneeIds: ["member-bob"],
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
				assigneeIds: ["member-dave"],
				dueDate: isoFromToday(-1),
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
				assigneeIds: ["member-alice"],
			},
			{
				id: uid(),
				title: "Design system tokens",
				description: "Spacing, color and radius tokens published.",
				assigneeIds: [CURRENT_MEMBER_ID, "member-bob"],
			},
		],
	},
];

export const KANBAN_EMPTY_COLUMNS: Column[] = INITIAL_COLUMNS.map(
	({ cards: _, ...rest }) => ({ ...rest, cards: [] }),
);
