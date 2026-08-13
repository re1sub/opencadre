import { For } from "solid-js";
import { skeletonContainer, skeletonItem } from "./skeleton.css";

const Skeleton = () => (
  <div class={skeletonContainer}>
    <For each={Array.from({ length: 16 })}>
      {(_, index) => (
        <div
          class={skeletonItem}
          style={{
            opacity: 1 - index() / index.length,
          }}
        >
          <wa-skeleton
            effect="sheen"
            style={{
              height: "60px",
              width: "60px",
            }}
          ></wa-skeleton>
          <wa-skeleton
            effect="sheen"
            style={{
              height: "40px",
              width: "100%",
            }}
          ></wa-skeleton>
        </div>
      )}
    </For>
  </div>
);

export default Skeleton;
