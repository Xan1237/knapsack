"use client";

import {
  Component,
  createContext,
  useContext,
  Suspense,
  type ReactNode,
  type CSSProperties,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import {
  DataTexture,
  MathUtils,
  Mesh,
  RepeatWrapping,
  SRGBColorSpace,
  Plane,
  Vector3,
  type Group,
  type OrthographicCamera,
} from "three";

type ItemId =
  | "sweatshirt"
  | "toiletries"
  | "bottle"
  | "passport"
  | "socks"
  | "sunglasses"
  | "earbuds";
const items: { id: ItemId; label: string; image: string }[] = [
  { id: "sweatshirt", label: "Sweatshirt", image: "folded_sweatshirt.png" },
  { id: "toiletries", label: "Toiletry bag", image: "toiletry_bag.png" },
  { id: "bottle", label: "Water bottle", image: "water_bottle.png" },
  { id: "passport", label: "Passport", image: "passport.png" },
  { id: "socks", label: "Socks", image: "socks.png" },
  { id: "sunglasses", label: "Sunglasses", image: "sunglasses.png" },
  { id: "earbuds", label: "Earbuds", image: "wireless_earbuds.png" },
];

const ClosedContext = createContext(false);

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

function Backpack({ closed }: { closed: boolean }) {
  const hinge = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const progress = useRef(0);
  const { scene } = useGLTF("/models/backpack-city.glb");
  const parts = useMemo(() => {
    const coverPlane = new Plane(new Vector3(0, 0, 1), -0.047);
    const worldCoverPlane = coverPlane.clone();
    const copyPart = (name: string, cut: "lower" | "upper" | null = null) => {
      const part = scene.getObjectByName(name.replace(/\s/g, "_"))?.clone(true);
      if (!part) throw new Error(`Backpack model is missing ${name}`);
      part.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (cut) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          const clipped = materials.map((material) => {
            const copy = material.clone();
            copy.clippingPlanes = [
              cut === "upper"
                ? worldCoverPlane
                : new Plane(new Vector3(0, -1, 0), 0.026),
            ];
            copy.clipShadows = true;
            return copy;
          });
          object.material = Array.isArray(object.material)
            ? clipped
            : clipped[0];
        }
      });
      return part;
    };
    return {
      straps: copyPart("Back panel and shoulder straps"),
      body: copyPart("Backpack body", "lower"),
      cover: copyPart("Backpack body", "upper"),
      pocket: copyPart("Front zip pocket"),
      zips: copyPart("Zips, handle and pulls"),
      coverPlane,
      worldCoverPlane,
    };
  }, [scene]);
  useFrame((_, delta) => {
    if (!cover.current || !hinge.current) return;
    const target = closed ? 1 : 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    progress.current = reduceMotion
      ? target
      : MathUtils.damp(progress.current, target, 3.5, delta);
    const open = 1 - progress.current;
    hinge.current.rotation.x = 2.35 * open;
    cover.current.updateWorldMatrix(true, false);
    parts.worldCoverPlane
      .copy(parts.coverPlane)
      .applyMatrix4(cover.current.matrixWorld);
  });
  return (
    <group
      position={[0, -0.35, 1.76]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={8}
    >
      <primitive object={parts.straps} />
      <primitive object={parts.body} />
      <primitive object={parts.zips} />
      <group ref={hinge} position={[0, 0.02, 0.047]} rotation={[2.35, 0, 0]}>
        <group ref={cover} position={[0, -0.02, -0.047]}>
          <primitive object={parts.cover} />
          <primitive object={parts.pocket} />
        </group>
      </group>
    </group>
  );
}

function Sweatshirt() {
  const fabric = useMemo(() => {
    const size = 64;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const grain =
          205 + ((x * 17 + y * 29 + x * y * 3) % 31) + (x % 4 === 0 ? 8 : 0);
        pixels[i] = pixels[i + 1] = pixels[i + 2] = grain;
        pixels[i + 3] = 255;
      }
    }
    const texture = new DataTexture(pixels, size, size);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);
  return (
    <group>
      <RoundedBox
        args={[1.7, 0.24, 1.6]}
        radius={0.12}
        smoothness={5}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#5c5958" map={fabric} roughness={1} />
      </RoundedBox>
      <RoundedBox
        args={[1.48, 0.07, 1.42]}
        position={[0, 0.14, -0.03]}
        radius={0.06}
        smoothness={5}
        castShadow
      >
        <meshStandardMaterial color="#706b69" map={fabric} roughness={1} />
      </RoundedBox>
      <RoundedBox
        args={[0.72, 0.07, 1.12]}
        position={[-0.37, 0.2, 0.08]}
        rotation={[0, -0.16, 0]}
        radius={0.06}
        smoothness={5}
        castShadow
      >
        <meshStandardMaterial color="#676260" map={fabric} roughness={1} />
      </RoundedBox>
      <RoundedBox
        args={[0.72, 0.06, 1.12]}
        position={[0.37, 0.19, 0.08]}
        rotation={[0, 0.16, 0]}
        radius={0.06}
        smoothness={5}
        castShadow
      >
        <meshStandardMaterial color="#5f5b59" map={fabric} roughness={1} />
      </RoundedBox>
      <Box
        size={[0.52, 0.025, 0.09]}
        position={[0, 0.2, -0.54]}
        color="#504c4b"
        radius={0.015}
      />
      <Box
        size={[1.32, 0.012, 0.025]}
        position={[0, 0.24, 0.62]}
        color="#827b78"
        radius={0.004}
      />
    </group>
  );
}

function Toiletries() {
  return (
    <group>
      <Box size={[1.15, 0.32, 1.32]} color="#344558" radius={0.14} />
      <Box
        size={[0.98, 0.06, 1.12]}
        position={[0, 0.18, 0]}
        color="#51647a"
        radius={0.11}
      />
      <Box
        size={[0.92, 0.035, 0.035]}
        position={[0, 0.22, -0.49]}
        color="#b8ad8e"
        radius={0.01}
      />
      <Box
        size={[0.2, 0.1, 0.2]}
        position={[-0.25, 0.23, 0.2]}
        color="#e0d9c7"
        radius={0.04}
      />
      <Box
        size={[0.22, 0.1, 0.26]}
        position={[0.1, 0.23, 0.2]}
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

function Socks() {
  return (
    <group>
      <Box
        size={[0.42, 0.18, 0.7]}
        position={[-0.2, 0, 0]}
        color="#e6e1db"
        radius={0.08}
      />
      <Box
        size={[0.42, 0.18, 0.7]}
        position={[0.2, 0.03, 0.06]}
        color="#f1ece7"
        radius={0.08}
      />
    </group>
  );
}
function Sunglasses() {
  return (
    <group>
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.19, 0.035, 8, 24]} />
          <meshStandardMaterial color="#282b29" />
        </mesh>
      ))}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#514f43" />
        </mesh>
      ))}
      <Box size={[0.18, 0.035, 0.035]} color="#282b29" radius={0.01} />
    </group>
  );
}
function Earbuds() {
  return (
    <group>
      <Box size={[0.4, 0.18, 0.34]} color="#f2eee7" radius={0.08} />
      <Box
        size={[0.3, 0.02, 0.03]}
        position={[0, 0.1, -0.05]}
        color="#d0c9c0"
        radius={0.008}
      />
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
  const closed = useContext(ClosedContext);
  useFrame((_, delta) => {
    if (group.current)
      group.current.position.y = MathUtils.damp(
        group.current.position.y,
        position[1] + (selected && !closed ? 1.05 : 0),
        7,
        delta,
      );
  });
  return (
    <group
      ref={group}
      position={position}
      rotation={id === "passport" ? [0, Math.PI / 2, 0] : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
    >
      <group
        scale={
          id === "sweatshirt" ? [0.65, 0.45, 0.65] : id === "socks" ? 0.5 : 0.65
        }
      >
        {children}
      </group>
    </group>
  );
}

function Scene({
  selected,
  onSelect,
  closed,
}: {
  selected: ItemId | null;
  onSelect: (id: ItemId) => void;
  closed: boolean;
}) {
  useFrame(({ camera, size }) => {
    const orthographic = camera as OrthographicCamera;
    const zoom = Math.min(size.width / 7.3, size.height / 7.2, 55);
    camera.lookAt(0, 0.25, 0.35);
    if (orthographic.zoom !== zoom) {
      orthographic.zoom = zoom;
      orthographic.updateProjectionMatrix();
    }
  });
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight args={["#fff9e9", "#a3af9c", 1]} />
      <directionalLight position={[-4, 8, 5]} intensity={2.3} castShadow />
      <ClosedContext.Provider value={closed}>
        <group rotation={[0, -0.15, 0]}>
          <Suspense fallback={null}>
            <Backpack closed={closed} />
          </Suspense>
          <Box
            size={[2, 0.04, 3.1]}
            position={[0, -0.4, 0]}
            color="#a7a397"
            radius={0.018}
          />
          <PackedItem
            id="sweatshirt"
            selected={selected === "sweatshirt"}
            position={[-0.45, -0.326, 0.9]}
            onSelect={onSelect}
          >
            <Sweatshirt />
          </PackedItem>
          <PackedItem
            id="toiletries"
            selected={selected === "toiletries"}
            position={[0.54, -0.276, 0.9]}
            onSelect={onSelect}
          >
            <Toiletries />
          </PackedItem>
          <PackedItem
            id="passport"
            selected={selected === "passport"}
            position={[-0.54, -0.341, -1.05]}
            onSelect={onSelect}
          >
            <Passport />
          </PackedItem>
          <PackedItem
            id="bottle"
            selected={selected === "bottle"}
            position={[0.61, -0.23, -1.03]}
            onSelect={onSelect}
          >
            <Bottle />
          </PackedItem>
          <PackedItem
            id="socks"
            selected={selected === "socks"}
            position={[-0.71, -0.335, -0.15]}
            onSelect={onSelect}
          >
            <Socks />
          </PackedItem>
          <PackedItem
            id="sunglasses"
            selected={selected === "sunglasses"}
            position={[-0.04, -0.357, -0.15]}
            onSelect={onSelect}
          >
            <Sunglasses />
          </PackedItem>
          <PackedItem
            id="earbuds"
            selected={selected === "earbuds"}
            position={[0.68, -0.3215, -0.15]}
            onSelect={onSelect}
          >
            <Earbuds />
          </PackedItem>
        </group>
      </ClosedContext.Provider>
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
  const [hovered, setHovered] = useState<ItemId | null>(null);
  const [pinned, setPinned] = useState<ItemId | null>(null);
  const [closed, setClosed] = useState(false);
  const selected = hovered ?? pinned;
  return (
    <div className="backpack-diagram">
      <div className="backpack-diagram-heading">
        <span>01 / THE OBJECTS</span>
        <span>02 / THE PACKING PLAN</span>
      </div>
      <div className="backpack-diagram-body">
        <div
          className={hovered ? "backpack-items is-paused" : "backpack-items"}
          aria-label="Choose an item to see it in the backpack"
        >
          <div className="backpack-wheel">
            {items.map((item, index) => (
              <div
                className="backpack-slot"
                key={item.id}
                style={
                  {
                    "--angle": `${(index * 360) / items.length}deg`,
                  } as CSSProperties
                }
              >
                <div className="backpack-upright">
                  <div className="backpack-counter">
                    <button
                      type="button"
                      className={
                        selected === item.id
                          ? "backpack-item is-selected"
                          : "backpack-item"
                      }
                      aria-label={item.label}
                      aria-pressed={pinned === item.id}
                      onMouseEnter={() => {
                        setHovered(item.id);
                        setClosed(false);
                      }}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => {
                        setHovered(item.id);
                        setClosed(false);
                      }}
                      onBlur={() => setHovered(null)}
                      onClick={() =>
                        setPinned((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                    >
                      <Image
                        src={`/travel-essentials/${item.image}`}
                        width={240}
                        height={240}
                        alt=""
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className="backpack-scene"
          role="img"
          aria-label="A 3D carry-on backpack containing seven travel essentials"
        >
          <SceneBoundary>
            <Canvas
              shadows
              orthographic
              camera={{ position: [6, 8, 9], zoom: 45, near: 0.1, far: 100 }}
              gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
              fallback={
                <div className="backpack-fallback">
                  Your essentials, ready to pack.
                </div>
              }
            >
              <Scene
                selected={selected}
                closed={closed}
                onSelect={(id) => {
                  setPinned(id);
                  setClosed(false);
                }}
              />
            </Canvas>
          </SceneBoundary>
        </div>
      </div>
      <div className="backpack-action">
        <button
          type="button"
          onClick={() => {
            setHovered(null);
            setPinned(null);
            setClosed((value) => !value);
          }}
        >
          {closed ? "Open backpack" : "Close backpack"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}
