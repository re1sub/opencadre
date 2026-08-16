import { createEffect } from "solid-js";
import { colorMix } from "#/utils/color";
import type { Tag } from "../types";
import TagColorSwatches from "./TagColorSwatches";
import TagPopup from "./TagPopup";

interface TagEditorProps {
	tag: Tag;
	onUpdate: (tagId: string, name: string, color: string) => void;
	onRemove: (tagId: string) => void;
}

const TagEditor = (props: TagEditorProps) => {
	let inputRef: HTMLElement | undefined;

	return (
		<TagPopup
			trigger={({ toggle, triggerRef }) => (
				<wa-button
					ref={triggerRef}
					type="button"
					variant="neutral"
					appearance="outlined"
					size="s"
					slot="anchor"
					style={{
						"background-color": colorMix(props.tag.color),
						"--wa-color-fill-quiet": colorMix(props.tag.color),
					}}
					onClick={toggle}
				>
					{props.tag.name}
				</wa-button>
			)}
			content={({ open }) => {
				createEffect(() => {
					if (!open()) return;
					const frame = requestAnimationFrame(() => inputRef?.focus());
					return () => cancelAnimationFrame(frame);
				});

				return (
					<>
						<div
							style={{
								display: "flex",
								"align-items": "flex-end",
								gap: "var(--wa-space-s)",
							}}
						>
							<wa-input
								ref={(el) => (inputRef = el)}
								label="Tag name"
								placeholder="Type a tag name..."
								value={props.tag.name}
								onInput={(e) =>
									props.onUpdate(
										props.tag.id,
										(e.currentTarget as HTMLInputElement).value,
										props.tag.color,
									)
								}
							></wa-input>
						</div>
						<TagColorSwatches
							selected={props.tag.color}
							onSelect={(color) =>
								props.onUpdate(props.tag.id, props.tag.name, color)
							}
						/>
						<wa-dropdown-item
							onClick={() => props.onRemove(props.tag.id)}
							variant="danger"
							style={{ "align-self": "flex-end" }}
						>
							<wa-icon name="trash" label="Delete"></wa-icon>
							<span>Delete</span>
						</wa-dropdown-item>
					</>
				);
			}}
		/>
	);
};

export default TagEditor;
