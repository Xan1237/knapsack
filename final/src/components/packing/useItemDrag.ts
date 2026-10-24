"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Group, Plane, Vector2, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";

// Three's navigation controller is an imperative engine object, separate from React state.
function enableNavigation(controls: OrbitControls | null, enabled: boolean) {
  if (controls) controls.enabled = enabled;
}

/** Capture the pointer so a dragged mesh keeps moving across the seam and off-canvas. */
export function useItemDrag(
  motion: RefObject<Group | null>,
  target: RefObject<Vector3>,
  enabled: boolean,
  onSelect: () => void,
  onDrop?: (worldPoint: Vector3) => boolean,
) {
  const controls = useThree((state) => state.controls) as OrbitControls | null;
  const drag = useRef<{
    pointer: number;
    plane: Plane;
    offset: Vector3;
    start: Vector2;
    origin: Vector3;
    moved: boolean;
    capture: HTMLElement;
  } | null>(null);
  useEffect(
    () => () => {
      if (drag.current) enableNavigation(controls, true);
      document.body.style.cursor = "auto";
    },
    [controls],
  );

  const finish = (event: ThreeEvent<PointerEvent>, cancel = false) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    enableNavigation(controls, true);
    document.body.style.cursor = enabled ? "grab" : "auto";
    const accepted =
      !cancel &&
      active.moved &&
      motion.current &&
      onDrop?.(motion.current.getWorldPosition(new Vector3()));
    if (!accepted) target.current.copy(active.origin);
    if (active.capture.hasPointerCapture(event.pointerId))
      active.capture.releasePointerCapture(event.pointerId);
  };
  return {
    active: drag,
    handlers: {
      onPointerDown(event: ThreeEvent<PointerEvent>) {
        if (
          !enabled ||
          !onDrop ||
          !motion.current ||
          event.button !== 0 ||
          drag.current
        )
          return;
        event.stopPropagation();
        const center = motion.current.getWorldPosition(new Vector3());
        const plane = new Plane(new Vector3(0, 1, 0), -center.y);
        const hit = event.ray.intersectPlane(plane, new Vector3());
        if (!hit) return;
        drag.current = {
          pointer: event.pointerId,
          plane,
          offset: center.clone().sub(hit),
          start: new Vector2(event.clientX, event.clientY),
          origin: target.current.clone(),
          moved: false,
          capture: event.target as HTMLElement,
        };
        enableNavigation(controls, false);
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        document.body.style.cursor = "grabbing";
        onSelect();
      },
      onPointerMove(event: ThreeEvent<PointerEvent>) {
        const active = drag.current;
        const group = motion.current;
        if (!active || active.pointer !== event.pointerId || !group?.parent)
          return;
        event.stopPropagation();
        if (
          !active.moved &&
          active.start.distanceTo(new Vector2(event.clientX, event.clientY)) < 5
        )
          return;
        active.moved = true;
        const hit = event.ray.intersectPlane(active.plane, new Vector3());
        if (!hit) return;
        target.current.copy(group.parent.worldToLocal(hit.add(active.offset)));
        group.position.copy(target.current);
      },
      onPointerUp: (event: ThreeEvent<PointerEvent>) => finish(event),
      onPointerCancel: (event: ThreeEvent<PointerEvent>) => finish(event, true),
      onLostPointerCapture: (event: ThreeEvent<PointerEvent>) =>
        finish(event, true),
    },
  };
}
