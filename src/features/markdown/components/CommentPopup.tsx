import { createEffect, Show } from "solid-js";
import CommentsPanel from "#/features/comments/components/CommentsPanel";
import type { Comment, CommentThread } from "#/features/comments/types";
import { usePopup } from "#/utils/usePopup";

interface CommentPopupProps {
	open: () => boolean;
	anchorRect: () => DOMRect | null;
	thread: () => CommentThread | undefined;
	author: string;
	onReplaceComments: (comments: Comment[]) => void;
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
						parentId={thread().id}
						comments={thread().comments}
						author={props.author}
						onChange={props.onReplaceComments}
						onDelete={props.onDeleteComment}
						maxHeight="400px"
					/>
				)}
			</Show>
		</wa-popup>
	);
};

export default CommentPopup;
