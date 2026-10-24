import { type Item, type Suitcase, revisionOf, sizeOf } from "./domain";
import { pack } from "./packing";
import { validatePlan } from "./validate";

export type PackingChoice = { removeIds: string[]; includeIds: string[]; placed: number; unplaced: number };

/** Step2's keep/leave choice flow, using the final app's native solver and units. */
export function findPackingChoices(items: Item[], bag: Suitcase, wantedId: string) {
  const original = pack(items, bag);
  const wanted = items.find(i => i.id === wantedId && i.included);
  if (!wanted || original.placements.some(p => p.id === wantedId)) return { revision: revisionOf(items, bag), options: [] as PackingChoice[] };
  const packed = new Set(original.placements.map(p => p.id));
  const candidates = items.filter(i => packed.has(i.id) && !i.required).sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || sizeOf(b).reduce((a, b) => a * b, 1) - sizeOf(a).reduce((a, b) => a * b, 1)).slice(0, 10);
  const options: (PackingChoice & { cost: number })[] = [];
  const attempt = (removeIds: string[]) => {
    const revised = items.map(i => ({ ...i, included: i.id === wantedId || (i.included && !removeIds.includes(i.id)), priority: i.id === wantedId ? 5 : i.priority }));
    const plan = pack(revised, bag);
    const placed = new Set(plan.placements.map(p => p.id));
    if (!placed.has(wantedId) || !validatePlan(plan, revised, bag).valid || [...packed].some(id => !removeIds.includes(id) && !placed.has(id))) return;
    options.push({ removeIds, includeIds: revised.filter(i => i.included).map(i => i.id), placed: placed.size, unplaced: plan.unplaced.length, cost: removeIds.reduce((sum, id) => sum + (items.find(i => i.id === id)?.priority ?? 3), 0) });
  };
  candidates.forEach(i => attempt([i.id]));
  if (options.length < 3) for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) attempt([candidates[i].id, candidates[j].id]);
  return { revision: revisionOf(items, bag), options: options.sort((a, b) => a.removeIds.length - b.removeIds.length || a.cost - b.cost).slice(0, 3).map(({ cost, ...option }) => { void cost; return option; }) };
}
