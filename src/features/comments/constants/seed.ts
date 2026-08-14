import { uid } from "#/utils/uid";
import type { Comment } from "../types";

export const seedComments = (parentId: string): Comment[] => [
	{
		id: uid(),
		parentId,
		author: "Alex Smith",
		text: "I've drafted the API routes for OAuth. Can you review the pull request when you get a chance?",
		createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: uid(),
		parentId,
		author: "John Doe",
		text: "Sure, I'll take a look right after this meeting.",
		createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
	},
];
