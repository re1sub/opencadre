import { createEffect, createSignal, For, Show } from "solid-js";
import { colorMix, deferFocus } from "#/utils/misc";
import { DEFAULT_TAG_COLOR } from "../constants/colors";
import { tagSchema } from "../schemas";
import type { Tag } from "../types";
import TagColorSwatches from "./TagColorSwatches";
import TagPopup from "./TagPopup";

interface TagPickerProps {
	tags: Tag[];
	attachedTagIds: string[];
	onAttach: (tagId: string) => void;
	onCreate: (name: string, color: string) => void;
}

const TagPicker = (props: TagPickerProps) => {
	const [creating, setCreating] = createSignal(false);
	const [name, setName] = createSignal("");
	const [color, setColor] = createSignal(DEFAULT_TAG_COLOR);

	let nameInputRef: HTMLElement | undefined;

	const availableTags = () =>
		props.tags.filter((tag) => !props.attachedTagIds.includes(tag.id));

	const reset = () => {
		setCreating(false);
		setName("");
		setColor(DEFAULT_TAG_COLOR);
	};

	const handleAttach = (tagId: string, close: () => void) => {
		props.onAttach(tagId);
		close();
	};

	const handleCreate = (close: () => void) => {
		const result = tagSchema.safeParse({ name: name() });
		if (!result.success) return;
		props.onCreate(result.data.name, color());
		close();
	};

	return (
		<TagPopup
			minWidth="220px"
			trigger={({ toggle, triggerRef }) => (
				<wa-button
					ref={triggerRef}
					type="button"
					variant="neutral"
					appearance="plain"
					slot="anchor"
					onClick={toggle}
				>
					<wa-icon name="plus" label="Add tag"></wa-icon>
				</wa-button>
			)}
			content={({ open, close }) => {
				createEffect(() => {
					if (open()) reset();
				});

				createEffect(() => {
					if (!creating()) return;
					return deferFocus(nameInputRef);
				});

				return (
					<>
						<div>
							<Show
								when={availableTags().length}
								fallback={<span>No more tags to add</span>}
							>
								<div
									style={{
										display: "flex",
										"flex-wrap": "wrap",
										gap: "var(--wa-space-xs)",
									}}
								>
									<For each={availableTags()}>
										{(tag) => (
											<wa-button
												type="button"
												variant="neutral"
												appearance="outlined"
												size="s"
												style={{
													"background-color": colorMix(tag.color),
													"--wa-color-fill-quiet": colorMix(tag.color),
												}}
												onClick={() => handleAttach(tag.id, close)}
											>
												{tag.name}
											</wa-button>
										)}
									</For>
								</div>
							</Show>
						</div>
						<div
							style={{
								"border-top":
									"var(--wa-border-style) var(--wa-border-width-s) var(--wa-color-surface-border)",
								"padding-top": "var(--wa-space-m)",
							}}
						>
							<Show
								when={creating()}
								fallback={
									<wa-button
										type="button"
										variant="neutral"
										appearance="plain"
										size="s"
										onClick={() => setCreating(true)}
									>
										<wa-icon name="plus" label="New tag"></wa-icon>
										<span>New tag</span>
									</wa-button>
								}
							>
								<div
									style={{
										display: "flex",
										"flex-direction": "column",
										gap: "var(--wa-space-s)",
									}}
								>
									<wa-input
										ref={(el) => (nameInputRef = el)}
										label="Tag name"
										placeholder="Type a tag name..."
										value={name()}
										onInput={(e) =>
											setName((e.currentTarget as HTMLInputElement).value)
										}
										onKeyDown={(e) => {
											if (e.key === "Enter" && name().trim())
												handleCreate(close);
										}}
									></wa-input>
									<TagColorSwatches selected={color()} onSelect={setColor} />
									<div
										style={{
											display: "flex",
											"justify-content": "flex-end",
											gap: "var(--wa-space-xs)",
										}}
									>
										<wa-button
											type="button"
											variant="neutral"
											appearance="plain"
											size="s"
											onClick={reset}
										>
											Cancel
										</wa-button>
										<wa-button
											type="button"
											variant="brand"
											size="s"
											disabled={!name().trim()}
											onClick={() => handleCreate(close)}
										>
											Create
										</wa-button>
									</div>
								</div>
							</Show>
						</div>
					</>
				);
			}}
		/>
	);
};

export default TagPicker;
