"use client";

import {
  Component,
  type ReactNode,
  useRef,
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  Suspense,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  type Item,
  type Plan,
  type Suitcase,
  type Vec3,
  type ItemAnchor,
  permutations,
  sizeOf,
} from "@/lib/domain";
import { itemQuaternion } from "@/lib/render-transform";
import GeneratedMesh from "./GeneratedMesh";
import ClamshellCase from "./ClamshellCase";
import { anchorAtPoint } from "@/lib/manual-layout";
import { useItemDrag } from "./useItemDrag";
import { explorerLayout } from "@/lib/explorer-layout";
import ExplorerCamera from "./ExplorerCamera";

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
      ) : item.category === "camera" ? (
        <>
          <Block size={[0.94, 0.75, 0.68]} color={color} />
          <mesh
            castShadow
            position={[0, 0, 0.34]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.28, 0.3, 0.3, 28]} />
            <meshStandardMaterial color="#293b34" />
          </mesh>
          <Block
            size={[0.24, 0.13, 0.3]}
            at={[-0.22, 0.4, 0]}
            color="#c7c6b7"
          />
        </>
      ) : item.category === "headphones" ? (
        <>
          <mesh castShadow position={[0, -0.15, 0]}>
            <torusGeometry args={[0.35, 0.055, 12, 40, Math.PI]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {[-1, 1].map((side) => (
            <Block
              key={side}
              size={[0.23, 0.5, 0.68]}
              at={[side * 0.34, -0.2, 0]}
              color={color}
            />
          ))}
        </>
      ) : item.category === "book" ? (
        <>
          <Block size={[0.95, 0.9, 0.96]} color={color} />
          <Block size={[0.9, 0.65, 0.94]} at={[0.02, 0, 0]} color="#eee8d8" />
          <Block size={[0.96, 0.04, 0.97]} at={[0, 0.46, 0]} color={color} />
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
class AssetBoundary extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
    onError?: (message: string) => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.(
      "A 3D asset could not load. Its preview shape is shown so you can keep packing.",
    );
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function ModelAsset({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const normalized = useMemo(() => {
    const model = scene.clone(true);
    const bounds = new Box3().setFromObject(model),
      size = bounds.getSize(new Vector3()),
      center = bounds.getCenter(new Vector3());
    if (Math.min(size.x, size.y, size.z) <= 0)
      throw new Error("Empty model bounds");
    model.position.sub(center);
    model.traverse((object) => {
      object.castShadow = true;
      object.receiveShadow = true;
    });
    const group = new Group();
    group.add(model);
    group.scale.set(1 / size.x, 1 / size.y, 1 / size.z);
    return group;
  }, [scene]);
  return <primitive object={normalized} dispose={null} />;
}
function Belonging({
  item,
  position,
  orientation,
  selected,
  onSelect,
  onModelError,
  draggable = false,
  onDrop,
  onHover,
}: {
  item: Item;
  position: Vec3;
  orientation: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onModelError?: (message: string) => void;
  draggable?: boolean;
  onDrop?: (item: Item, worldPoint: Vector3, orientation: number) => boolean;
  onHover?: (label: string | null) => void;
}) {
  const quaternion = useMemo(() => itemQuaternion(orientation), [orientation]);
  const d = sizeOf(item);
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(item.id);
  };
  const motion = useRef<Group>(null),
    target = useRef(new Vector3(...position)),
    reduced = useRef(false);
  const drag = useItemDrag(
    motion,
    target,
    draggable,
    () => onSelect(item.id),
    onDrop ? (point) => onDrop(item, point, orientation) : undefined,
  );
  const [start] = useState<Vec3>(() => [
    position[0],
    position[1] + 2,
    position[2],
  ]);
  useLayoutEffect(() => {
    if (!drag.active.current) target.current.fromArray(position);
  }, [position, drag.active]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = preference.matches;
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useFrame((_, delta) => {
    if (motion.current && !drag.active.current) {
      if (reduced.current) motion.current.position.copy(target.current);
      else
        motion.current.position.lerp(target.current, 1 - Math.exp(-delta * 10));
    }
  });
  return (
    <group
      ref={motion}
      position={start}
      quaternion={quaternion}
      onClick={click}
      {...drag.handlers}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover?.(item.label);
        document.body.style.cursor = drag.active.current
          ? "grabbing"
          : draggable
            ? "grab"
            : "pointer";
      }}
      onPointerOut={() => {
        onHover?.(null);
        if (!drag.active.current) document.body.style.cursor = "auto";
      }}
    >
      <group scale={[d[0] / unit, d[2] / unit, d[1] / unit]}>
        {item.mesh ? (
          <>
            <GeneratedMesh mesh={item.mesh} />
            {selected && (
              <mesh>
                <boxGeometry args={[1.02, 1.02, 1.02]} />
                <meshBasicMaterial color="#d18c54" wireframe />
              </mesh>
            )}
          </>
        ) : item.modelUrl ? (
          <>
            <AssetBoundary
              key={item.modelUrl}
              fallback={<ItemModel item={item} selected={false} />}
              onError={onModelError}
            >
              <Suspense fallback={<ItemModel item={item} selected={false} />}>
                <ModelAsset url={item.modelUrl} />
              </Suspense>
            </AssetBoundary>
            {selected && (
              <mesh>
                <boxGeometry args={[1.02, 1.02, 1.02]} />
                <meshBasicMaterial color="#d18c54" wireframe />
              </mesh>
            )}
          </>
        ) : (
          <ItemModel item={item} selected={selected} />
        )}
      </group>
    </group>
  );
}
function ProceduralBag({ bag }: { bag: Suitcase }) {
  const w = bag.dimensions[0] / unit,
    l = bag.dimensions[1] / unit,
    h = bag.dimensions[2] / unit;
  return (
    <>
      <Block
        size={[w + 0.28, 0.2, l + 0.25]}
        at={[0, -0.18, 0]}
        color="#46584f"
      />
      <Block size={[w, 0.08, l]} at={[0, -0.035, 0]} color="#d1cdbd" />
      <Block
        size={[0.13, h * 0.67, l + 0.2]}
        at={[-w / 2 - 0.075, h * 0.335 - 0.08, 0]}
        color={bag.color || "#5c6c60"}
      />
      <Block
        size={[0.13, h * 0.67, l + 0.2]}
        at={[w / 2 + 0.075, h * 0.335 - 0.08, 0]}
        color={bag.color || "#5c6c60"}
      />
      <Block
        size={[w + 0.2, h * 0.78, 0.12]}
        at={[0, h * 0.39 - 0.08, -l / 2 - 0.06]}
        color={bag.color || "#5c6c60"}
      />
      <Block
        size={[w + 0.2, 0.3, 0.12]}
        at={[0, 0.04, l / 2 + 0.06]}
        color={bag.color || "#5c6c60"}
      />
      <group position={[0, h * 0.55, -l / 2 - 0.5]} rotation={[1.06, 0, 0]}>
        <Block
          size={[w + 0.22, 0.16, l * 0.55]}
          color={bag.color || "#596b5d"}
        />
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
    </>
  );
}
function BagModel({
  bag,
  onModelError,
}: {
  bag: Suitcase;
  onModelError?: (message: string) => void;
}) {
  const fallback = <ProceduralBag bag={bag} />;
  if (!bag.modelUrl) return fallback;
  const d = bag.modelDimensions || [
    bag.dimensions[0] + 28,
    bag.dimensions[1] + 25,
    bag.dimensions[2] + 20,
  ];
  const offset = bag.modelOffset || [0, 0, bag.dimensions[2] / 2];
  return (
    <AssetBoundary
      key={bag.modelUrl}
      fallback={fallback}
      onError={onModelError}
    >
      <Suspense fallback={fallback}>
        <group
          position={[offset[0] / unit, offset[2] / unit, offset[1] / unit]}
          scale={[d[0] / unit, d[2] / unit, d[1] / unit]}
        >
          <ModelAsset url={bag.modelUrl} />
        </group>
      </Suspense>
    </AssetBoundary>
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
  view?: "perspective" | "top";
  onModelError?: (message: string) => void;
  moveMode?: boolean;
  onMove?: (id: string, anchor: ItemAnchor) => void;
  onHover?: (label: string | null) => void;
};

function PackedItems({
  props,
  compartment,
  onDrop,
}: {
  props: Props;
  compartment?: "base" | "lid";
  onDrop: (item: Item, worldPoint: Vector3, orientation: number) => boolean;
}) {
  const { items, bag, plan, selected, onSelect, layer, step, exploded } = props;
  const w = bag.dimensions[0] / unit,
    l = bag.dimensions[1] / unit;
  const depth = bag.dimensions[2] / (bag.clamshell ? 2 : 1);
  return (
    <>
      {plan?.placements
        .filter((p) => p.compartment === compartment)
        .map((p) => {
          const item = items.find((i) => i.id === p.id);
          if (
            !item ||
            p.order > step ||
            p.position[2] >
              bag.clearance + ((depth - bag.clearance) * layer) / 100 + 0.001
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
              onModelError={props.onModelError}
              draggable={props.moveMode}
              onDrop={onDrop}
              onHover={props.onHover}
            />
          );
        })}
    </>
  );
}

function Scene(props: Props) {
  const { items, bag, plan, selected, onSelect } = props;
  const controls = useRef<OrbitControlsImpl>(null);
  const caseFrame = useRef<Group>(null);
  const drop = (item: Item, worldPoint: Vector3, orientation: number) => {
    if (!caseFrame.current || !props.onMove) return false;
    const local = caseFrame.current.worldToLocal(worldPoint.clone());
    const anchor = anchorAtPoint(
      item,
      bag,
      local.toArray() as Vec3,
      orientation,
    );
    if (!anchor) {
      props.onModelError?.(
        "This item cannot fit here in its current orientation. Resize it or allow another rotation.",
      );
      return false;
    }
    props.onMove(item.id, anchor);
    return true;
  };
  const unplaced =
    plan?.unplaced ??
    items.filter((i) => i.included).map((i) => ({ id: i.id, reason: "" }));
  const unplacedIds = new Set(unplaced.map((item) => item.id));
  const { overflow, bounds } = explorerLayout(
    items.filter((item) => item.included && unplacedIds.has(item.id)),
    bag,
  );
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
      <group ref={caseFrame} position={[-0.5, 0, 0.6]}>
        {bag.clamshell ? (
          <ClamshellCase
            bag={bag}
            closed={
              props.step > (plan?.placements.length ?? 0) && !props.exploded
            }
            base={
              <PackedItems props={props} compartment="base" onDrop={drop} />
            }
            lid={<PackedItems props={props} compartment="lid" onDrop={drop} />}
          />
        ) : (
          <>
            <BagModel bag={bag} onModelError={props.onModelError} />
            <PackedItems props={props} onDrop={drop} />
          </>
        )}
        {overflow.map((u) => {
          const item = items.find((i) => i.id === u.id);
          if (!item) return null;
          return (
            <Belonging
              key={u.id}
              item={item}
              position={u.position}
              orientation={0}
              selected={selected === u.id}
              onSelect={onSelect}
              onModelError={props.onModelError}
              draggable={props.moveMode}
              onDrop={drop}
              onHover={props.onHover}
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
      <ExplorerCamera
        bounds={bounds}
        hasOverflow={overflow.length > 0}
        top={props.view === "top"}
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
function ContextMonitor({ onLost }: { onLost: (lost: boolean) => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost(true);
    };
    gl.domElement.addEventListener("webglcontextlost", handleLost);
    return () =>
      gl.domElement.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}
export default function SuitcaseScene(props: Props) {
  const [contextLost, setContextLost] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const overflowCount =
    props.plan?.unplaced.filter((entry) =>
      props.items.some((item) => item.id === entry.id && item.included),
    ).length ?? 0;
  if (contextLost)
    return (
      <div className="scene-error" role="alert">
        <strong>The 3D view was interrupted</strong>
        <p>
          Your browser lost its WebGL context. Your inventory and validated
          packing plan are safe.
        </p>
        <button
          className="primary-button"
          onClick={() => setContextLost(false)}
        >
          Retry 3D view
        </button>
      </div>
    );
  return (
    <SceneBoundary>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Canvas
          key={props.resetKey}
          shadows
          camera={{
            position: props.view === "top" ? [0, 13, 0.01] : [7.2, 8.8, 10.8],
            fov: 39,
            near: 0.1,
            far: 150,
          }}
          dpr={[1, 1.8]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          aria-label="Interactive 3D packed suitcase. Enable Move items to drag belongings and repack around them. Drag empty space to orbit, scroll to zoom."
        >
          <Scene {...props} onHover={setHovered} />
          <ContextMonitor onLost={setContextLost} />
        </Canvas>
        {overflowCount > 0 && (
          <div
            className="scene-tooltip"
            style={{
              position: "absolute",
              left: 16,
              top: 16,
              pointerEvents: "none",
            }}
          >
            Outside the suitcase · {overflowCount} items
          </div>
        )}
        {hovered && (
          <div
            className="scene-tooltip"
            style={{
              position: "absolute",
              bottom: 44,
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            {hovered}
          </div>
        )}
      </div>
    </SceneBoundary>
  );
}
