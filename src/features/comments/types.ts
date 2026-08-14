export interface Comment {
	id: string;
	parentId: string;
	author: string;
	text: string;
	createdAt: string;
}

export interface CommentThread {
	id: string;
	pageId: string;
	anchorText: string;
	createdAt: string;
	comments: Comment[];
}
