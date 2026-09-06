import { createEffect, Show } from "solid-js";
import CommentsPanel from "#/features/comments/components/CommentsPanel";
import type { CommentReaction, CommentThread } from "#/features/comments/types";
import type { WorkspaceRole } from "#/features/workspace/types";
import { usePopup } from "#/utils/usePopup";

interface CommentPopupProps {
	open: () => boolean;
	anchorRect: () => DOMRect | null;
	thread: () => CommentThread | undefined;
	reactions: CommentReaction[];
	currentUserId: string | null;
	authorNames?: Record<string, string>;
	myRole?: WorkspaceRole;
	onAddComment: (text: string) => void | Promise<void>;
	onToggleReaction: (commentId: string, reaction: string) => void;
	onDeleteComment: (commentId: string) => void;
	onClose: () => void;
	isPopup?: boolean;
}

interface CommentPopupElement extends HTMLElement {
	anchor: unknown;
	reposition: () => void;
	active: boolean;
}

const CommentPopup = (props: CommentPopupProps) => {
	const popup = usePopup({ onClose: props.onClose, ignore: "#comment" });

	let popupEl: CommentPopupElement | undefined;

	const virtualAnchor = () => ({
		getBoundingClientRect: () => props.anchorRect() ?? new DOMRect(0, 0, 0, 0),
	});

	createEffect(() => {
		const shouldBeOpen = props.open();
		if (shouldBeOpen && !popup.open()) {
			popup.openPopup();
		} else if (!shouldBeOpen && popup.open()) {
			popup.close();
		}
	});

	createEffect(() => {
		const isOpen = props.open();
		const rect = props.anchorRect();

		if (!popupEl || !isOpen || !rect) return;

		queueMicrotask(() => {
			if (!popupEl) return;
			popupEl.anchor = virtualAnchor();
			popupEl.active = true;
			popupEl.reposition();
		});
	});

	return (
		<wa-popup
			ref={(el) => {
				popup.popupRef(el);
				popupEl = el as CommentPopupElement;
			}}
			placement="bottom-start"
			distance={6}
			flip
			shift
			auto-size="vertical"
			active={popup.open()}
		>
			<Show when={props.thread()}>
				{(thread) => (
					<CommentsPanel
						comments={thread().comments}
						reactions={props.reactions}
						currentUserId={props.currentUserId}
						authorNames={props.authorNames}
						myRole={props.myRole}
						onAddComment={props.onAddComment}
						onToggleReaction={props.onToggleReaction}
						onDelete={props.onDeleteComment}
						maxHeight="400px"
					/>
				)}
			</Show>
		</wa-popup>
	);
};

export default CommentPopup;
