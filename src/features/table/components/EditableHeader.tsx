import type {
	CellValue,
	ColumnDef,
	HeaderRendererComponents,
	SolidDefaultRowData,
} from "@simple-table/solid";
import { createSignal, onCleanup, onMount } from "solid-js";
import ToolbarButton from "#/features/markdown/components/ToolbarButton";
import EditableText from "#/features/ui/EditableText";
import { usePopup } from "#/utils/usePopup";
import {
	columnActions,
	editableHeaderWrapper,
	headerSortFilterWrapper,
	tableHeaderInputStyle,
} from "../tablePage.css";

interface EditableHeaderProps<
	TData extends SolidDefaultRowData = SolidDefaultRowData,
> {
	header: ColumnDef<TData, CellValue>;
	components?: HeaderRendererComponents;
	onHeaderEdit: (header: ColumnDef<TData, CellValue>, newLabel: string) => void;
	onColumnDelete: (header: ColumnDef<TData, CellValue>) => void;
	onColumnDuplicate: (header: ColumnDef<TData, CellValue>) => void;
}

interface PopupElement extends HTMLElement {
	anchor: unknown;
	reposition: () => void;
	active: boolean;
}

const EditableHeader = <TData extends SolidDefaultRowData>(
	props: EditableHeaderProps<TData>,
) => {
	const popup = usePopup();
	let popupEl: PopupElement | undefined;
	let triggerEl: HTMLElement | undefined;

	const [tempValue, setTempValue] = createSignal(props.header.label ?? "");

	const save = () => {
		const val = tempValue().trim();
		if (val !== "") {
			props.onHeaderEdit(props.header, val);
		}
	};

	const cancel = () => {
		setTempValue(props.header.label ?? "");
	};

	const handleAction = (kind: "duplicate" | "delete") => {
		popup.close();
		if (kind === "duplicate") props.onColumnDuplicate(props.header);
		else props.onColumnDelete(props.header);
	};

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
		const label =
			document.querySelector(`[data-accessor="${props.header.accessor}"]`) ??
			document.querySelector(".st-header-cell")?.closest("th");
		label?.addEventListener("contextmenu", onContextMenu as EventListener);
		onCleanup(() => {
			label?.removeEventListener("contextmenu", onContextMenu as EventListener);
		});
	});

	const actionsBtnDef = {
		id: `actions-${props.header.accessor}`,
		icon: "ellipsis-vertical",
		label: "Column actions",
	};

	const duplicateBtnDef = {
		id: `duplicate-${props.header.accessor}`,
		icon: "copy",
		label: "Duplicate column",
	};

	const deleteBtnDef = {
		id: `delete-${props.header.accessor}`,
		icon: "trash-2",
		label: "Delete column",
	};

	return (
		<div class={editableHeaderWrapper}>
			<EditableText
				class={`${tableHeaderInputStyle} st-header-label-text left-aligned`}
				value={tempValue()}
				onChange={setTempValue}
				isolateEvents
				onConfirm={save}
				onCancel={cancel}
			/>
			<span
				class={headerSortFilterWrapper}
				onClick={(e) => e.stopPropagation()}
			>
				{props.components?.filterIcon}
				{props.components?.sortIcon}
				<span
					class={columnActions}
					ref={(el) => {
						triggerEl = el;
						popup.triggerRef(el);
					}}
				>
					<ToolbarButton
						button={actionsBtnDef}
						id={actionsBtnDef.id}
						onClick={togglePopup}
						active={() => popup.open()}
						showLabels={false}
					/>
				</span>
			</span>

			<wa-popup
				ref={(el) => {
					popup.popupRef(el);
					popupEl = el as PopupElement;
				}}
				placement="bottom-start"
				distance={6}
				flip
				shift
				auto-size="vertical"
				active={popup.open()}
				style={{ "z-index": "100" }}
			>
				<div
					class="wa-dropdown-menu"
					style={{
						"background-color": "var(--wa-color-surface-default)",
						"border-radius": "var(--wa-border-radius-m)",
						"box-shadow": "var(--wa-shadow-small)",
						border: "1px solid var(--wa-color-neutral-200)",
						display: "flex",
						"flex-direction": "column",
						"justify-content": "flex-start",
					}}
				>
					<ToolbarButton
						button={duplicateBtnDef}
						id={duplicateBtnDef.id}
						onClick={() => handleAction("duplicate")}
						active={() => false}
						showLabels
					/>
					<ToolbarButton
						button={deleteBtnDef}
						id={deleteBtnDef.id}
						onClick={() => handleAction("delete")}
						active={() => false}
						showLabels
					/>
				</div>
			</wa-popup>
		</div>
	);
};

export default EditableHeader;
