"use client";

import { createContext, useContext } from "react";

export type ViewMode = "enterprise" | "regulator";

// Layout owns the toggle and the state; page.tsx (and anything nested under
// it) just reads the current value here instead of keeping its own copy.
export const ViewContext = createContext<ViewMode>("enterprise");

export function useActiveView(): ViewMode {
  return useContext(ViewContext);
}

export type TabMode = "dashboard" | "logs" | "packets" | "settings";

// Same pattern as ViewContext: the sidebar lives in layout.tsx, so layout
// owns the active-tab state and the setter, and page.tsx reads + drives it
// through this context instead of duplicating state that the sidebar can't
// otherwise reach.
export interface TabContextValue {
  activeTab: TabMode;
  setActiveTab: (tab: TabMode) => void;
}

export const TabContext = createContext<TabContextValue>({
  activeTab: "dashboard",
  setActiveTab: () => {},
});

export function useActiveTab(): TabContextValue {
  return useContext(TabContext);
}
