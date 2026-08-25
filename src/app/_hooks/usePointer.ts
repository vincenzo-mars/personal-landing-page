"use client";

import { useEffect, useRef } from "react";

export type Pointer = {
  /** 0..1 across the viewport, origin top-left */
  x: number;
  y: number;
  /** false until the visitor has actually moved something */
  engaged: boolean;
};

/**
 * Pointer position kept in a ref: the render loop reads it every frame, so
 * storing it in state would re-render the tree at 60fps for nothing.
 */
export function usePointer() {
  const pointer = useRef<Pointer>({ x: 0.5, y: 0.5, engaged: false });

  useEffect(() => {
    const track = (event: PointerEvent) => {
      pointer.current.x = event.clientX / window.innerWidth;
      pointer.current.y = event.clientY / window.innerHeight;
      pointer.current.engaged = true;
    };

    const release = () => {
      pointer.current.engaged = false;
    };

    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("pointerdown", track, { passive: true });
    window.addEventListener("pointerleave", release);

    return () => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerdown", track);
      window.removeEventListener("pointerleave", release);
    };
  }, []);

  return pointer;
}
