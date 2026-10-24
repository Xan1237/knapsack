import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { demoItems, revisionOf, suitcases } from "@/lib/domain";
import { validatePlan } from "@/lib/validate";
import { POST } from "./route";

function request(raw: unknown, origin = "http://127.0.0.1:3000") {
  const form = new FormData();
  form.set("collection", JSON.stringify(raw));
  return new NextRequest("http://127.0.0.1:3000/api/packing/export", {
    method: "POST",
    headers: { Origin: origin, Host: "127.0.0.1:3000" },
    body: form,
  });
}

it("downloads a validated plan computed from the latest inventory, ignoring a supplied stale plan", async () => {
  const items = demoItems();
  items[0].scale = [1.2, 1, 1];
  const bag = suitcases[0];
  const response = await POST(
    request({
      items,
      bag,
      photos: [],
      plan: { revision: "old" },
      credential: "synthetic-value",
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Disposition")).toBe(
    'attachment; filename="knapsack-final-plan.json"',
  );
  const exported = await response.json();
  expect(exported.plan.revision).toBe(revisionOf(items, bag));
  expect(exported.items[0].scale).toEqual([1.2, 1, 1]);
  expect(validatePlan(exported.plan, items, bag).valid).toBe(true);
  expect(exported).not.toHaveProperty("credential");
});

it("rejects unrelated origins and invalid inventories without starting a download", async () => {
  expect((await POST(request({}, "https://unrelated.example"))).status).toBe(
    403,
  );
  const invalid = await POST(request({ items: [], bag: {} }));
  expect(invalid.status).toBe(400);
  expect(invalid.headers.get("Content-Disposition")).toBeNull();
});
