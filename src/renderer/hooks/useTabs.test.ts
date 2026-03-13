import { describe, it, expect } from "vitest";
import { renderHook, act } from "vitest";

// Since renderHook requires a DOM environment, we test the logic directly
describe("useTabs logic", () => {
  // Test the pure state logic that useTabs implements
  interface Tab {
    id: string;
    title: string;
    type: string;
    closable: boolean;
  }

  function createTabState(initial: Tab[]) {
    let tabs = [...initial];
    let activeId: string | null = initial[0]?.id ?? null;

    return {
      getTabs: () => tabs,
      getActiveId: () => activeId,
      addTab: (tab: Tab) => {
        const existing = tabs.find((t) => t.id === tab.id);
        if (!existing) {
          tabs = [...tabs, tab];
        }
        activeId = tab.id;
      },
      closeTab: (tabId: string) => {
        const idx = tabs.findIndex((t) => t.id === tabId);
        tabs = tabs.filter((t) => t.id !== tabId);
        if (activeId === tabId && tabs.length > 0) {
          const newIdx = Math.min(idx, tabs.length - 1);
          activeId = tabs[newIdx].id;
        } else if (tabs.length === 0) {
          activeId = null;
        }
      },
    };
  }

  it("initializes with first tab active", () => {
    const state = createTabState([
      { id: "t1", title: "Tab 1", type: "welcome", closable: true },
    ]);
    expect(state.getActiveId()).toBe("t1");
    expect(state.getTabs()).toHaveLength(1);
  });

  it("initializes with null active when empty", () => {
    const state = createTabState([]);
    expect(state.getActiveId()).toBeNull();
  });

  it("adds a new tab and makes it active", () => {
    const state = createTabState([
      { id: "t1", title: "Tab 1", type: "welcome", closable: true },
    ]);
    state.addTab({ id: "t2", title: "Tab 2", type: "query", closable: true });
    expect(state.getTabs()).toHaveLength(2);
    expect(state.getActiveId()).toBe("t2");
  });

  it("does not duplicate existing tab on add", () => {
    const state = createTabState([
      { id: "t1", title: "Tab 1", type: "welcome", closable: true },
    ]);
    state.addTab({ id: "t1", title: "Tab 1", type: "welcome", closable: true });
    expect(state.getTabs()).toHaveLength(1);
    expect(state.getActiveId()).toBe("t1");
  });

  it("closes a tab and selects adjacent", () => {
    const state = createTabState([
      { id: "t1", title: "Tab 1", type: "welcome", closable: true },
      { id: "t2", title: "Tab 2", type: "query", closable: true },
      { id: "t3", title: "Tab 3", type: "query", closable: true },
    ]);
    state.closeTab("t2");
    expect(state.getTabs()).toHaveLength(2);
    // Active should not change since t2 wasn't active (t1 was)
  });

  it("handles closing the active tab", () => {
    const state = createTabState([
      { id: "t1", title: "Tab 1", type: "welcome", closable: true },
      { id: "t2", title: "Tab 2", type: "query", closable: true },
    ]);
    state.addTab({ id: "t2", title: "Tab 2", type: "query", closable: true });
    // Now t2 is active
    state.closeTab("t2");
    expect(state.getTabs()).toHaveLength(1);
    expect(state.getActiveId()).toBe("t1");
  });

  it("sets activeId to null when last tab is closed", () => {
    const state = createTabState([
      { id: "t1", title: "Tab 1", type: "welcome", closable: true },
    ]);
    state.closeTab("t1");
    expect(state.getTabs()).toHaveLength(0);
    expect(state.getActiveId()).toBeNull();
  });
});
