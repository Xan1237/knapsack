"use client";

import { Component, type ReactNode, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CatmullRomCurve3, MathUtils, Vector3, type Group } from "three";

type ItemId = "sweatshirt" | "toiletries" | "bottle" | "passport";
const items: { id: ItemId; label: string; image: string }[] = [
  { id: "sweatshirt", label: "Sweatshirt", image: "folded_sweatshirt.png" },
  { id: "toiletries", label: "Toiletry bag", image: "toiletry_bag.png" },
  { id: "bottle", label: "Water bottle", image: "water_bottle.png" },
  { id: "passport", label: "Passport", image: "passport.png" },
];

type BoxProps = {
  size: [number, number, number];
  position?: [number, number, number];
  color: string;
  radius?: number;
  rotation?: [number, number, number];
};

function Box({ size, position, color, radius = 0.08, rotation }: BoxProps) {
  return (
    <RoundedBox
      args={size}
      position={position}
      rotation={rotation}
      radius={radius}
      smoothness={4}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.83} />
    </RoundedBox>
  );
}

function Backpack() {
  const straps = useMemo(
    () =>
      [-1, 1].map(
        (side) =>
          new CatmullRomCurve3([
            new Vector3(side * 0.55, -0.3, 1.55),
            new Vector3(side * 0.85, -0.35, 2.35),
            new Vector3(side * 0.92, -0.32, 3.05),
            new Vector3(side * 1.15, -0.3, 3.22),
            new Vector3(side * 1.35, -0.3, 2.9),
            new Vector3(side * 1.35, -0.3, 1.6),
          ]),
      ),
    [],
  );
  return (
    <group>
      {/* Shoulder straps extend from beneath the open bag. */}
      {straps.map((strap, index) => (
        <mesh key={index} castShadow>
          <tubeGeometry args={[strap, 40, 0.12, 10, false]} />
          <meshStandardMaterial color="#526b55" roughness={0.9} />
        </mesh>
      ))}
      <Box
        size={[3.55, 0.32, 4.85]}
        position={[0, -0.2, 0]}
        color="#637762"
        radius={0.3}
      />
      <Box
        size={[3.18, 0.11, 4.45]}
        position={[0, 0.01, 0]}
        color="#cbd2bc"
        radius={0.2}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            size={[0.2, 0.75, 4.45]}
            position={[side * 1.66, 0.28, 0]}
            color="#71856e"
            radius={0.09}
          />
          <Box
            size={[0.05, 0.06, 4.25]}
            position={[side * 1.65, 0.68, 0]}
            color="#465e4b"
            radius={0.02}
          />
          <Box
            size={[3.2, 0.75, 0.2]}
            position={[0, 0.28, side * 2.27]}
            color="#71856e"
            radius={0.09}
          />
          <Box
            size={[3.05, 0.06, 0.05]}
            position={[0, 0.68, side * 2.27]}
            color="#465e4b"
            radius={0.02}
          />
          <Box
            size={[0.48, 0.13, 2.35]}
            position={[side * 0.95, -0.43, 0.15]}
            color="#4d6551"
            radius={0.06}
          />
        </group>
      ))}
      <Box
        size={[1.15, 0.16, 0.25]}
        position={[0, -0.14, -2.58]}
        color="#455d49"
        radius={0.07}
      />
      <Box
        size={[0.15, 0.16, 0.38]}
        position={[-0.5, -0.14, -2.43]}
        color="#455d49"
        radius={0.06}
      />
      <Box
        size={[0.15, 0.16, 0.38]}
        position={[0.5, -0.14, -2.43]}
        color="#455d49"
        radius={0.06}
      />
    </group>
  );
}

function Sweatshirt() {
  return (
    <group>
      <Box size={[1.7, 0.42, 1.7]} color="#65615e" radius={0.17} />
      <Box
        size={[1.53, 0.08, 1.45]}
        position={[0, 0.24, 0]}
        color="#716b67"
        radius={0.08}
      />
      <Box
        size={[0.8, 0.04, 0.7]}
        position={[0.25, 0.3, -0.22]}
        rotation={[0, -0.12, 0]}
        color="#5c5856"
        radius={0.04}
      />
    </group>
  );
}

function Toiletries() {
  return (
    <group>
      <Box size={[1.15, 0.5, 1.32]} color="#344558" radius={0.17} />
      <Box
        size={[0.98, 0.06, 1.12]}
        position={[0, 0.28, 0]}
        color="#51647a"
        radius={0.11}
      />
      <Box
        size={[0.92, 0.035, 0.035]}
        position={[0, 0.32, -0.49]}
        color="#b8ad8e"
        radius={0.01}
      />
      <Box
        size={[0.2, 0.1, 0.2]}
        position={[-0.25, 0.34, 0.2]}
        color="#e0d9c7"
        radius={0.04}
      />
      <Box
        size={[0.22, 0.1, 0.26]}
        position={[0.1, 0.34, 0.2]}
        color="#a3c5d0"
        radius={0.04}
      />
    </group>
  );
}

function Bottle() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.23, 0.23, 1.32, 32]} />
        <meshStandardMaterial color="#3d7895" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 32]} />
        <meshStandardMaterial
          color="#c1baaa"
          metalness={0.5}
          roughness={0.45}
        />
      </mesh>
    </group>
  );
}

function Passport() {
  return (
    <group>
      <Box size={[0.96, 0.12, 1.28]} color="#283d58" radius={0.04} />
      <Box
        size={[0.86, 0.025, 1.18]}
        position={[0, 0.07, 0]}
        color="#354b68"
        radius={0.03}
      />
      <Box
        size={[0.35, 0.015, 0.035]}
        position={[0, 0.09, -0.33]}
        color="#d3b76d"
        radius={0.005}
      />
      <mesh position={[0, 0.09, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial color="#d3b76d" />
      </mesh>
    </group>
  );
}

function PackedItem({
  id,
  selected,
  position,
  onSelect,
  children,
}: {
  id: ItemId;
  selected: boolean;
  position: [number, number, number];
  onSelect: (id: ItemId) => void;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current)
      group.current.position.y = MathUtils.damp(
        group.current.position.y,
        position[1] + (selected ? 0.2 : 0),
        7,
        delta,
      );
  });
  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
    >
      {children}
      {selected && (
        <mesh position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.52, 48]} />
          <meshBasicMaterial color="#f5d890" />
        </mesh>
      )}
    </group>
  );
}

function Scene({
  selected,
  onSelect,
}: {
  selected: ItemId;
  onSelect: (id: ItemId) => void;
}) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight args={["#fff9e9", "#a3af9c", 1]} />
      <directionalLight position={[-4, 8, 5]} intensity={2.3} castShadow />
      <group rotation={[0, -0.15, 0]}>
        <Backpack />
        <PackedItem
          id="sweatshirt"
          selected={selected === "sweatshirt"}
          position={[-0.62, 0.27, 1.05]}
          onSelect={onSelect}
        >
          <Sweatshirt />
        </PackedItem>
        <PackedItem
          id="toiletries"
          selected={selected === "toiletries"}
          position={[0.93, 0.31, 1.06]}
          onSelect={onSelect}
        >
          <Toiletries />
        </PackedItem>
        <PackedItem
          id="passport"
          selected={selected === "passport"}
          position={[-0.6, 0.15, -1.1]}
          onSelect={onSelect}
        >
          <Passport />
        </PackedItem>
        <PackedItem
          id="bottle"
          selected={selected === "bottle"}
          position={[0.83, 0.29, -0.95]}
          onSelect={onSelect}
        >
          <Bottle />
        </PackedItem>
      </group>
    </>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="backpack-fallback">Your essentials, ready to pack.</div>
    ) : (
      this.props.children
    );
  }
}

export default function BackpackDiagram() {
  const [selected, setSelected] = useState<ItemId>("sweatshirt");
  const selectedItem = items.find((item) => item.id === selected)!;
  return (
    <div className="backpack-diagram">
      <div className="backpack-diagram-heading">
        <span>YOUR PACKING PLAN</span>
        <span>EXAMPLE / 01</span>
      </div>
      <div
        className="backpack-scene"
        role="img"
        aria-label={`A 3D carry-on backpack containing a sweatshirt, toiletry bag, water bottle and passport. ${selectedItem.label} selected.`}
      >
        <SceneBoundary>
          <Canvas
            shadows
            orthographic
            camera={{ position: [6, 8, 9], zoom: 55, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: true }}
            fallback={
              <div className="backpack-fallback">
                Your essentials, ready to pack.
              </div>
            }
          >
            <Scene selected={selected} onSelect={setSelected} />
          </Canvas>
        </SceneBoundary>
      </div>
      <div
        className="backpack-items"
        aria-label="Select an item to see it in the backpack"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              selected === item.id
                ? "backpack-item is-selected"
                : "backpack-item"
            }
            aria-label={item.label}
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
          >
            <Image
              src={`/travel-essentials/${item.image}`}
              width={80}
              height={80}
              alt=""
            />
          </button>
        ))}
      </div>
      <p className="backpack-selected">
        {selectedItem.label} <span>↗</span>
      </p>
    </div>
  );
}
