import { z } from "zod";

export const columnSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Column title cannot be empty.")
		.max(50, "Column title must be 50 characters or fewer."),
});

export const cardDraftSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Card title cannot be empty.")
		.max(200, "Card title must be 200 characters or fewer.")
		.optional(),
	description: z.string().max(10000).optional(),
	dueDate: z.iso.date().nullable().optional(),
});
