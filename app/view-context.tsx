"use client";

import { createContext, useContext } from "react";

export type ViewMode = "enterprise" | "regulator";

// Layout owns the toggle and the state; page.tsx (and anything nested under
// it) just reads the current value here instead of keeping its own copy.
export const ViewContext = createContext<ViewMode>("enterprise");

export function useActiveView(): ViewMode {
  return useContext(ViewContext);
}
