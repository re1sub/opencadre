export type CommentEntityType = "page" | "card";

export interface CommentEntity {
	type: CommentEntityType;
	id: string;
}

export interface Comment {
	id: string;
	parentId: string;
	author: string;
	authorId: string;
	text: string;
	createdAt: string;
}

export interface CommentThread {
	id: string;
	entityType: CommentEntityType;
	entityId: string;
	anchorText: string;
	createdAt: string;
	comments: Comment[];
}

export interface CommentReaction {
	id: string;
	commentId: string;
	userId: string;
	reaction: string;
	createdAt: string;
}
