import { For, Show } from "solid-js";
import { colorMix } from "#/utils/misc";
import { TAG_COLORS } from "../constants/colors";
import * as styles from "./tagPopup.css";

interface TagColorSwatchesProps {
	selected: string;
	onSelect: (color: string) => void;
}

const TagColorSwatches = (props: TagColorSwatchesProps) => (
	<div>
		Choose a color
		<div class={styles.swatchGrid}>
			<For each={TAG_COLORS}>
				{(color) => (
					<div class={styles.swatchWrap}>
						<wa-button
							type="button"
							variant="neutral"
							size="s"
							class={styles.swatchButton}
							style={{
								"--wa-color-fill-loud": colorMix(color, 50),
								border: `1px solid ${color}`,
							}}
							aria-label={`Select ${color}`}
							title={`Select ${color}`}
							onClick={() => props.onSelect(color)}
							disabled={props.selected === color}
						></wa-button>
						<Show when={props.selected === color}>
							<wa-icon
								name="check"
								label="Select"
								class={styles.swatchIcon}
							></wa-icon>
						</Show>
					</div>
				)}
			</For>
		</div>
	</div>
);

export default TagColorSwatches;
