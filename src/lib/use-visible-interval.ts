"use client";

import { useEffect } from "react";

/** Runs callback on mount and on interval, but only while the browser tab is visible. */
export function useVisibleInterval(callback: () => void, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };

    run();
    const interval = setInterval(run, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, intervalMs, enabled]);
}
