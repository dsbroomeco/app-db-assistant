import type { SavedQuery } from "../shared/types/database";

let queriesStore: {
  get(key: "savedQueries"): SavedQuery[];
  set(key: "savedQueries", value: SavedQuery[]): void;
};

export async function initSavedQueries(): Promise<void> {
  const { default: Store } = await import("electron-store");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = new Store<{ savedQueries: SavedQuery[] }>({
    name: "saved-queries",
    defaults: { savedQueries: [] },
  });
  queriesStore = {
    get: (key: "savedQueries") => instance.get(key) as SavedQuery[],
    set: (key: "savedQueries", value: SavedQuery[]) =>
      instance.set(key, value),
  };
}

export function listSavedQueries(): SavedQuery[] {
  return queriesStore.get("savedQueries");
}

export function saveSavedQuery(query: Omit<SavedQuery, "id" | "createdAt" | "updatedAt">): SavedQuery {
  const queries = queriesStore.get("savedQueries");
  const now = new Date().toISOString();
  const newQuery: SavedQuery = {
    ...query,
    id: `sq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  queries.push(newQuery);
  queriesStore.set("savedQueries", queries);
  return newQuery;
}

export function updateSavedQuery(id: string, updates: Partial<Pick<SavedQuery, "name" | "sql" | "connectionId" | "folder">>): SavedQuery {
  const queries = queriesStore.get("savedQueries");
  const idx = queries.findIndex((q) => q.id === id);
  if (idx === -1) throw new Error(`Saved query "${id}" not found`);
  queries[idx] = { ...queries[idx], ...updates, updatedAt: new Date().toISOString() };
  queriesStore.set("savedQueries", queries);
  return queries[idx];
}

export function deleteSavedQuery(id: string): void {
  const queries = queriesStore.get("savedQueries");
  const filtered = queries.filter((q) => q.id !== id);
  if (filtered.length === queries.length) {
    throw new Error(`Saved query "${id}" not found`);
  }
  queriesStore.set("savedQueries", filtered);
}
