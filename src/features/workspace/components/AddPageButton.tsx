import { For } from "solid-js";
import { PAGE_KIND_META, type PageKind } from "../types";
import { addPageGroup } from "./workspace.css";

interface AddPageButtonProps {
	onAddPage: (kind: PageKind) => void;
}

const AddPageButton = (props: AddPageButtonProps) => {
	const handleTemplateSelect = (event: Event) => {
		const selectEvent = event as unknown as {
			detail: { item: { value?: string } | null };
		};

		const kind = selectEvent.detail.item?.value as PageKind | undefined;

		if (kind && PAGE_KIND_META[kind]) {
			props.onAddPage(kind);
		}
	};

	return (
		<div class={addPageGroup}>
			<wa-button
				type="button"
				variant="neutral"
				appearance="plain"
				onClick={() => props.onAddPage("markdown")}
				style={{ width: "100%" }}
			>
				<wa-icon slot="start" name="plus"></wa-icon>
				Add Page
			</wa-button>

			<wa-dropdown on:wa-select={handleTemplateSelect}>
				<wa-button
					type="button"
					slot="trigger"
					variant="neutral"
					appearance="plain"
					aria-label="Add page from template"
				>
					<wa-icon
						name="chevron-down"
						variant="solid"
						label="Choose template"
					></wa-icon>
				</wa-button>

				<For each={Object.entries(PAGE_KIND_META)}>
					{([kind, meta]) => (
						<wa-dropdown-item value={kind}>
							<wa-icon
								slot="icon"
								name={meta.icon}
								label={meta.iconLabel}
							></wa-icon>
							{meta.label}
						</wa-dropdown-item>
					)}
				</For>
			</wa-dropdown>
		</div>

	);
}

export default AddPageButton;
