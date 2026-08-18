export interface ToolbarButtonDef {
	id: string;
	label: string;
	icon: string;
}

export interface MarkdownAction {
	run: () => void;
	active: () => boolean;
}

export interface MenuItemsProps {
	groups?: ToolbarButtonDef[][];
	showLabels?: boolean;
	isCommandMenu?: boolean;
	selectedIndex?: number;
	actions: Record<string, MarkdownAction>;
	isActive: (id: string) => boolean;
	onExecuteCommand?: (id: string) => void;
}
