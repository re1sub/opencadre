import { z } from "zod";

export const tagSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Tag name cannot be empty.")
		.max(50, "Tag name must be 50 characters or fewer."),
});
