import type { JSX } from "solid-js";
import { usePopup } from "#/utils/usePopup";
import * as styles from "./tagPopup.css";

interface TagPopupHelpers {
	toggle: () => void;
	triggerRef: (el: HTMLElement | undefined) => void;
}

interface TagPopupContentHelpers {
	open: () => boolean;
	close: () => void;
}

interface TagPopupProps {
	trigger: (helpers: TagPopupHelpers) => JSX.Element;
	content: (helpers: TagPopupContentHelpers) => JSX.Element;
	minWidth?: string;
}

const TagPopup = (props: TagPopupProps) => {
	const popup = usePopup();

	return (
		<wa-popup
			ref={popup.popupRef}
			placement="bottom-start"
			distance={4}
			flip
			shift
			auto-size="vertical"
			active={popup.open()}
		>
			{props.trigger({ toggle: popup.toggle, triggerRef: popup.triggerRef })}
			<div class={styles.popupPanel} style={{ "min-width": props.minWidth }}>
				{props.content({ open: popup.open, close: popup.close })}
			</div>
		</wa-popup>
	);
};

export default TagPopup;