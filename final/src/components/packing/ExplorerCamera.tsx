"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";
import type { ExplorerBounds } from "@/lib/explorer-layout";

function frameExplorer(
  camera: PerspectiveCamera,
  controls: OrbitControls | null,
  bounds: ExplorerBounds,
  aspect: number,
  hasOverflow: boolean,
  top: boolean,
) {
  const center = new Vector3(0, 0.6, 0);
  let distance = top ? 13 : new Vector3(7.2, 8.2, 10.8).length();
  const direction = top
    ? new Vector3(0, 1, 0.001)
    : new Vector3(7.2, 8.2, 10.8).normalize();
  if (hasOverflow) {
    const box = new Box3(
      new Vector3(...bounds.min),
      new Vector3(...bounds.max),
    );
    box.getCenter(center).add(new Vector3(-0.5, 0, 0.6));
    const radius = box.getSize(new Vector3()).length() / 2;
    const vertical = (camera.fov * Math.PI) / 360;
    const limitingAngle = Math.min(
      vertical,
      Math.atan(Math.tan(vertical) * aspect),
    );
    distance = Math.max(distance, (radius / Math.sin(limitingAngle)) * 1.12);
    camera.far = Math.max(150, distance + radius * 3);
  }
  camera.position.copy(center).addScaledVector(direction.normalize(), distance);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(center);
    controls.maxDistance = Math.max(22, distance * 2);
    controls.update();
  }
}

/** Reframe only when the occupied area or viewport changes, preserving ordinary orbiting. */
export default function ExplorerCamera({
  bounds,
  hasOverflow,
  top,
}: {
  bounds: ExplorerBounds;
  hasOverflow: boolean;
  top: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControls | null;
  const aspect = useThree((state) => state.size.width / state.size.height);
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  useEffect(() => {
    if (camera instanceof PerspectiveCamera)
      frameExplorer(
        camera,
        controls,
        { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
        aspect,
        hasOverflow,
        top,
      );
  }, [
    camera,
    controls,
    aspect,
    hasOverflow,
    top,
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
  ]);
  return null;
}
