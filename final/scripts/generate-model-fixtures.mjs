import { mkdirSync, writeFileSync } from "node:fs";
import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  Mesh,
  Quaternion,
  Vector3,
} from "three";

// Small original glTF assets make the model-import boundary demonstrable offline.
// They are fixtures, separate from the source-linked models estimated from photos.
function makeAsset(specs, nodes) {
  const chunks = [],
    bufferViews = [],
    accessors = [],
    meshes = [],
    materials = [];
  let offset = 0;
  function attribute(array, count, type, componentType, target, bounds) {
    const padding = (4 - (offset % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      offset += padding;
    }
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const view = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: bytes.length,
      target,
    });
    chunks.push(bytes);
    offset += bytes.length;
    accessors.push({ bufferView: view, componentType, count, type, ...bounds });
    return accessors.length - 1;
  }
  specs.forEach(({ geometry, color, name }) => {
    geometry.computeBoundingBox();
    const p = geometry.getAttribute("position"),
      n = geometry.getAttribute("normal"),
      index = geometry.index;
    const position = attribute(p.array, p.count, "VEC3", 5126, 34962, {
      min: geometry.boundingBox.min.toArray(),
      max: geometry.boundingBox.max.toArray(),
    });
    const normal = attribute(n.array, n.count, "VEC3", 5126, 34962);
    const indices = attribute(
      index.array,
      index.count,
      "SCALAR",
      index.array.BYTES_PER_ELEMENT === 2 ? 5123 : 5125,
      34963,
    );
    materials.push({
      pbrMetallicRoughness: {
        baseColorFactor: [...new Color(color).toArray(), 1],
        roughnessFactor: 0.8,
        metallicFactor: 0.05,
      },
    });
    meshes.push({
      name,
      primitives: [
        {
          attributes: { POSITION: position, NORMAL: normal },
          indices,
          material: materials.length - 1,
        },
      ],
    });
  });
  const group = new Group();
  nodes.forEach((node) => {
    const mesh = new Mesh(specs[node.mesh].geometry);
    if (node.translation) mesh.position.fromArray(node.translation);
    if (node.scale) mesh.scale.fromArray(node.scale);
    if (node.rotation) mesh.quaternion.fromArray(node.rotation);
    group.add(mesh);
  });
  return {
    gltf: {
      asset: { version: "2.0", generator: "Knapsack original MVP fixtures" },
      scene: 0,
      scenes: [{ nodes: nodes.map((_, i) => i) }],
      nodes,
      meshes,
      materials,
      accessors,
      bufferViews,
      buffers: [
        {
          byteLength: offset,
          uri: `data:application/octet-stream;base64,${Buffer.concat(chunks).toString("base64")}`,
        },
      ],
    },
    bounds: new Box3().setFromObject(group),
  };
}

mkdirSync("public/models", { recursive: true });
const camera = makeAsset(
  [
    {
      geometry: new BoxGeometry(1, 0.72, 0.6),
      color: "#44554c",
      name: "Camera body",
    },
    {
      geometry: new CylinderGeometry(0.27, 0.29, 0.32, 24),
      color: "#263b34",
      name: "Camera lens",
    },
    {
      geometry: new BoxGeometry(0.23, 0.14, 0.28),
      color: "#c8c6b7",
      name: "Camera top",
    },
  ],
  [
    { mesh: 0 },
    {
      mesh: 1,
      translation: [0, 0, 0.35],
      rotation: new Quaternion()
        .setFromEuler(new Euler(Math.PI / 2, 0, 0))
        .toArray(),
    },
    { mesh: 2, translation: [-0.22, 0.42, 0] },
  ],
);
writeFileSync("public/models/travel-camera.gltf", JSON.stringify(camera.gltf));
const bag = makeAsset(
  [
    { geometry: new BoxGeometry(1, 1, 1), color: "#8d9b7d", name: "Bag shell" },
    {
      geometry: new BoxGeometry(1, 1, 1),
      color: "#c4c8b0",
      name: "Bag lining",
    },
  ],
  [
    { mesh: 0, translation: [0, -0.06, 0], scale: [4.2, 0.12, 3.2] },
    { mesh: 1, translation: [0, -0.015, 0], scale: [4, 0.03, 3] },
    { mesh: 0, translation: [-2.06, 0.9, 0], scale: [0.12, 1.8, 3.2] },
    { mesh: 0, translation: [2.06, 0.9, 0], scale: [0.12, 1.8, 3.2] },
    { mesh: 0, translation: [0, 0.9, -1.56], scale: [4.2, 1.8, 0.12] },
    { mesh: 0, translation: [0, 0.15, 1.56], scale: [4.2, 0.3, 0.12] },
    {
      mesh: 0,
      translation: [0, 1.7, -2.4],
      scale: [4.2, 0.12, 2.8],
      rotation: new Quaternion().setFromEuler(new Euler(1, 0, 0)).toArray(),
    },
  ],
);
writeFileSync("public/models/open-weekend-bag.gltf", JSON.stringify(bag.gltf));
const external = bag.bounds.getSize(new Vector3()).multiplyScalar(100),
  center = bag.bounds.getCenter(new Vector3()).multiplyScalar(100);
const item = (
  id,
  label,
  category,
  dimensions,
  color,
  modelUrl,
  required = false,
) => ({
  id,
  key: id,
  label,
  category,
  dimensions,
  estimate: dimensions,
  scale: [1, 1, 1],
  color,
  appearance: label,
  sourceIds: [],
  included: true,
  orientations: [0, 1, 2, 3, 4, 5],
  edited: false,
  required,
  priority: 3,
  ...(modelUrl ? { modelUrl } : {}),
});
const collection = {
  schemaVersion: 1,
  units: "mm",
  upAxis: "z",
  bag: {
    id: "model-weekend",
    name: "Model weekend bag",
    subtitle: "Original glTF demo",
    dimensions: [400, 300, 180],
    clearance: 3,
    modelUrl: "/models/open-weekend-bag.gltf",
    modelDimensions: [external.x, external.z, external.y],
    modelOffset: [center.x, center.z, center.y],
  },
  items: [
    item(
      "model-camera",
      "Travel camera",
      "camera",
      [140, 110, 90],
      "#44554c",
      "/models/travel-camera.gltf",
      true,
    ),
    item("model-shirt", "Folded tee", "clothing", [220, 240, 45], "#b6c39f"),
    item("model-pouch", "Daily pouch", "pouch", [180, 110, 85], "#c18c69"),
  ],
};
writeFileSync(
  "public/example-models.json",
  JSON.stringify(collection, null, 2) + "\n",
);
console.log("Generated two glTF assets and their native-unit collection.");
