import { Show } from "solid-js";
import { dueDateRow } from "./cardDialog.css";

interface DueDateProps {
	value: string | null | undefined;
	onChange: (value: string | null) => void;
}

const DueDate = (props: DueDateProps) => {
	return (
		<div class={dueDateRow}>
			<wa-input
				type="date"
				value={props.value ?? ""}
				onInput={(e) =>
					props.onChange((e.currentTarget as HTMLInputElement).value || null)
				}
			></wa-input>
			<Show when={props.value}>
				<wa-button
					variant="neutral"
					appearance="plain"
					aria-label="Clear due date"
					onClick={() => props.onChange(null)}
				>
					<wa-icon name="x" label="Clear"></wa-icon>
				</wa-button>
			</Show>
		</div>
	);
};

export default DueDate;
