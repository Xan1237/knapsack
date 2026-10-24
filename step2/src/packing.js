import { volume } from './data.js';

const EPS = 0.001;
const permutations = [[0, 1, 2], [2, 1, 0], [0, 2, 1], [1, 2, 0], [1, 0, 2], [2, 0, 1]];
const overlaps = (a, b) => a.position.every((p, i) => p < b.position[i] + b.size[i] - EPS && p + a.size[i] > b.position[i] + EPS);
const contains = (a, b) => a.position.every((p, i) => p <= b.position[i] + EPS && p + a.size[i] >= b.position[i] + b.size[i] - EPS);

function subtract(spaces, placed) {
  const result = [];
  for (const space of spaces) {
    if (!overlaps(space, placed)) { result.push(space); continue; }
    for (let axis = 0; axis < 3; axis++) {
      const low = placed.position[axis] - space.position[axis];
      if (low > EPS) {
        const size = [...space.size]; size[axis] = low;
        result.push({ position: [...space.position], size });
      }
      const high = space.position[axis] + space.size[axis] - placed.position[axis] - placed.size[axis];
      if (high > EPS) {
        const position = [...space.position], size = [...space.size];
        position[axis] = placed.position[axis] + placed.size[axis]; size[axis] = high;
        result.push({ position, size });
      }
    }
  }
  return result.filter((s, i) => !result.some((other, j) => j !== i && contains(other, s) && (j < i || !contains(s, other))));
}

function orientations(item) {
  const allowed = item.upright ? permutations.slice(0, 2) : permutations;
  const seen = new Set();
  return allowed.map(permutation => ({ permutation, size: permutation.map(i => item.dimensions[i]) }))
    .filter(o => { const key = o.size.join(','); if (seen.has(key)) return false; seen.add(key); return true; });
}

function attempt(items, dimensions, order) {
  let spaces = [{ position: [0, 0, 0], size: [...dimensions] }];
  const placements = [], unplaced = [];
  const sorted = [...items].sort((a, b) => Number(b.required) - Number(a.required) || order(a, b) || a.id.localeCompare(b.id));
  for (const item of sorted) {
    let best = null;
    for (const space of spaces) {
      for (const orientation of orientations(item)) {
        if (!orientation.size.every((n, i) => n <= space.size[i] + EPS)) continue;
        const candidate = { id: item.id, position: [...space.position], ...orientation };
        // A conservative MVP: every raised envelope must have full support.
        const y = candidate.position[1];
        const supported = y < EPS || placements.some(p => Math.abs(p.position[1] + p.size[1] - y) < EPS && [0, 2].every(i => p.position[i] <= candidate.position[i] + EPS && p.position[i] + p.size[i] >= candidate.position[i] + candidate.size[i] - EPS));
        if (!supported) continue;
        const waste = volume(space.size) - volume(candidate.size);
        const score = y * 1000000 + space.position[2] * 10000 + space.position[0] * 100 + waste / 1000 + orientation.size[1];
        if (!best || score < best.score) best = { ...candidate, score };
      }
    }
    if (best) {
      placements.push(best); spaces = subtract(spaces, best);
    } else unplaced.push(item.id);
  }
  const score = placements.reduce((sum, p) => {
    const item = items.find(i => i.id === p.id);
    return sum + (item.required ? 1000000 : 0) + item.priority * 1000 + 100 + volume(item.dimensions) / 10000;
  }, 0);
  return { placements, unplaced, score };
}

export function validatePlan(plan, bag, items) {
  const errors = [], included = items.filter(i => i.included);
  const accounted = [...plan.placements.map(p => p.id), ...plan.unplaced];
  if (new Set(accounted).size !== accounted.length || accounted.length !== included.length || included.some(i => !accounted.includes(i.id))) errors.push('Some items are missing or duplicated.');
  for (const p of plan.placements) {
    const item = included.find(i => i.id === p.id);
    if (!item || !orientations(item).some(o => o.size.every((s, i) => Math.abs(s - p.size[i]) < EPS))) errors.push('An item has an invalid orientation.');
    if (!p.position.every((v, i) => v >= -EPS && v + p.size[i] <= bag.dimensions[i] + EPS)) errors.push('An item is outside the bag.');
  }
  plan.placements.forEach((a, i) => plan.placements.slice(i + 1).forEach(b => { if (overlaps(a, b)) errors.push('Items overlap.'); }));
  return { valid: errors.length === 0, errors };
}

export function packItems(items, bag) {
  const included = items.filter(i => i.included);
  const orders = [
    (a, b) => b.priority - a.priority || volume(b.dimensions) - volume(a.dimensions),
    (a, b) => volume(b.dimensions) - volume(a.dimensions),
    (a, b) => Math.max(...b.dimensions) - Math.max(...a.dimensions),
    (a, b) => Math.min(...b.dimensions) - Math.min(...a.dimensions),
    (a, b) => b.dimensions[0] * b.dimensions[2] - a.dimensions[0] * a.dimensions[2],
    (a, b) => b.priority - a.priority || volume(a.dimensions) - volume(b.dimensions),
  ];
  let best = null;
  for (const order of orders) {
    const plan = attempt(included, bag.dimensions, order);
    if (!best || plan.score > best.score) best = plan;
  }
  best.placements.sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2]);
  best.usedVolume = best.placements.reduce((sum, p) => sum + volume(p.size), 0);
  best.utilization = Math.round(best.usedVolume / volume(bag.dimensions) * 100);
  best.validation = validatePlan(best, bag, items);
  return best;
}

export function findSwaps(items, bag, wantedId) {
  const plan = packItems(items, bag);
  const packed = new Set(plan.placements.map(p => p.id));
  const candidates = items.filter(i => packed.has(i.id) && !i.required).sort((a, b) => a.priority - b.priority || volume(b.dimensions) - volume(a.dimensions));
  const alternatives = [];
  const check = removed => {
    const revised = items.map(i => ({ ...i, included: i.id === wantedId || (i.included && !removed.includes(i.id)), priority: i.id === wantedId ? 5 : i.priority }));
    const result = packItems(revised, bag);
    const placed = new Set(result.placements.map(p => p.id));
    if (result.validation.valid && placed.has(wantedId) && [...packed].every(id => removed.includes(id) || placed.has(id))) {
      alternatives.push({ removed, plan: result, cost: removed.reduce((sum, id) => sum + items.find(i => i.id === id).priority, 0) });
    }
  };
  candidates.forEach(i => check([i.id]));
  if (alternatives.length < 3) for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) check([candidates[i].id, candidates[j].id]);
  return alternatives.sort((a, b) => a.removed.length - b.removed.length || a.cost - b.cost).slice(0, 3);
}
