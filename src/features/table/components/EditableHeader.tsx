import type {
	CellValue,
	ColumnDef,
	HeaderRendererComponents,
	SolidDefaultRowData,
} from "@simple-table/solid";
import { createSignal } from "solid-js";
import EditableText from "#/features/ui/EditableText";
import {
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
			<span class={headerSortFilterWrapper}>
				{props.components?.filterIcon}
				{props.components?.sortIcon}
			</span>
		</div>
	);
};

export default EditableHeader;
