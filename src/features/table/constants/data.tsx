import type {
	CellValue,
	ColumnDef,
	HeaderRendererComponents,
	SolidColumnDef,
} from "@simple-table/solid";
import EditableHeader from "../components/EditableHeader";

type GridRow = { id: string } & Record<string, CellValue>;

export const INITIAL_COLUMNS: (
	onHeaderEdit: (
		header: ColumnDef<GridRow, CellValue>,
		newLabel: string,
	) => void,
) => SolidColumnDef<GridRow>[] = (onHeaderEdit) => [
	{
		accessor: "col_name",
		label: "Name",
		width: 180,
		sortable: true,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={onHeaderEdit}
			/>
		),
	},
	{
		accessor: "col_role",
		label: "Role",
		width: 180,
		sortable: true,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={onHeaderEdit}
			/>
		),
	},
	{
		accessor: "col_department",
		label: "Department",
		width: 160,
		sortable: true,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={onHeaderEdit}
			/>
		),
	},
	{
		accessor: "col_email",
		label: "Email",
		width: 240,
		sortable: true,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={onHeaderEdit}
			/>
		),
	},
	{
		accessor: "col_location",
		label: "Location",
		width: 160,
		sortable: true,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={onHeaderEdit}
			/>
		),
	},
	{
		accessor: "col_active",
		label: "Active",
		width: 100,
		sortable: true,
		editable: true,
		headerRenderer: (props) => (
			<EditableHeader
				header={props.header}
				components={props.components}
				onHeaderEdit={onHeaderEdit}
			/>
		),
	},
];

export const INITIAL_ROWS: GridRow[] = [
	{
		id: "row_1",
		col_name: "Alex Chen",
		col_role: "Frontend Developer",
		col_department: "Engineering",
		col_email: "alex@opencadre.dev",
		col_location: "San Francisco",
		col_active: "true",
	},
	{
		id: "row_2",
		col_name: "Sarah Kim",
		col_role: "Product Designer",
		col_department: "Design",
		col_email: "sarah@opencadre.dev",
		col_location: "New York",
		col_active: "true",
	},
	{
		id: "row_3",
		col_name: "Marcus Johnson",
		col_role: "Backend Developer",
		col_department: "Engineering",
		col_email: "marcus@opencadre.dev",
		col_location: "London",
		col_active: "true",
	},
	{
		id: "row_4",
		col_name: "Priya Patel",
		col_role: "DevOps Engineer",
		col_department: "Infrastructure",
		col_email: "priya@opencadre.dev",
		col_location: "Berlin",
		col_active: "true",
	},
	{
		id: "row_5",
		col_name: "Jordan Lee",
		col_role: "Product Manager",
		col_department: "Product",
		col_email: "jordan@opencadre.dev",
		col_location: "Toronto",
		col_active: "true",
	},
	{
		id: "row_6",
		col_name: "Emma Wilson",
		col_role: "QA Engineer",
		col_department: "Engineering",
		col_email: "emma@opencadre.dev",
		col_location: "Sydney",
		col_active: "false",
	},
	{
		id: "row_7",
		col_name: "David Park",
		col_role: "Tech Lead",
		col_department: "Engineering",
		col_email: "david@opencadre.dev",
		col_location: "Seoul",
		col_active: "true",
	},
];

const makeHeaderRenderer =
	(
		onHeaderEdit: (
			header: ColumnDef<GridRow, CellValue>,
			newLabel: string,
		) => void,
	) =>
	(props: {
		header: ColumnDef<GridRow, CellValue>;
		components?: HeaderRendererComponents;
	}) => (
		<EditableHeader
			header={props.header}
			components={props.components}
			onHeaderEdit={onHeaderEdit}
		/>
	);

export const TABLE_EMPTY_COLUMNS: (
	onHeaderEdit: (
		header: ColumnDef<GridRow, CellValue>,
		newLabel: string,
	) => void,
) => SolidColumnDef<GridRow>[] = (onHeaderEdit) =>
	[1, 2, 3].map((i) => ({
		accessor: `col_${i}`,
		label: `Column ${i}`,
		width: 200,
		sortable: true,
		editable: true,
		headerRenderer: makeHeaderRenderer(onHeaderEdit),
	}));

export const TABLE_EMPTY_ROWS: GridRow[] = [
	{ id: "row_1", col_1: "", col_2: "", col_3: "" },
	{ id: "row_2", col_1: "", col_2: "", col_3: "" },
	{ id: "row_3", col_1: "", col_2: "", col_3: "" },
];
