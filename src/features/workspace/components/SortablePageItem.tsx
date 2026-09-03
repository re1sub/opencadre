import { useSortable } from "@dnd-kit/solid/sortable";
import { createSignal } from "solid-js";
import PopupMenu from "#/features/ui/PopupMenu";
import { PAGE_KIND_META, type Page } from "../types";
import { pageButton, pageMenuTrigger, pageRow } from "./workspace.css";

interface SortablePageItemProps {
	entry: Page;
	index: number;
	isActive: boolean;
	onRequestDelete: (id: string) => void;
	onDuplicatePage: (id: string) => void;
}

export const SortablePageItem = (props: SortablePageItemProps) => {
	const [liRef, setLiRef] = createSignal<HTMLElement | null>(null);

	const { ref, isDragging, isDropTarget } = useSortable({
		get id() {
			return props.entry.id;
		},
		get index() {
			return props.index;
		},
		group: "pages",
		type: "page",
		accept: ["page"],
	});

	const menuItems = [
		{
			id: `duplicate-${props.entry.id}`,
			icon: "copy",
			label: "Duplicate page",
			onClick: () => props.onDuplicatePage(props.entry.id),
		},
		{
			id: `delete-${props.entry.id}`,
			icon: "trash-2",
			label: "Delete page",
			onClick: () => props.onRequestDelete(props.entry.id),
		},
	];

	return (
		<li
			ref={(el) => {
				ref(el);
				setLiRef(el);
			}}
			class={pageRow}
			style={{
				opacity: isDragging() ? 0.5 : 1,
			}}
			classList={{
				"is-drop-target": isDropTarget(),
			}}
		>
			<wa-button
				variant={props.isActive ? "brand" : "neutral"}
				appearance={props.isActive ? "filled" : "plain"}
				class={pageButton}
				href={`/workspace/p/${props.entry.id}`}
				onClick={(e) => {
					const waPage = (e.currentTarget as HTMLElement).closest("wa-page");

					if (waPage) {
						waPage.hideNavigation();
					}
				}}
			>
				<wa-icon
					slot="start"
					name={PAGE_KIND_META[props.entry.kind].icon}
					label={PAGE_KIND_META[props.entry.kind].iconLabel}
				></wa-icon>
				{props.entry.title}
			</wa-button>

			<PopupMenu items={menuItems} contextMenuTarget={() => liRef()}>
				{({ ref: triggerRef, toggle }) => (
					<wa-button
						ref={triggerRef}
						slot="trigger"
						variant={props.isActive ? "brand" : "neutral"}
						appearance="plain"
						size="xs"
						class={pageMenuTrigger}
						aria-label={`Options for ${props.entry.title}`}
						onClick={toggle}
					>
						<wa-icon name="ellipsis-vertical"></wa-icon>
					</wa-button>
				)}
			</PopupMenu>
		</li>
	);
};

export default SortablePageItem;
