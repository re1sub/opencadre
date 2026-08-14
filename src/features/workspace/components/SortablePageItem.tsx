import { useSortable } from "@dnd-kit/solid/sortable";
import { PAGE_KIND_META, type Page } from "../types";
import { pageButton, pageMenuTrigger, pageRow } from "./workspace.css";

interface SortablePageItemProps {
  entry: Page;
  index: number;
  isActive: boolean;
  onNavigate: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

export const SortablePageItem = (props: SortablePageItemProps) => {
  const { ref, isDragging, isDropTarget } = useSortable({
    get id() {
      return props.entry.id;
    },
    get index() {
      return props.index;
    },
    group: "pages",
    type: "page",
    accept: ["page"],
  });

  return (
    <li
      ref={ref}
      class={pageRow}
      style={{
        opacity: isDragging() ? 0.5 : 1,
      }}
      classList={{
        "is-drop-target": isDropTarget(),
      }}
    >
      <wa-button
        variant={props.isActive ? "brand" : "neutral"}
        appearance={props.isActive ? "filled" : "plain"}
        class={pageButton}
        onClick={(e) => {
          const waPage = (e.currentTarget as HTMLElement).closest("wa-page");

          if (waPage) {
            waPage.hideNavigation();
          }

          props.onNavigate(props.entry.id);
        }}
      >
        <wa-icon
          slot="start"
          name={PAGE_KIND_META[props.entry.kind].icon}
          label={PAGE_KIND_META[props.entry.kind].iconLabel}
        ></wa-icon>
        {props.entry.title}
      </wa-button>

      <wa-dropdown on:wa-select={() => props.onRequestDelete(props.entry.id)}>
        <wa-button
          slot="trigger"
          variant={props.isActive ? "brand" : "neutral"}
          appearance="plain"
          size="xs"
          class={pageMenuTrigger}
          aria-label={`Options for ${props.entry.title}`}
        >
          <wa-icon name="ellipsis-vertical"></wa-icon>
        </wa-button>

        <wa-dropdown-item>
          <wa-icon slot="icon" name="trash-2"></wa-icon>
          Delete page
        </wa-dropdown-item>
      </wa-dropdown>
    </li>
  );
};

export default SortablePageItem;
