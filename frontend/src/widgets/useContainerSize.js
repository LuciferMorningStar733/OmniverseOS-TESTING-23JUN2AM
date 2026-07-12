import { useEffect, useRef, useState } from "react";

/**
 * useContainerSize — tracks the live content-box size of a DOM element via
 * ResizeObserver. This is the measurement primitive behind the Smart Widget
 * Layout Engine: instead of widgets guessing their own size from grid math,
 * we observe what the browser actually renders (which already accounts for
 * header height, padding, borders, and collapsed state) and react to it.
 *
 * Returns a ref to attach to the element plus its current { width, height }.
 * Size starts at { width: 0, height: 0 } until the first observation fires.
 */
export function useContainerSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      const width = box ? box.inlineSize : entry.contentRect.width;
      const height = box ? box.blockSize : entry.contentRect.height;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
