import {
  type Item,
  type Photo,
  type Category,
  type Proposal,
  type Vec3,
  createItem,
  sizeOf,
  demoItems,
} from "./domain";

export type InventoryState = {
  items: Item[];
  photos: Photo[];
  bagId: string;
  dismissed: string[];
  demo: boolean;
  customBag?: import("./domain").Suitcase;
};
export const initialState = (): InventoryState => ({
  items: demoItems(),
  photos: [],
  bagId: "cabin",
  dismissed: [],
  demo: true,
});
export type Action =
  | { type: "restore"; state: InventoryState }
  | { type: "reset" }
  | { type: "demo" }
  | { type: "bag"; id: string }
  | { type: "add"; category: Category; id?: string }
  | {
      type: "edit";
      id: string;
      patch: Partial<
        Pick<
          Item,
          | "label"
          | "scale"
          | "included"
          | "orientations"
          | "required"
          | "priority"
        >
      >;
    }
  | { type: "delete"; id: string }
  | { type: "duplicate"; id: string; newId: string }
  | { type: "merge"; target: string; source: string }
  | { type: "photos"; photos: Photo[] }
  | { type: "start" | "retry"; id: string; requestId: string }
  | { type: "analysis"; id: string; requestId: string; proposals: Proposal[] }
  | { type: "failure"; id: string; requestId: string; error: string };
// A single action applies a previewed selection so no intermediate packing state leaks.
export type SelectionAction = {
  type: "selection";
  includeIds: string[];
  priorityId?: string;
};
export function reducer(
  state: InventoryState,
  action: Action | SelectionAction,
): InventoryState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "reset":
      return {
        items: [],
        photos: [],
        bagId: "cabin",
        dismissed: [],
        demo: false,
      };
    case "demo":
      return initialState();
    case "bag":
      return { ...state, bagId: action.id };
    case "selection": {
      const selectedIds = new Set(action.includeIds);
      return {
        ...state,
        items: state.items.map((item) => ({
          ...item,
          included: !!item.required || selectedIds.has(item.id),
          priority: item.id === action.priorityId ? 5 : item.priority,
          edited: true,
        })),
      };
    }
    case "add":
      return state.items.length >= 80
        ? state
        : {
            ...state,
            items: [...state.items, createItem(action.category, action.id)],
          };
    case "edit":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id
            ? {
                ...i,
                ...action.patch,
                included:
                  (action.patch.required ?? i.required)
                    ? true
                    : (action.patch.included ?? i.included),
                edited: true,
              }
            : i,
        ),
      };
    case "delete": {
      const item = state.items.find((i) => i.id === action.id);
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        dismissed: item?.proposalId
          ? [...new Set([...state.dismissed, item.proposalId])]
          : state.dismissed,
      };
    }
    case "duplicate": {
      const item = state.items.find((i) => i.id === action.id);
      return !item || state.items.length >= 80
        ? state
        : {
            ...state,
            items: [
              ...state.items,
              {
                ...item,
                id: action.newId,
                key: action.newId,
                proposalId: undefined,
                label: `${item.label.slice(0, 53)} copy`,
                estimate: [...sizeOf(item)] as Vec3,
                scale: [1, 1, 1],
                edited: true,
              },
            ],
          };
    }
    case "merge": {
      if (action.target === action.source) return state;
      const target = state.items.find((i) => i.id === action.target),
        source = state.items.find((i) => i.id === action.source);
      if (!target || !source) return state;
      return {
        ...state,
        items: state.items
          .filter((i) => i.id !== source.id)
          .map((i) =>
            i.id === target.id
              ? {
                  ...i,
                  sourceIds: [
                    ...new Set([...i.sourceIds, ...source.sourceIds]),
                  ],
                  edited: true,
                  required: !!(target.required || source.required),
                  included:
                    !!(target.required || source.required) || target.included,
                }
              : i,
          ),
        dismissed: source.proposalId
          ? [...new Set([...state.dismissed, source.proposalId])]
          : state.dismissed,
      };
    }
    case "photos":
      return {
        ...state,
        photos: [...state.photos, ...action.photos].slice(0, 12),
      };
    case "retry":
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.id
            ? {
                ...p,
                status: "queued",
                requestId: action.requestId,
                error: undefined,
              }
            : p,
        ),
      };
    case "start":
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.id &&
          p.requestId === action.requestId &&
          p.status === "queued"
            ? { ...p, status: "analyzing" }
            : p,
        ),
      };
    case "failure":
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.id === action.id && p.requestId === action.requestId
            ? { ...p, status: "error", error: action.error }
            : p,
        ),
      };
    case "analysis": {
      const photo = state.photos.find((p) => p.id === action.id);
      if (
        !photo ||
        photo.requestId !== action.requestId ||
        photo.accepted ||
        photo.status !== "analyzing"
      )
        return state;
      const seen = new Set(state.items.map((i) => i.proposalId));
      const proposals = action.proposals
        .filter(
          (p, index, array) =>
            array.findIndex((other) => other.key === p.key) === index,
        )
        .map((p) => {
          const proposalId = `${photo.id}:${p.key}`;
          return {
            ...createItem(p.category, proposalId),
            ...p,
            id: proposalId,
            proposalId,
            estimate: p.dimensions,
            sourceIds: [photo.id],
          };
        })
        .filter(
          (p) =>
            !seen.has(p.proposalId) && !state.dismissed.includes(p.proposalId),
        );
      const slots = 80 - state.items.length,
        overflow = proposals.length > slots;
      // Successful photos are immutable analysis records. Retrying a response can never replace user overrides.
      return {
        ...state,
        items: [...state.items, ...proposals.slice(0, slots)],
        photos: state.photos.map((p) =>
          p.id === photo.id
            ? {
                ...p,
                status: overflow ? "error" : "done",
                accepted: true,
                error: overflow
                  ? "Inventory limit reached. Some proposals were omitted; add them manually after making room."
                  : undefined,
              }
            : p,
        ),
      };
    }
  }
}
export function mergeSuggestions(items: Item[]): [Item, Item][] {
  const result: [Item, Item][] = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i],
        b = items[j];
      const colorA = [1, 3, 5].map((k) =>
          parseInt(a.color.slice(k, k + 2), 16),
        ),
        colorB = [1, 3, 5].map((k) => parseInt(b.color.slice(k, k + 2), 16));
      const colorsClose =
        Math.hypot(...colorA.map((value, k) => value - colorB[k])) < 70;
      const dimensionsA = [...a.estimate].sort((a, b) => a - b),
        dimensionsB = [...b.estimate].sort((a, b) => a - b);
      const sizesClose = dimensionsA.every(
        (n, k) => n / dimensionsB[k] > 0.65 && n / dimensionsB[k] < 1.55,
      );
      const sameLabel =
        a.label.toLowerCase().replace(/[^a-z]/g, "") ===
        b.label.toLowerCase().replace(/[^a-z]/g, "");
      if (
        a.proposalId &&
        b.proposalId &&
        a.sourceIds.some((s) => !b.sourceIds.includes(s)) &&
        a.category === b.category &&
        (sameLabel || (colorsClose && sizesClose))
      )
        result.push([a, b]);
    }
  return result.slice(0, 5);
}
