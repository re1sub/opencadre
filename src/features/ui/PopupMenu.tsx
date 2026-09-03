import type WaPopup from "@awesome.me/webawesome/dist/components/popup/popup.js";
import { For, type JSX, onCleanup, onMount } from "solid-js";
import ToolbarButton from "#/features/markdown/components/ToolbarButton";
import { usePopup } from "#/utils/usePopup";
import { popupMenuContent } from "./popupMenu.css";

interface PopupMenuItem {
	id: string;
	icon: string;
	label: string;
	onClick: () => void;
}

interface PopupMenuProps {
	items: PopupMenuItem[];
	placement?: WaPopup["placement"];
	contextMenuTarget?: () => HTMLElement | null;
	children: (props: {
		ref: (el: HTMLElement) => void;
		toggle: () => void;
	}) => JSX.Element;
}

interface WaPopupElement extends HTMLElement {
	anchor: unknown;
	reposition: () => void;
	active: boolean;
}

const PopupMenu = (props: PopupMenuProps) => {
	const popup = usePopup();
	let popupEl: WaPopupElement | undefined;
	let triggerEl: HTMLElement | undefined;

	const togglePopup = () => {
		if (!popupEl) return;
		popupEl.anchor = triggerEl;
		popup.toggle();
	};

	const onContextMenu = (e: Event) => {
		const mouseEvent = e as MouseEvent;
		mouseEvent.preventDefault();
		if (!popupEl) return;

		const { clientX, clientY } = mouseEvent;
		popupEl.anchor = {
			getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0),
		};
		popupEl.active = true;
		popup.openPopup();
		queueMicrotask(() => popupEl?.reposition());
	};

	onMount(() => {
		const target = props.contextMenuTarget?.();
		if (!target) return;
		target.addEventListener("contextmenu", onContextMenu as EventListener);
		onCleanup(() => {
			target.removeEventListener("contextmenu", onContextMenu as EventListener);
		});
	});

	return (
		<>
			{props.children({
				ref: (el) => {
					triggerEl = el;
					popup.triggerRef(el);
				},
				toggle: togglePopup,
			})}

			<wa-popup
				ref={(el) => {
					popup.popupRef(el);
					popupEl = el as WaPopupElement;
				}}
				placement={props.placement ?? "bottom-start"}
				distance={6}
				flip
				shift
				auto-size="vertical"
				active={popup.open()}
				style={{ "z-index": "100" }}
			>
				<div class={`${popupMenuContent} wa-dropdown-menu`}>
					<For each={props.items}>
						{(item) => (
							<ToolbarButton
								button={{ id: item.id, icon: item.icon, label: item.label }}
								id={item.id}
								onClick={() => {
									popup.close();
									item.onClick();
								}}
								active={() => false}
								showLabels
							/>
						)}
					</For>
				</div>
			</wa-popup>
		</>
	);
};

export default PopupMenu;
