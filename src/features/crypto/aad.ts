export type Aad =
	| { kind: "identity"; userId: string }
	| { kind: "recovery"; userId: string }
	| { kind: "device"; userId: string; deviceId: string }
	| {
			kind: "workspace-key";
			workspaceId: string;
			userId: string;
			keyId: string;
	  }
	| { kind: "user-content-key"; userId: string; keyId: string }
	| { kind: "page-title"; pageId: string }
	| { kind: "page"; pageId: string }
	| { kind: "comment"; commentId: string }
	| { kind: "tag"; tagId: string }
	| { kind: "workspace"; workspaceId: string; field: string }
	| {
			kind: "notification";
			workspaceId: string;
			commentId: string;
			field: string;
	  }
	| { kind: "ydoc"; entityType: string; entityId: string }
	| { kind: "card"; cardId: string }
	| { kind: "column"; columnId: string }
	| { kind: "device-link"; requestId: string; publicKeyHash: string };

export function aadFor(value: Aad): string {
	switch (value.kind) {
		case "identity":
			return `user_keys:${value.userId}`;
		case "recovery":
			return `user_keys:${value.userId}:recovery`;
		case "device":
			return `user_devices:${value.userId}:${value.deviceId}`;
		case "workspace-key":
			return `workspace_keys:${value.workspaceId}:${value.userId}:${value.keyId}`;
		case "user-content-key":
			return `user_content_keys:${value.userId}:${value.keyId}`;
		case "page-title":
			return `pages:${value.pageId}`;
		case "page":
			return `page_content:${value.pageId}`;
		case "comment":
			return `comments:${value.commentId}`;
		case "tag":
			return `tags:${value.tagId}`;
		case "workspace":
			return `workspaces:${value.workspaceId}:${value.field}`;
		case "notification":
			return `notifications:${value.workspaceId}:${value.commentId}:${value.field}`;
		case "ydoc":
			return `ydocs:${value.entityType}:${value.entityId}`;
		case "card":
			return `cards:${value.cardId}`;
		case "column":
			return `columns:${value.columnId}`;
		case "device-link":
			return `device_link:${value.requestId}:${value.publicKeyHash}`;
	}
}

export const aadString = (value: string): string => value;
