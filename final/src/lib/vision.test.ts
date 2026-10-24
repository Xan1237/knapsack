import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { tetrahedronMesh } from "./test-fixtures/mesh";
import { demoItems, suitcases } from "./domain";

const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { parse };
  },
}));

import { analyzePhoto } from "./vision";
import { suggestPacking } from "./astra";

const generated = () => ({
  key: "pump-bottle",
  label: "Pump bottle",
  category: "bottle",
  color: "#161b17",
  appearance: "A pump bottle with a raised nozzle",
  dimensions: { width: 60, length: 60, height: 180 },
  mesh: structuredClone(tetrahedronMesh),
});
beforeEach(() => {
  parse.mockReset();
  vi.stubEnv("OPENAI_API_KEY", "synthetic-provider-test-key");
  vi.stubEnv("OPENAI_MODEL", "");
  vi.stubEnv("OPENAI_VISION_MODEL", "gpt-4.1-mini");
});
afterEach(() => vi.unstubAllEnvs());

it("calls Astra for both photo meshes and packing advice, ignoring the obsolete vision setting", async () => {
  parse.mockResolvedValueOnce({ output_parsed: { items: [generated()] } });
  const result = await analyzePhoto("data:image/jpeg;base64,/9j/2Q==");
  expect(result.items[0].mesh).toEqual(tetrahedronMesh);
  expect(result.items[0].meshModel).toBe("gpt-6-astra");
  expect(result.items[0].dimensions).toEqual([60, 60, 180]);
  const items = demoItems();
  parse.mockResolvedValueOnce({
    output_parsed: {
      summary: "Bring your current list.",
      keepIds: items.map((item) => item.id),
      leaveIds: [],
    },
  });
  await suggestPacking(items, suitcases[0], "A weekend away");
  expect(parse.mock.calls.map(([request]) => request.model)).toEqual([
    "gpt-6-astra",
    "gpt-6-astra",
  ]);
  const request = parse.mock.calls[0][0];
  expect(request.store).toBe(false);
  expect(request.input[1].content).toContainEqual({
    type: "input_image",
    image_url: "data:image/jpeg;base64,/9j/2Q==",
    detail: "high",
  });
  expect(request.text.format.schema.properties.items.items.required).toContain(
    "mesh",
  );
});

it("uses one configured Astra model for generation and advice", async () => {
  vi.stubEnv("OPENAI_MODEL", "gpt-6-astra-snapshot");
  parse.mockResolvedValueOnce({ output_parsed: { items: [generated()] } });
  expect(
    (await analyzePhoto("data:image/jpeg;base64,/9j/2Q==")).items[0].meshModel,
  ).toBe("gpt-6-astra-snapshot");
  expect(parse.mock.calls[0][0].model).toBe("gpt-6-astra-snapshot");
});

it("rejects a meshless or geometrically invalid provider result without substituting category geometry", async () => {
  const meshless = { ...generated(), mesh: undefined };
  parse.mockResolvedValueOnce({ output_parsed: { items: [meshless] } });
  await expect(
    analyzePhoto("data:image/jpeg;base64,/9j/2Q=="),
  ).rejects.toThrow();
  const invalid = generated();
  invalid.mesh.triangles[0].c = 511;
  parse.mockResolvedValueOnce({ output_parsed: { items: [invalid] } });
  await expect(
    analyzePhoto("data:image/jpeg;base64,/9j/2Q=="),
  ).rejects.toThrow();
});

it("preserves no-item responses and refuses incomplete responses or missing credentials", async () => {
  parse.mockResolvedValueOnce({ output_parsed: { items: [] } });
  expect(await analyzePhoto("data:image/jpeg;base64,/9j/2Q==")).toEqual({
    items: [],
  });
  parse.mockResolvedValueOnce({ output_parsed: null });
  await expect(analyzePhoto("data:image/jpeg;base64,/9j/2Q==")).rejects.toThrow(
    "VISION_INVALID_RESPONSE",
  );
  const calls = parse.mock.calls.length;
  vi.stubEnv("OPENAI_API_KEY", "");
  await expect(analyzePhoto("data:image/jpeg;base64,/9j/2Q==")).rejects.toThrow(
    "VISION_NOT_CONFIGURED",
  );
  expect(parse).toHaveBeenCalledTimes(calls);
});
