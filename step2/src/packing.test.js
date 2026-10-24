import test from 'node:test';
import assert from 'node:assert/strict';
import { BAGS, DEMO_ITEMS, normalizeSession } from './data.js';
import { findSwaps, packItems, validatePlan } from './packing.js';

test('native main-app inventory preserves edited physical size, rotations and bag clearance', () => {
  const session = normalizeSession({ bagId: 'cabin', items: [{ id: 'native-bottle', label: 'Edited bottle', category: 'bottle', estimate: [65, 65, 160], scale: [1.2, 1.2, .8], orientations: [0, 1], included: true }] });
  assert.deepEqual(session.bag.dimensions, [34, 21, 50]);
  assert.equal(session.bag.clearance, .3);
  assert.deepEqual(session.items[0].dimensions, [7.8, 12.8, 7.8]);
  assert.deepEqual(session.items[0].allowedPermutations, [[0, 1, 2], [2, 1, 0]]);
  const plan = packItems(session.items, session.bag);
  assert.equal(plan.validation.valid, true); assert.equal(plan.placements.length, 1);
  assert.ok(plan.placements[0].position.every(n => n >= .3));
});

test('oversized items remain accounted for and empty selections are valid', () => {
  const item = { id: 'oversized', name: 'Oversized', dimensions: [99, 99, 99], included: true, priority: 3 };
  const plan = packItems([item], BAGS[0]);
  assert.deepEqual(plan.unplaced, ['oversized']); assert.equal(plan.validation.valid, true);
  assert.deepEqual(packItems([], BAGS[0]).placements, []);
});

test('validator rejects overlap and missing items independently of the search', () => {
  const plan = packItems(DEMO_ITEMS, BAGS[2]);
  assert.equal(plan.validation.valid, true);
  const overlap = structuredClone(plan); overlap.placements[1] = { ...overlap.placements[1], position: [...overlap.placements[0].position] };
  assert.equal(validatePlan(overlap, BAGS[2], DEMO_ITEMS).valid, false);
  const missing = structuredClone(plan); missing.placements.pop();
  assert.equal(validatePlan(missing, BAGS[2], DEMO_ITEMS).valid, false);
});

test('the conflict fixture offers a real user choice without displacing protected items', () => {
  const plan = packItems(DEMO_ITEMS, BAGS[0]);
  assert.ok(plan.unplaced.length > 0);
  const wanted = plan.unplaced.find(id => findSwaps(DEMO_ITEMS, BAGS[0], id).length);
  assert.ok(wanted);
  for (const swap of findSwaps(DEMO_ITEMS, BAGS[0], wanted)) {
    assert.ok(swap.plan.placements.some(p => p.id === wanted));
    assert.ok(swap.removed.every(id => !DEMO_ITEMS.find(i => i.id === id).required));
    assert.ok(plan.placements.every(p => swap.removed.includes(p.id) || swap.plan.placements.some(next => next.id === p.id)));
    assert.equal(swap.plan.validation.valid, true);
  }
});

test('bounded random inventories always produce valid, complete placed/unplaced accounting', () => {
  let seed = 17;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let run = 0; run < 30; run++) {
    const items = Array.from({ length: 14 }, (_, i) => ({ id: `item-${i}`, dimensions: Array.from({ length: 3 }, () => Math.round(3 + random() * 25)), included: random() > .15, priority: 1 + Math.floor(random() * 5), upright: random() > .75 }));
    const plan = packItems(items, BAGS[0]);
    assert.equal(plan.validation.valid, true, plan.validation.errors.join(', '));
    assert.equal(plan.placements.length + plan.unplaced.length, items.filter(i => i.included).length);
  }
});
