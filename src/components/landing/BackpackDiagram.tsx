"use client";

import {
  Component,
  type ReactNode,
  type CSSProperties,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  CatmullRomCurve3,
  MathUtils,
  Path,
  Shape,
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
  const { shell, lining, straps } = useMemo(() => {
    const outline = () => {
      const shape = new Shape();
      shape.moveTo(-1.65, -1.85);
      shape.quadraticCurveTo(-1.65, -2.4, -1.1, -2.4);
      shape.lineTo(1.1, -2.4);
      shape.quadraticCurveTo(1.65, -2.4, 1.65, -1.85);
      shape.lineTo(1.65, 1.35);
      shape.quadraticCurveTo(1.65, 2.4, 0.65, 2.4);
      shape.lineTo(-0.65, 2.4);
      shape.quadraticCurveTo(-1.65, 2.4, -1.65, 1.35);
      shape.closePath();
      return shape;
    };
    const shell = outline();
    const hole = new Path();
    hole.moveTo(-1.36, -1.72);
    hole.lineTo(-1.36, 1.3);
    hole.quadraticCurveTo(-1.36, 2.1, -0.58, 2.1);
    hole.lineTo(0.58, 2.1);
    hole.quadraticCurveTo(1.36, 2.1, 1.36, 1.3);
    hole.lineTo(1.36, -1.72);
    hole.quadraticCurveTo(1.36, -2.1, 0.98, -2.1);
    hole.lineTo(-0.98, -2.1);
    hole.quadraticCurveTo(-1.36, -2.1, -1.36, -1.72);
    shell.holes.push(hole);
    const straps = [-1, 1].map(
      (side) =>
        new CatmullRomCurve3([
          new Vector3(side * 0.55, -0.25, 1.5),
          new Vector3(side * 0.75, -0.38, 2.25),
          new Vector3(side * 0.8, -0.38, 3.02),
          new Vector3(side * 1.1, -0.36, 3.15),
          new Vector3(side * 1.3, -0.34, 2.8),
          new Vector3(side * 1.25, -0.25, 1.6),
        ]),
    );
    return { shell, lining: outline(), straps };
  }, []);
  return (
    <group>
      {straps.map((strap, index) => (
        <mesh key={index} castShadow>
          <tubeGeometry args={[strap, 40, 0.16, 12, false]} />
          <meshStandardMaterial color="#44594d" roughness={1} />
        </mesh>
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.32, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry
          args={[
            lining,
            {
              depth: 0.22,
              bevelEnabled: true,
              bevelSize: 0.1,
              bevelThickness: 0.08,
              bevelSegments: 4,
            },
          ]}
        />
        <meshStandardMaterial color="#52675a" roughness={1} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        receiveShadow
      >
        <shapeGeometry args={[lining]} />
        <meshStandardMaterial color="#c0c4b1" roughness={1} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry
          args={[
            shell,
            {
              depth: 0.7,
              bevelEnabled: true,
              bevelSize: 0.12,
              bevelThickness: 0.08,
              bevelSegments: 4,
              curveSegments: 16,
            },
          ]}
        />
        <meshStandardMaterial color="#667d6d" roughness={0.95} />
      </mesh>
      {/* The unzipped front panel opens behind the main compartment. */}
      <group position={[0, 0.69, -2.18]} rotation={[0.82, 0, 0]}>
        <group position={[0, 0, -2.35]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <extrudeGeometry
              args={[
                lining,
                {
                  depth: 0.22,
                  bevelEnabled: true,
                  bevelSize: 0.12,
                  bevelThickness: 0.08,
                  bevelSegments: 5,
                  curveSegments: 20,
                },
              ]}
            />
            <meshStandardMaterial color="#52685a" roughness={1} />
          </mesh>
          <RoundedBox
            args={[2.52, 1.55, 0.16]}
            radius={0.24}
            smoothness={6}
            position={[0, -0.85, 0.28]}
            castShadow
          >
            <meshStandardMaterial color="#425b4d" roughness={1} />
          </RoundedBox>
          <RoundedBox
            args={[2.14, 0.035, 0.04]}
            radius={0.01}
            position={[0, -0.25, 0.38]}
          >
            <meshStandardMaterial color="#c3c1ad" roughness={0.6} />
          </RoundedBox>
          <RoundedBox
            args={[0.09, 0.22, 0.05]}
            radius={0.02}
            position={[0.74, -0.34, 0.4]}
          >
            <meshStandardMaterial
              color="#d4cab7"
              metalness={0.2}
              roughness={0.5}
            />
          </RoundedBox>
          <RoundedBox
            args={[0.75, 0.3, 0.035]}
            radius={0.04}
            position={[0, 1.1, 0.25]}
          >
            <meshStandardMaterial color="#354c3f" roughness={1} />
          </RoundedBox>
          {[-0.82, 0.82].map((side) => (
            <RoundedBox
              key={side}
              args={[0.08, 0.92, 0.04]}
              radius={0.02}
              position={[side, 0.75, 0.24]}
            >
              <meshStandardMaterial color="#6e8274" roughness={1} />
            </RoundedBox>
          ))}
        </group>
      </group>
      {/* A front pocket, zipper and handle give the open bag its backpack silhouette. */}
      <Box
        size={[2.1, 0.48, 0.18]}
        position={[0, 0.1, 2.43]}
        color="#526a5b"
        radius={0.09}
      />
      <Box
        size={[1.85, 0.035, 0.035]}
        position={[0, 0.32, 2.54]}
        color="#b3baa4"
        radius={0.01}
      />
      <Box
        size={[0.12, 0.16, 0.06]}
        position={[0.72, 0.24, 2.57]}
        color="#ded9c8"
        radius={0.02}
      />
      <Box
        size={[0.85, 0.12, 0.18]}
        position={[0, 0.08, -2.63]}
        color="#3f5548"
        radius={0.05}
      />
      <Box
        size={[0.12, 0.12, 0.3]}
        position={[-0.4, 0.08, -2.5]}
        color="#3f5548"
        radius={0.04}
      />
      <Box
        size={[0.12, 0.12, 0.3]}
        position={[0.4, 0.08, -2.5]}
        color="#3f5548"
        radius={0.04}
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
  useFrame((_, delta) => {
    if (group.current)
      group.current.position.y = MathUtils.damp(
        group.current.position.y,
        position[1] + (selected ? 1.05 : 0),
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
    </group>
  );
}

function Scene({
  selected,
  onSelect,
}: {
  selected: ItemId | null;
  onSelect: (id: ItemId) => void;
}) {
  useFrame(({ camera, size }) => {
    const orthographic = camera as OrthographicCamera;
    const zoom = Math.min(size.width / 8.2, size.height / 8.5, 55);
    camera.lookAt(0, 0.8, -0.65);
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
        <PackedItem
          id="socks"
          selected={selected === "socks"}
          position={[-0.7, 0.68, 1.2]}
          onSelect={onSelect}
        >
          <Socks />
        </PackedItem>
        <PackedItem
          id="sunglasses"
          selected={selected === "sunglasses"}
          position={[0.9, 0.67, 1.0]}
          onSelect={onSelect}
        >
          <Sunglasses />
        </PackedItem>
        <PackedItem
          id="earbuds"
          selected={selected === "earbuds"}
          position={[-0.6, 0.33, -1.1]}
          onSelect={onSelect}
        >
          <Earbuds />
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
  const [hovered, setHovered] = useState<ItemId | null>(null);
  const [pinned, setPinned] = useState<ItemId | null>(null);
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
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(item.id)}
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
              gl={{ antialias: true, alpha: true }}
              fallback={
                <div className="backpack-fallback">
                  Your essentials, ready to pack.
                </div>
              }
            >
              <Scene selected={selected} onSelect={setPinned} />
            </Canvas>
          </SceneBoundary>
        </div>
      </div>
    </div>
  );
}
