export const BAGS = [
  { id: 'cabin', name: 'The cabin carry-on', subtitle: 'A little room for adventure.', dimensions: [48, 20, 32], color: '#d7b68a' },
  { id: 'weekender', name: 'The weekend escape', subtitle: 'Travel lighter. Go further.', dimensions: [40, 18, 28], color: '#91a38e' },
  { id: 'checked', name: 'The long-haul', subtitle: 'Bring a little more of home.', dimensions: [60, 26, 40], color: '#a8b8c7' },
];

export const DEMO_ITEMS = [
  { id: 'sneakers', name: 'Everyday sneakers', category: 'shoes', dimensions: [29, 12, 21], color: '#e3dfd1', priority: 4 },
  { id: 'sweater', name: 'Sunday sweater', category: 'clothing', dimensions: [28, 7, 24], color: '#c97452', priority: 2 },
  { id: 'jeans', name: 'Favorite jeans', category: 'clothing', dimensions: [30, 5, 24], color: '#738aa1', priority: 4 },
  { id: 'tee-sage', name: 'Sage cotton tee', category: 'clothing', dimensions: [24, 3, 18], color: '#a9ba9b', priority: 3 },
  { id: 'tee-cream', name: 'One more tee', category: 'clothing', dimensions: [24, 3, 18], color: '#e7d8b5', priority: 1 },
  { id: 'toiletries', name: 'Daily essentials', category: 'pouch', dimensions: [20, 8, 12], color: '#caab72', priority: 5, required: true },
  { id: 'camera', name: 'Little film camera', category: 'camera', dimensions: [14, 9, 11], color: '#3c4945', priority: 3 },
  { id: 'headphones', name: 'Over-ear headphones', category: 'headphones', dimensions: [18, 8, 16], color: '#b3a0b5', priority: 2 },
  { id: 'book', name: 'A good paperback', category: 'book', dimensions: [21, 3, 14], color: '#d3a250', priority: 1 },
  { id: 'bottle', name: 'Water bottle', category: 'bottle', dimensions: [8, 22, 8], color: '#6b9d91', priority: 2 },
  { id: 'socks', name: 'Cozy socks', category: 'clothing', dimensions: [15, 5, 10], color: '#d5b5a6', priority: 3 },
  { id: 'charger', name: 'Tech pouch', category: 'pouch', dimensions: [12, 5, 9], color: '#7a8471', priority: 4, required: true },
].map(item => ({ included: true, required: false, ...item }));

export const volume = dimensions => dimensions.reduce((a, b) => a * b, 1);
export const liters = dimensions => (volume(dimensions) / 1000).toFixed(1);

// The main Next app's InventoryState uses mm and [X width, Y length, Z up].
// Keep the adapter explicit: silently accepting those numbers as cm changes fit.
const stepOneBags = {
  cabin: { id: 'cabin', name: 'The weekender', dimensions: [340, 500, 210], clearance: 3 },
  personal: { id: 'personal', name: 'The light traveler', dimensions: [280, 400, 160], clearance: 3 },
  checked: { id: 'checked', name: 'The long escape', dimensions: [430, 650, 250], clearance: 3 },
};
const sourcePermutations = [[0, 1, 2], [1, 0, 2], [0, 2, 1], [2, 0, 1], [1, 2, 0], [2, 1, 0]];
export function fromStepOne(state) {
  const sourceBag = state.bag || stepOneBags[state.bagId];
  if (!sourceBag) throw new Error('Unknown step-one bag. Include its bag dimensions with units "mm" and upAxis "z".');
  const axes = [0, 2, 1];
  const convert = dimensions => axes.map(i => dimensions?.[i] / 10);
  return {
    schemaVersion: 1,
    source: 'knapsack-step-one',
    bag: { ...sourceBag, id: `step1-${sourceBag.id}`, dimensions: convert(sourceBag.dimensions), clearance: (sourceBag.clearance || 0) / 10, color: sourceBag.color || '#d7b68a' },
    items: state.items.map(item => ({
      ...item,
      name: item.label || item.name,
      dimensions: convert(item.estimate ? item.estimate.map((n, i) => n * (item.scale?.[i] ?? 1)) : item.dimensions),
      allowedPermutations: (item.orientations || [0, 1, 2, 3, 4, 5]).map(index => {
        const p = sourcePermutations[index];
        if (!p) throw new Error(`Invalid step-one orientation for ${item.id}.`);
        return axes.map(i => axes[p[i]]);
      }),
    })),
  };
}

// Step one hands off this object. Model assets are optional during development.
// Coordinates: centimeters; X = width, Y = up, Z = depth. GLB models are
// centered and normalized to dimensions before packing rotations are applied.
export function normalizeSession(raw) {
  if (raw && Array.isArray(raw.items) && ((!raw.bag && raw.bagId) || (raw.units === 'mm' && raw.upAxis === 'z'))) raw = fromStepOne(raw);
  if (!raw || !raw.bag || !Array.isArray(raw.items)) throw new Error('Include a bag and an items array.');
  const dims = d => Array.isArray(d) && d.length === 3 && d.every(n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 300);
  if (!dims(raw.bag.dimensions)) throw new Error('Bag dimensions must contain three positive numbers in centimeters.');
  if (raw.items.length > 80) throw new Error('This demo supports up to 80 items.');
  const ids = new Set();
  const validUrl = url => !url || (typeof url === 'string' && /^(https?:\/\/|\/|blob:)/.test(url));
  const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#a9ba9b';
  const items = raw.items.map((item, index) => {
    if (!item || !dims(item.dimensions)) throw new Error(`Item ${index + 1} needs three positive dimensions in centimeters.`);
    const id = String(item.id ?? `item-${index + 1}`);
    if (!id || ids.has(id)) throw new Error('Every item needs a unique ID.');
    ids.add(id);
    if (item.allowedPermutations && (!Array.isArray(item.allowedPermutations) || !item.allowedPermutations.length || !item.allowedPermutations.every(p => Array.isArray(p) && p.length === 3 && new Set(p).size === 3 && p.every(n => [0, 1, 2].includes(n))))) throw new Error(`Invalid allowed orientations for ${id}.`);
    if (!validUrl(item.modelUrl)) throw new Error(`Invalid model URL for ${id}.`);
    return { ...item, id, name: String(item.name || item.label || `Item ${index + 1}`), category: item.category || 'other', color: color(item.color), included: item.required || item.included !== false, required: !!item.required, priority: Math.max(1, Math.min(5, Number(item.priority) || 3)) };
  });
  if (!validUrl(raw.bag.modelUrl)) throw new Error('Invalid bag model URL.');
  const clearance = Number(raw.bag.clearance) || 0;
  if (clearance < 0 || raw.bag.dimensions.some(n => 2 * clearance >= n)) throw new Error('The bag clearance must leave usable space.');
  return { schemaVersion: 1, bag: { ...raw.bag, id: String(raw.bag.id || 'imported'), name: String(raw.bag.name || 'Your bag'), color: color(raw.bag.color), clearance }, items };
}
