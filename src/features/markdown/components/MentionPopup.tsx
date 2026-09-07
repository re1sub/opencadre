import { createEffect, For, Show } from "solid-js";
import type { WorkspaceMember } from "#/features/workspace/types";
import { getInitials } from "#/utils/misc";
import { usePopup } from "#/utils/usePopup";
import {
	memberLabel,
	memberRow,
	memberRowSelected,
	popupPanel,
} from "./mentionPopup.css";

interface MentionPopupProps {
	open: () => boolean;
	anchorRect: () => DOMRect | null;
	members: WorkspaceMember[];
	selectedIndex: () => number;
	onSelect: (member: WorkspaceMember) => void;
	onClose: () => void;
}

interface MentionPopupElement extends HTMLElement {
	anchor: unknown;
	reposition: () => void;
	active: boolean;
}

const isEditorTarget = (target: HTMLElement | null) =>
	Boolean(target?.closest?.("[contenteditable=true], .tiptap, .ProseMirror"));

const MentionPopup = (props: MentionPopupProps) => {
	const popup = usePopup({ onClose: props.onClose, ignore: isEditorTarget });

	let popupEl: MentionPopupElement | undefined;

	let lastAnchorRect: DOMRect | null = null;

	const virtualAnchor = () => {
		const rect = props.anchorRect();
		if (rect) lastAnchorRect = rect;
		return {
			getBoundingClientRect: () => lastAnchorRect ?? new DOMRect(0, 0, 0, 0),
		};
	};

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
				popupEl = el as MentionPopupElement;
			}}
			placement="bottom-start"
			distance={6}
			flip
			shift
			auto-size="vertical"
			active={popup.open()}
		>
			<div class={popupPanel}>
				<Show
					when={props.members.length}
					fallback={
						<div
							style={{
								padding: "var(--wa-space-xs)",
								color: "var(--wa-color-text-quiet)",
							}}
						>
							No matching members
						</div>
					}
				>
					<For each={props.members}>
						{(member, index) => (
							<button
								type="button"
								classList={{
									[memberRow]: true,
									[memberRowSelected]: index() === props.selectedIndex(),
								}}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => props.onSelect(member)}
							>
								<wa-avatar
									initials={getInitials(member.name)}
									label={member.name}
									style={{
										"--size": "24px",
										"background-color":
											member.color ?? "var(--wa-color-neutral-400)",
										color: "var(--wa-color-text-normal)",
									}}
								></wa-avatar>
								<span class={memberLabel}>{member.name}</span>
							</button>
						)}
					</For>
				</Show>
			</div>
		</wa-popup>
	);
};

export default MentionPopup;
