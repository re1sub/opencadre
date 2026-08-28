import type { Json } from "#/types/database";
import type { PageKind } from "../types";

export interface PageTemplate {
	id: string;
	kind: PageKind;
	label: string;
	description: string;
	icon: string;
	title: string;
	content: Json;
}

const TEAM_DIRECTORY_CONTENT = {
	columns: [
		{ accessor: "col_name", label: "Name", width: 180 },
		{ accessor: "col_role", label: "Role", width: 180 },
		{ accessor: "col_department", label: "Department", width: 160 },
		{ accessor: "col_email", label: "Email", width: 240 },
		{ accessor: "col_location", label: "Location", width: 160 },
		{ accessor: "col_active", label: "Active", width: 100 },
	],
	rows: [
		{
			id: "row_1",
			col_name: "Alex Chen",
			col_role: "Frontend Developer",
			col_department: "Engineering",
			col_email: "alex@opencadre.dev",
			col_location: "San Francisco",
			col_active: "true",
		},
		{
			id: "row_2",
			col_name: "Sarah Kim",
			col_role: "Product Designer",
			col_department: "Design",
			col_email: "sarah@opencadre.dev",
			col_location: "New York",
			col_active: "true",
		},
		{
			id: "row_3",
			col_name: "Marcus Johnson",
			col_role: "Backend Developer",
			col_department: "Engineering",
			col_email: "marcus@opencadre.dev",
			col_location: "London",
			col_active: "true",
		},
		{
			id: "row_4",
			col_name: "Priya Patel",
			col_role: "DevOps Engineer",
			col_department: "Infrastructure",
			col_email: "priya@opencadre.dev",
			col_location: "Berlin",
			col_active: "true",
		},
		{
			id: "row_5",
			col_name: "Jordan Lee",
			col_role: "Product Manager",
			col_department: "Product",
			col_email: "jordan@opencadre.dev",
			col_location: "Toronto",
			col_active: "true",
		},
		{
			id: "row_6",
			col_name: "Emma Wilson",
			col_role: "QA Engineer",
			col_department: "Engineering",
			col_email: "emma@opencadre.dev",
			col_location: "Sydney",
			col_active: "false",
		},
		{
			id: "row_7",
			col_name: "David Park",
			col_role: "Tech Lead",
			col_department: "Engineering",
			col_email: "david@opencadre.dev",
			col_location: "Seoul",
			col_active: "true",
		},
	],
} satisfies Json;

const MEETING_NOTES_MARKDOWN = `# Meeting notes

## Attendees

## Agenda

## Decisions

## Action items
`;

const PROJECT_OVERVIEW_MARKDOWN = `# Project overview

## Goal

## Status

## Links

## Next steps
`;

export const PAGE_TEMPLATES: PageTemplate[] = [
	{
		id: "team-directory",
		kind: "table",
		label: "Team directory",
		description: "A shareable contact list for your team.",
		icon: "users",
		title: "Team directory",
		content: TEAM_DIRECTORY_CONTENT,
	},
	{
		id: "meeting-notes",
		kind: "markdown",
		label: "Meeting notes",
		description: "Agenda, decisions, and action items.",
		icon: "calendar-check",
		title: "Meeting notes",
		content: MEETING_NOTES_MARKDOWN,
	},
	{
		id: "project-overview",
		kind: "markdown",
		label: "Project overview",
		description: "Goals, status, and links for a project.",
		icon: "target",
		title: "Project overview",
		content: PROJECT_OVERVIEW_MARKDOWN,
	},
];
