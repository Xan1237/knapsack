"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide } from "three";
import type { ItemMesh } from "@/lib/mesh";
import { meshGeometry } from "@/lib/mesh-geometry";

export default function GeneratedMesh({ mesh }: { mesh: ItemMesh }) {
  const geometry = useMemo(() => meshGeometry(mesh), [mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ generatedBy: "astra" }}
    >
      {mesh.materials.map((material, index) => (
        <meshStandardMaterial
          key={index}
          attach={`material-${index}`}
          color={material.color}
          roughness={0.75}
          flatShading
          side={DoubleSide}
        />
      ))}
    </mesh>
  );
}
