import { createEffect, createSignal, onCleanup } from "solid-js";

interface WaPopupElement extends HTMLElement {
  popup: HTMLElement;
}

function animateWithClass(el: HTMLElement, className: string): Promise<void> {
  if (el.classList.contains(className)) return Promise.resolve();

  return new Promise((resolve) => {
    // 1. Add animation class synchronously before paint
    el.classList.add(className);
    let resolved = false;

    const onEnd = () => {
      if (resolved) return;
      resolved = true;
      el.classList.remove(className);
      resolve();
    };

    el.addEventListener("animationend", onEnd, { once: true });
    el.addEventListener("animationcancel", onEnd, { once: true });

    // 2. Double-rAF ensures the browser committed the style & layout
    // and has evaluated running CSS animations
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!resolved && el.getAnimations().length === 0) {
          onEnd();
        }
      });
    });
  });
}

interface UsePopupOptions {
  onClose?: () => void;
  ignore?: string | ((target: HTMLElement | null) => boolean);
}

export function usePopup(options: UsePopupOptions = {}) {
  const { onClose, ignore } = options;
  const [open, setOpen] = createSignal(false);

  let popupRef: WaPopupElement | undefined;
  let triggerRef: HTMLElement | undefined;

  const setPopupRef = (el: HTMLElement | undefined) => {
    popupRef = el as WaPopupElement | undefined;
  };
  const setTriggerRef = (el: HTMLElement | undefined) => {
    triggerRef = el;
  };

  const animate = (className: string) =>
    popupRef ? animateWithClass(popupRef.popup, className) : Promise.resolve();

  const close = () => {
    if (!open()) return;
    void animate("hide-with-scale").then(() => {
      setOpen(false);
      onClose?.();
    });
  };

  const openPopup = () => {
    if (open()) return;
    setOpen(true);

    requestAnimationFrame(() => {
      void animate("show-with-scale");
    });
  };
  const toggle = () => (open() ? close() : openPopup());

  createEffect(() => {
    if (!open()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
        triggerRef?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const isIgnored = ignore
        ? typeof ignore === "function"
          ? ignore(target)
          : Boolean(target?.closest(ignore))
        : false;
      if (isIgnored) return;
      const path = e.composedPath();
      const isInside =
        popupRef &&
        (path.includes(popupRef) || (triggerRef && path.includes(triggerRef)));
      if (!isInside) close();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handlePointerDown);
    return onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    });
  });

  return {
    open,
    setOpen,
    close,
    toggle,
    openPopup,
    popupRef: setPopupRef,
    triggerRef: setTriggerRef,
  };
}
