"use client";

import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Group, MathUtils } from "three";
import type { Suitcase, Vec3 } from "@/lib/domain";
import { clamshellPose } from "@/lib/render-transform";

function Part({
  size,
  at = [0, 0, 0],
  color,
  rotation,
}: {
  size: Vec3;
  at?: Vec3;
  color: string;
  rotation?: Vec3;
}) {
  return (
    <RoundedBox
      args={size}
      position={at}
      rotation={rotation}
      radius={Math.min(0.12, ...size.map((n) => n * 0.45))}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.78} />
    </RoundedBox>
  );
}

function Half({
  w,
  l,
  h,
  color,
  lid = false,
}: {
  w: number;
  l: number;
  h: number;
  color: string;
  lid?: boolean;
}) {
  return (
    <>
      <Part
        size={[w + 0.18, 0.18, l + 0.18]}
        at={[0, -0.12, 0]}
        color={color}
      />
      <Part
        size={[w, 0.045, l]}
        at={[0, -0.004, 0]}
        color={lid ? "#c3c8b4" : "#d2d3c0"}
      />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part
            size={[0.1, h + 0.12, l + 0.16]}
            at={[s * (w / 2 + 0.035), h / 2 - 0.045, 0]}
            color={color}
          />
          <Part
            size={[w + 0.16, h + 0.12, 0.1]}
            at={[0, h / 2 - 0.045, s * (l / 2 + 0.035)]}
            color={color}
          />
          <Part
            size={[0.035, 0.045, l + 0.12]}
            at={[s * (w / 2 + 0.04), h + 0.03, 0]}
            color="#47563e"
          />
          <Part
            size={[w + 0.12, 0.045, 0.035]}
            at={[0, h + 0.03, s * (l / 2 + 0.04)]}
            color="#47563e"
          />
          <Part
            size={[0.025, h * 0.82, l - 0.08]}
            at={[s * (w / 2 - 0.03), h * 0.43, 0]}
            color="#adb69c"
          />
        </group>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <Part
          key={i}
          size={[0.024, h * 0.73, 0.025]}
          at={[-w * 0.4 + i * w * 0.1, h * 0.39, l / 2 + 0.095]}
          color="#65775c"
        />
      ))}
      {lid && (
        <>
          {Array.from({ length: 7 }, (_, index) => (
            <Part
              key={`rib-${index}`}
              size={[0.055, 0.045, l * 0.76]}
              at={[-w * 0.36 + index * w * 0.12, -0.232, 0]}
              color="#68795e"
            />
          ))}
          <Part
            size={[0.64, 0.045, 0.25]}
            at={[0, -0.267, -l * 0.16]}
            color="#68795e"
          />
          <Part
            size={[0.35, 0.012, 0.022]}
            at={[0, -0.296, -l * 0.16]}
            color="#d8ddc7"
          />
          <Part
            size={[w * 0.82, 0.025, 0.075]}
            at={[0, h + 0.015, 0]}
            rotation={[0, 0.6, 0]}
            color="#9ba78b"
          />
          <Part
            size={[w * 0.82, 0.025, 0.075]}
            at={[0, h + 0.015, 0]}
            rotation={[0, -0.6, 0]}
            color="#9ba78b"
          />
          <Part
            size={[0.16, 0.055, 0.16]}
            at={[0, h + 0.035, 0]}
            color="#56674c"
          />
        </>
      )}
    </>
  );
}

export default function ClamshellCase({
  bag,
  closed = false,
  closing,
  base,
  lid,
}: {
  bag: Suitcase;
  closed?: boolean;
  closing?: RefObject<number>;
  base?: ReactNode;
  lid?: ReactNode;
}) {
  const root = useRef<Group>(null),
    hinge = useRef<Group>(null),
    amount = useRef(0);
  const reduced = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = preference.matches;
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const w = bag.dimensions[0] / 100,
    l = bag.dimensions[1] / 100,
    h = bag.dimensions[2] / 200;
  useFrame((_, delta) => {
    const target = closing ? closing.current : closed ? 1 : 0;
    amount.current = reduced.current
      ? target
      : MathUtils.damp(amount.current, target, 5, delta);
    const pose = clamshellPose(w, h, amount.current);
    if (hinge.current) hinge.current.rotation.z = pose.lidAngle;
    if (root.current) root.current.position.x = pose.rootX;
  });
  return (
    <group ref={root} position={[clamshellPose(w, h, 0).rootX, 0, 0]}>
      <Half w={w} l={l} h={h} color={bag.color || "#76876c"} />
      {base}
      <group ref={hinge} position={clamshellPose(w, h, 0).hinge}>
        <group position={clamshellPose(w, h, 0).lidOrigin}>
          <Half w={w} l={l} h={h} color={bag.color || "#76876c"} lid />
          {lid}
        </group>
      </group>
      {[-0.7, 0.7].map((z) => (
        <Part
          key={z}
          size={[0.17, 0.13, 0.22]}
          at={[-w / 2, h, z * l * 0.45]}
          color="#56674c"
        />
      ))}
      <group position={[w / 2 + 0.14, h, 0]}>
        <Part size={[0.13, 0.25, 0.7]} color="#4f6046" />
        <Part size={[0.13, 0.12, 0.47]} at={[0.08, 0.02, 0]} color="#9aa78b" />
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - 0.18), -0.29, l / 2 - 0.17]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.13, 20]} />
            <meshStandardMaterial color="#374333" />
          </mesh>
        </group>
      ))}
      <Part
        size={[0.07, 0.06, 0.16]}
        at={[w / 2 + 0.08, h + 0.07, -l * 0.24]}
        color="#c3b18a"
      />
    </group>
  );
}
