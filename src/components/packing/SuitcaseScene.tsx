"use client";

import { Component, type ReactNode, useRef, useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  type Item,
  type Plan,
  type Suitcase,
  type Vec3,
  permutations,
  sizeOf,
} from "@/lib/domain";
import { itemQuaternion } from "@/lib/render-transform";

const unit = 100;
function Block({
  size,
  at = [0, 0, 0],
  color,
  roughness = 0.85,
}: {
  size: Vec3;
  at?: Vec3;
  color: string;
  roughness?: number;
}) {
  return (
    <RoundedBox
      args={size}
      position={at}
      radius={Math.min(...size) * 0.18}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </RoundedBox>
  );
}
function ItemModel({ item, selected }: { item: Item; selected: boolean }) {
  const color = item.color;
  return (
    <>
      {item.category === "clothing" ? (
        <>
          <Block size={[0.96, 0.88, 0.96]} color={color} />
          <Block
            size={[0.88, 0.025, 0.025]}
            at={[0, 0.447, 0.24]}
            color={color}
          />
          <Block
            size={[0.025, 0.025, 0.74]}
            at={[-0.25, 0.447, 0]}
            color={color}
          />
          <Block
            size={[0.24, 0.025, 0.13]}
            at={[0, 0.45, -0.34]}
            color="#e9e4d8"
          />
        </>
      ) : item.category === "shoes" ? (
        <>
          <Block
            size={[0.96, 0.15, 0.96]}
            at={[0, -0.405, 0]}
            color="#e9e3d7"
          />
          <Block size={[0.89, 0.45, 0.6]} at={[0, -0.13, 0.16]} color={color} />
          <Block
            size={[0.78, 0.72, 0.38]}
            at={[0, 0.04, -0.25]}
            color={color}
          />
          {[-0.14, -0.03, 0.08].map((z) => (
            <Block
              key={z}
              size={[0.6, 0.045, 0.035]}
              at={[0, 0.18, z]}
              color="#f7f4ec"
            />
          ))}
          <Block
            size={[0.46, 0.05, 0.2]}
            at={[0, 0.405, -0.24]}
            color="#706f65"
          />
        </>
      ) : item.category === "bottle" ? (
        <>
          <mesh castShadow position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.72, 32]} />
            <meshStandardMaterial color={color} roughness={0.42} />
          </mesh>
          <mesh castShadow position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.17, 24]} />
            <meshStandardMaterial color="#eee8d7" />
          </mesh>
          <Block
            size={[0.55, 0.26, 0.025]}
            at={[0, -0.03, 0.405]}
            color="#eee9dc"
          />
        </>
      ) : item.category === "pouch" ? (
        <>
          <Block size={[0.94, 0.88, 0.92]} color={color} />
          <Block
            size={[0.82, 0.035, 0.035]}
            at={[0, 0.455, 0]}
            color="#e9d7b3"
          />
          <Block
            size={[0.09, 0.025, 0.13]}
            at={[0.32, 0.46, 0.055]}
            color="#6a6357"
          />
        </>
      ) : (
        <>
          <Block size={[0.94, 0.91, 0.94]} color={color} />
          <Block size={[0.81, 0.02, 0.74]} at={[0, 0.465, 0]} color="#e9dfcc" />
          <Block
            size={[0.5, 0.022, 0.05]}
            at={[0, 0.48, -0.18]}
            color={color}
          />
        </>
      )}
      {selected && (
        <mesh>
          <boxGeometry args={[1.02, 1.02, 1.02]} />
          <meshBasicMaterial
            color="#3b5745"
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </>
  );
}
function Belonging({
  item,
  position,
  orientation,
  selected,
  onSelect,
}: {
  item: Item;
  position: Vec3;
  orientation: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const quaternion = useMemo(() => itemQuaternion(orientation), [orientation]);
  const d = sizeOf(item);
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(item.id);
  };
  const [hover, setHover] = useState(false);
  return (
    <group
      position={position}
      quaternion={quaternion}
      onClick={click}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <group scale={[d[0] / unit, d[2] / unit, d[1] / unit]}>
        <ItemModel item={item} selected={selected} />
      </group>
      {hover && (
        <Html
          center
          position={[0, d[2] / unit / 2 + 0.2, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="scene-tooltip">{item.label}</div>
        </Html>
      )}
    </group>
  );
}
type Props = {
  items: Item[];
  bag: Suitcase;
  plan: Plan | null;
  selected: string | null;
  onSelect: (id: string) => void;
  layer: number;
  step: number;
  exploded: boolean;
  resetKey: number;
};
function Scene(props: Props) {
  const { items, bag, plan, selected, onSelect, layer, step, exploded } = props;
  const w = bag.dimensions[0] / unit,
    l = bag.dimensions[1] / unit,
    h = bag.dimensions[2] / unit;
  const controls = useRef<OrbitControlsImpl>(null);
  const unplaced =
    plan?.unplaced ??
    items.filter((i) => i.included).map((i) => ({ id: i.id, reason: "" }));
  return (
    <>
      <color attach="background" args={["#eeeae1"]} />
      <ambientLight intensity={1.7} />
      <directionalLight
        position={[4, 9, 3]}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-5, 4, -4]} intensity={1.2} />
      <group position={[-0.5, 0, 0.6]}>
        <Block
          size={[w + 0.28, 0.2, l + 0.25]}
          at={[0, -0.18, 0]}
          color="#46584f"
        />
        <Block size={[w, 0.08, l]} at={[0, -0.035, 0]} color="#d1cdbd" />
        <Block
          size={[0.13, h * 0.67, l + 0.2]}
          at={[-w / 2 - 0.075, h * 0.335 - 0.08, 0]}
          color="#5c6c60"
        />
        <Block
          size={[0.13, h * 0.67, l + 0.2]}
          at={[w / 2 + 0.075, h * 0.335 - 0.08, 0]}
          color="#5c6c60"
        />
        <Block
          size={[w + 0.2, h * 0.78, 0.12]}
          at={[0, h * 0.39 - 0.08, -l / 2 - 0.06]}
          color="#5c6c60"
        />
        <Block
          size={[w + 0.2, 0.3, 0.12]}
          at={[0, 0.04, l / 2 + 0.06]}
          color="#5c6c60"
        />
        <group position={[0, h * 0.55, -l / 2 - 0.5]} rotation={[1.06, 0, 0]}>
          <Block size={[w + 0.22, 0.16, l * 0.55]} color="#596b5d" />
          <Block
            size={[w - 0.13, 0.06, l * 0.49]}
            at={[0, 0.1, 0]}
            color="#bfc5b0"
          />
          {[-0.8, -0.4, 0, 0.4, 0.8].map((x) => (
            <Block
              key={x}
              size={[0.014, 0.012, l * 0.43]}
              at={[x, 0.135, 0]}
              color="#a1ad94"
            />
          ))}
          <Block
            size={[w - 0.4, 0.025, 0.06]}
            at={[0, 0.145, 0]}
            color="#81917d"
          />
        </group>
        <Block
          size={[0.72, 0.1, 0.25]}
          at={[0, -0.1, l / 2 + 0.2]}
          color="#394a40"
        />
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (w / 2 - 0.28), -0.32, l / 2 - 0.2]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.17, 0.17, 0.15, 20]} />
            <meshStandardMaterial color="#333c34" />
          </mesh>
        ))}
        {plan?.placements.map((p) => {
          const item = items.find((i) => i.id === p.id);
          if (
            !item ||
            p.order > step ||
            p.position[2] > (bag.dimensions[2] * layer) / 100 + 0.001
          )
            return null;
          const dims = permutations[p.orientation].map((k) => sizeOf(item)[k]);
          const position: Vec3 = [
            (p.position[0] + dims[0] / 2) / unit - w / 2,
            (p.position[2] + dims[2] / 2) / unit +
              (exploded ? p.position[2] / 80 : 0),
            (p.position[1] + dims[1] / 2) / unit - l / 2,
          ];
          return (
            <Belonging
              key={p.id}
              item={item}
              position={position}
              orientation={p.orientation}
              selected={selected === p.id}
              onSelect={onSelect}
            />
          );
        })}
        {unplaced.map((u, index) => {
          const item = items.find((i) => i.id === u.id);
          if (!item) return null;
          const d = sizeOf(item);
          return (
            <Belonging
              key={u.id}
              item={item}
              position={[
                w / 2 + 1.25 + (index % 2) * 1.65,
                d[2] / unit / 2,
                Math.floor(index / 2) * 2 - l / 2,
              ]}
              orientation={0}
              selected={selected === u.id}
              onSelect={onSelect}
            />
          );
        })}
      </group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
      <OrbitControls
        key={props.resetKey}
        ref={controls}
        makeDefault
        minDistance={5}
        maxDistance={22}
        maxPolarAngle={Math.PI * 0.48}
        target={[0, 0.6, 0]}
        enableDamping
      />
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
      <div className="scene-error">
        <strong>3D view unavailable</strong>
        <p>
          Your browser could not start WebGL. Enable hardware acceleration and
          reload. Your inventory and packing diagnostics remain available.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function SuitcaseScene(props: Props) {
  return (
    <SceneBoundary>
      <Canvas
        key={props.resetKey}
        shadows
        camera={{ position: [7.2, 8.8, 10.8], fov: 39, near: 0.1, far: 150 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        aria-label="Interactive 3D packed suitcase. Drag to orbit, scroll to zoom, click an object to select it."
      >
        <Scene {...props} />
      </Canvas>
    </SceneBoundary>
  );
}
