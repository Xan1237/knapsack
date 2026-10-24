import fs from 'node:fs';
import { DEMO_ITEMS, BAGS } from './src/data.js';
import { packItems, findSwaps } from './src/packing.js';

// Bind Kane-generated placeholders to the real, deterministic demo collection.
// No browser objectives or test steps are authored here.
const plan = packItems(DEMO_ITEMS, BAGS[0]);
const wanted = plan.unplaced.find(id => findSwaps(DEMO_ITEMS, BAGS[0], id).length);
if (!wanted) throw new Error('The demo no longer has a resolvable conflict fixture.');
const swap = findSwaps(DEMO_ITEMS, BAGS[0], wanted)[0];
const values = {
  trip_preference: 'Help me pick between items that do not fit.',
  conflicting_item_set: DEMO_ITEMS.map(i => i.name).join(', '),
  item_to_keep: DEMO_ITEMS.find(i => i.id === wanted).name,
  item_to_exclude: DEMO_ITEMS.find(i => i.id === swap.removed[0]).name,
};
fs.mkdirSync('.testmuai/variables', { recursive: true });
const file = '.testmuai/variables/assurance.json';
const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const [key, value] of Object.entries(values)) existing[key] = { ...existing[key], value, secret: false };
fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n');
console.log('Kane demo variables configured from the current collection.');
