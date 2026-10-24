import { pack } from "./packing";
import { validatePlan } from "./validate";
import { type Item, type Suitcase } from "./domain";
self.onmessage = (
  event: MessageEvent<{ items: Item[]; bag: Suitcase; revision: string }>,
) => {
  try {
    const { items, bag } = event.data;
    const plan = pack(items, bag);
    self.postMessage({ plan, validation: validatePlan(plan, items, bag) });
  } catch {
    self.postMessage({
      revision: event.data.revision,
      error:
        "The layout could not be calculated. Try a smaller inventory or reset the session.",
    });
  }
};
