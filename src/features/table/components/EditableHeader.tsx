import type {
	CellValue,
	ColumnDef,
	HeaderRendererComponents,
	SolidDefaultRowData,
} from "@simple-table/solid";
import { createSignal } from "solid-js";
import EditableText from "#/features/ui/EditableText";
import PopupMenu from "#/features/ui/PopupMenu";
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

const EditableHeader = <TData extends SolidDefaultRowData>(
	props: EditableHeaderProps<TData>,
) => {
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

	const menuItems = [
		{
			id: `duplicate-${props.header.accessor}`,
			icon: "copy",
			label: "Duplicate column",
			onClick: () => props.onColumnDuplicate(props.header),
		},
		{
			id: `delete-${props.header.accessor}`,
			icon: "trash-2",
			label: "Delete column",
			onClick: () => props.onColumnDelete(props.header),
		},
	];

	const getContextTarget = () =>
		(document.querySelector(
			`[data-accessor="${props.header.accessor}"]`,
		) as HTMLElement) ??
		(document.querySelector(".st-header-cell")?.closest("th") as HTMLElement) ??
		null;

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
				<PopupMenu items={menuItems} contextMenuTarget={getContextTarget}>
					{({ ref, toggle }) => (
						<span class={columnActions} ref={ref}>
							<wa-button
								id={`actions-${props.header.accessor}`}
								size="s"
								appearance="plain"
								onClick={toggle}
								aria-label="Column actions"
							>
								<wa-icon
									name="ellipsis-vertical"
									label="Column actions"
								></wa-icon>
							</wa-button>
						</span>
					)}
				</PopupMenu>
			</span>
		</div>
	);
};

export default EditableHeader;
