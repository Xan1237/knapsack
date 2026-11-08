"use client";

import {
  Component,
  createContext,
  useContext,
  Suspense,
  type ReactNode,
  type CSSProperties,
  type RefObject,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import {
  CatmullRomCurve3,
  DataTexture,
  MathUtils,
  Mesh,
  RepeatWrapping,
  SRGBColorSpace,
  Plane,
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

const ClosedContext = createContext(false);
type ConnectorRefs = {
  container: RefObject<HTMLDivElement | null>;
  line: RefObject<SVGPathElement | null>;
  glow: RefObject<SVGPathElement | null>;
  dot: RefObject<SVGCircleElement | null>;
};
const ConnectorContext = createContext<ConnectorRefs | null>(null);

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
  const zipper = useRef<Group>(null);
  const openHandle = useRef<Group>(null);
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
                : new Plane(new Vector3(0, -1, 0), -0.021),
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
    const accessories = copyPart("Zips, handle and pulls");
    const handle = accessories.children[1]?.clone(true) ?? null;
    const handleOnly = handle?.clone(true) ?? null;
    handleOnly?.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const geometry = object.geometry.clone();
      const positions = geometry.getAttribute("position");
      const index = geometry.getIndex();
      const count = index ? index.count : positions.count;
      const triangles: number[] = [];
      for (let i = 0; i + 2 < count; i += 3) {
        const a = index ? index.getX(i) : i;
        const b = index ? index.getX(i + 1) : i + 1;
        const c = index ? index.getX(i + 2) : i + 2;
        if (
          Math.min(positions.getY(a), positions.getY(b), positions.getY(c)) >=
          0.38
        )
          triangles.push(a, b, c);
      }
      geometry.setIndex(triangles);
      object.geometry = geometry;
    });
    return {
      straps: copyPart("Back panel and shoulder straps"),
      body: copyPart("Backpack body", "lower"),
      cover: copyPart("Backpack body", "upper"),
      pocket: copyPart("Front zip pocket"),
      zipper: accessories.children[0]?.clone(true) ?? accessories,
      handle,
      handleOnly,
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
    if (zipper.current) zipper.current.visible = progress.current > 0.98;
    if (openHandle.current)
      openHandle.current.visible = progress.current <= 0.98;
    hinge.current.rotation.x = 2.35 * open;
    cover.current.updateWorldMatrix(true, false);
    parts.worldCoverPlane
      .copy(parts.coverPlane)
      .applyMatrix4(cover.current.matrixWorld);
  });
  return (
    <group
      position={[0, -0.35, 1.54]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={7}
    >
      <primitive object={parts.straps} />
      <primitive object={parts.body} />
      <group ref={openHandle}>
        {parts.handleOnly && <primitive object={parts.handleOnly} />}
      </group>
      <group ref={zipper} visible={false}>
        <primitive object={parts.zipper} />
        {parts.handle && <primitive object={parts.handle} />}
      </group>
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
  const folds = useMemo(() => {
    const base = new Shape();
    base.moveTo(-0.79, -0.56);
    base.quadraticCurveTo(-0.86, -0.78, -0.58, -0.78);
    base.lineTo(0.58, -0.77);
    base.quadraticCurveTo(0.83, -0.75, 0.83, -0.51);
    base.lineTo(0.78, 0.53);
    base.quadraticCurveTo(0.75, 0.78, 0.52, 0.75);
    base.lineTo(-0.6, 0.66);
    base.quadraticCurveTo(-0.82, 0.64, -0.8, 0.42);
    base.closePath();

    const top = new Shape();
    top.moveTo(-0.77, -0.5);
    top.quadraticCurveTo(-0.7, -0.71, -0.46, -0.68);
    top.quadraticCurveTo(0.15, -0.64, 0.67, -0.66);
    top.quadraticCurveTo(0.79, -0.65, 0.74, -0.45);
    top.lineTo(0.68, 0.59);
    top.quadraticCurveTo(0.65, 0.71, 0.5, 0.67);
    top.quadraticCurveTo(-0.01, 0.52, -0.57, 0.52);
    top.quadraticCurveTo(-0.77, 0.5, -0.77, 0.3);
    top.closePath();

    const drape = new Shape();
    drape.moveTo(-0.72, -0.45);
    drape.quadraticCurveTo(-0.53, -0.56, -0.25, -0.48);
    drape.quadraticCurveTo(0.18, -0.24, 0.64, 0.48);
    drape.quadraticCurveTo(0.73, 0.6, 0.56, 0.58);
    drape.quadraticCurveTo(0.04, 0.42, -0.55, 0.42);
    drape.quadraticCurveTo(-0.76, 0.42, -0.72, 0.2);
    drape.closePath();
    const crease = new CatmullRomCurve3([
      new Vector3(-0.58, 0.169, 0.42),
      new Vector3(-0.25, 0.174, 0.28),
      new Vector3(0.1, 0.174, 0.02),
      new Vector3(0.46, 0.165, -0.36),
    ]);
    const edge = new CatmullRomCurve3([
      new Vector3(-0.58, 0.075, 0.69),
      new Vector3(-0.05, 0.085, 0.7),
      new Vector3(0.48, 0.075, 0.69),
      new Vector3(0.69, 0.065, 0.58),
    ]);
    return { base, top, drape, crease, edge };
  }, []);
  return (
    <group>
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry
          args={[
            folds.base,
            {
              depth: 0.15,
              bevelEnabled: true,
              bevelSize: 0.045,
              bevelThickness: 0.02,
              bevelSegments: 4,
              curveSegments: 16,
            },
          ]}
        />
        <meshStandardMaterial color="#565150" map={fabric} roughness={1} />
      </mesh>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <extrudeGeometry
          args={[
            folds.top,
            {
              depth: 0.045,
              bevelEnabled: true,
              bevelSize: 0.025,
              bevelThickness: 0.012,
              bevelSegments: 3,
              curveSegments: 16,
            },
          ]}
        />
        <meshStandardMaterial color="#68615e" map={fabric} roughness={1} />
      </mesh>
      <mesh position={[0, 0.133, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <extrudeGeometry
          args={[
            folds.drape,
            {
              depth: 0.025,
              bevelEnabled: true,
              bevelSize: 0.018,
              bevelThickness: 0.008,
              bevelSegments: 3,
              curveSegments: 16,
            },
          ]}
        />
        <meshStandardMaterial color="#5c5654" map={fabric} roughness={1} />
      </mesh>
      <mesh>
        <tubeGeometry args={[folds.crease, 32, 0.012, 8, false]} />
        <meshStandardMaterial color="#77706d" roughness={1} />
      </mesh>
      <mesh>
        <tubeGeometry args={[folds.edge, 32, 0.014, 8, false]} />
        <meshStandardMaterial color="#6c6662" roughness={1} />
      </mesh>
    </group>
  );
}

function Toiletries() {
  return (
    <group>
      <Box size={[1.15, 0.26, 1.32]} color="#344558" radius={0.12} />
      <Box
        size={[0.98, 0.06, 1.12]}
        position={[0, 0.15, 0]}
        color="#51647a"
        radius={0.11}
      />
      <Box
        size={[0.92, 0.035, 0.035]}
        position={[0, 0.19, -0.49]}
        color="#b8ad8e"
        radius={0.01}
      />
      <Box
        size={[0.2, 0.1, 0.2]}
        position={[-0.25, 0.2, 0.2]}
        color="#e0d9c7"
        radius={0.04}
      />
      <Box
        size={[0.22, 0.1, 0.26]}
        position={[0.1, 0.2, 0.2]}
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

function PackingFillers() {
  return (
    <group>
      {/* Layers support the visible items; the narrow pieces fill the gaps. */}
      <Box
        size={[0.84, 0.1, 0.65]}
        position={[-0.43, -0.33, 0.15]}
        color="#c5b7a0"
        radius={0.045}
      />
      <Box
        size={[0.75, 0.08, 0.86]}
        position={[0.45, -0.34, 0.15]}
        color="#b9a996"
        radius={0.035}
      />
      <Box
        size={[1.03, 0.05, 0.31]}
        position={[-0.36, -0.355, 1.0]}
        color="#beb39d"
        radius={0.022}
      />
      <Box
        size={[1.65, 0.15, 0.2]}
        position={[0, -0.305, 0.71]}
        color="#9b6a54"
        radius={0.055}
      />
      <Box
        size={[1.45, 0.09, 0.14]}
        position={[0, -0.185, 0.71]}
        color="#d3c5ac"
        radius={0.035}
      />
      <mesh
        position={[0, -0.305, 1.26]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.075, 0.075, 1.55, 28]} />
        <meshStandardMaterial color="#b49d80" roughness={1} />
      </mesh>
      <Box
        size={[0.54, 0.09, 0.11]}
        position={[0.58, -0.335, -0.36]}
        color="#c2ad99"
        radius={0.035}
      />
      <Box
        size={[0.48, 0.08, 0.08]}
        position={[0.58, -0.34, -0.84]}
        color="#d7cbb8"
        radius={0.03}
      />
    </group>
  );
}

function PackedItem({
  id,
  selected,
  position,
  children,
}: {
  id: ItemId;
  selected: boolean;
  position: [number, number, number];
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const closed = useContext(ClosedContext);
  const connector = useContext(ConnectorContext);
  const projected = useMemo(() => new Vector3(), []);
  useFrame(({ camera, gl }, delta) => {
    if (!group.current) return;
    group.current.position.y = MathUtils.damp(
      group.current.position.y,
      position[1] + (selected && !closed ? 1.05 : 0),
      7,
      delta,
    );
    if (!selected || closed || !connector?.container.current) return;
    const photo = connector.container.current.querySelector<HTMLButtonElement>(
      `[data-item="${id}"]`,
    );
    if (!photo) return;
    const area = connector.container.current.getBoundingClientRect();
    const photoBounds = photo.getBoundingClientRect();
    const canvasBounds = gl.domElement.getBoundingClientRect();
    group.current.getWorldPosition(projected).project(camera);
    const endX =
      canvasBounds.left -
      area.left +
      ((projected.x + 1) * canvasBounds.width) / 2;
    const endY =
      canvasBounds.top -
      area.top +
      ((1 - projected.y) * canvasBounds.height) / 2;
    const photoX = photoBounds.left - area.left + photoBounds.width / 2;
    const photoY = photoBounds.top - area.top + photoBounds.height / 2;
    const dx = endX - photoX;
    const dy = endY - photoY;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const offset = Math.min(photoBounds.width, photoBounds.height) * 0.27;
    const startX = photoX + (dx / distance) * offset;
    const startY = photoY + (dy / distance) * offset;
    const bend = Math.max(25, Math.abs(endX - startX) * 0.42);
    const path = `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`;
    connector.line.current?.setAttribute("d", path);
    connector.glow.current?.setAttribute("d", path);
    connector.dot.current?.setAttribute("cx", String(endX));
    connector.dot.current?.setAttribute("cy", String(endY));
  });
  return (
    <group
      ref={group}
      position={position}
      rotation={
        id === "passport" || id === "bottle" ? [0, Math.PI / 2, 0] : undefined
      }
    >
      <group
        scale={
          id === "sweatshirt"
            ? [0.65, 0.45, 0.65]
            : id === "socks"
              ? 0.55
              : id === "earbuds"
                ? 0.8
                : 0.65
        }
      >
        {children}
      </group>
    </group>
  );
}

function Scene({
  selected,
  closed,
  connector,
}: {
  selected: ItemId | null;
  closed: boolean;
  connector: ConnectorRefs;
}) {
  useFrame(({ camera, size }) => {
    const orthographic = camera as OrthographicCamera;
    const zoom = Math.min(size.width / 5.2, size.height / 5.8, 72);
    camera.lookAt(0, -0.1, 0.2);
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
        <ConnectorContext.Provider value={connector}>
          <group rotation={[0, -0.15, 0]}>
            <Suspense fallback={null}>
              <Backpack closed={closed} />
            </Suspense>
            <Box
              size={[1.75, 0.04, 2.7]}
              position={[0, -0.4, 0]}
              color="#8b8b7e"
              radius={0.018}
            />
            <PackingFillers />
            <PackedItem
              id="sweatshirt"
              selected={selected === "sweatshirt"}
              position={[-0.3, -0.326, -0.8]}
            >
              <Sweatshirt />
            </PackedItem>
            <PackedItem
              id="toiletries"
              selected={selected === "toiletries"}
              position={[0.45, -0.2155, 0.15]}
            >
              <Toiletries />
            </PackedItem>
            <PackedItem
              id="passport"
              selected={selected === "passport"}
              position={[-0.43, -0.239, 0.15]}
            >
              <Passport />
            </PackedItem>
            <PackedItem
              id="bottle"
              selected={selected === "bottle"}
              position={[-0.36, -0.18, 1.0]}
            >
              <Bottle />
            </PackedItem>
            <PackedItem
              id="socks"
              selected={selected === "socks"}
              position={[0.58, -0.3305, -1.08]}
            >
              <Socks />
            </PackedItem>
            <PackedItem
              id="sunglasses"
              selected={selected === "sunglasses"}
              position={[0.48, -0.357, 1.0]}
            >
              <Sunglasses />
            </PackedItem>
            <PackedItem
              id="earbuds"
              selected={selected === "earbuds"}
              position={[0.58, -0.308, -0.65]}
            >
              <Earbuds />
            </PackedItem>
          </group>
        </ConnectorContext.Provider>
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
  const diagramBody = useRef<HTMLDivElement>(null);
  const connectorLine = useRef<SVGPathElement>(null);
  const connectorGlow = useRef<SVGPathElement>(null);
  const connectorDot = useRef<SVGCircleElement>(null);
  const connector = useMemo(
    () => ({
      container: diagramBody,
      line: connectorLine,
      glow: connectorGlow,
      dot: connectorDot,
    }),
    [],
  );
  const selected = hovered ?? pinned;
  const toggleBackpack = () => {
    setHovered(null);
    setPinned(null);
    setClosed((value) => !value);
  };
  return (
    <div className="backpack-diagram">
      <div className="backpack-diagram-heading">
        <span>01 / THE OBJECTS</span>
        <span>02 / THE PACKING PLAN</span>
      </div>
      <div className="backpack-diagram-body" ref={diagramBody}>
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
                      data-item={item.id}
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
          role="button"
          tabIndex={0}
          aria-label={closed ? "Open backpack" : "Close backpack"}
          onClick={toggleBackpack}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleBackpack();
            }
          }}
        >
          <SceneBoundary>
            <Canvas
              shadows
              orthographic
              camera={{ position: [4, 13, 9], zoom: 55, near: 0.1, far: 100 }}
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
                connector={connector}
              />
            </Canvas>
          </SceneBoundary>
        </div>
        <svg
          className="backpack-connector"
          data-visible={Boolean(selected) && !closed}
          aria-hidden="true"
        >
          <path ref={connectorGlow} className="backpack-connector-glow" />
          <path ref={connectorLine} className="backpack-connector-line" />
          <circle ref={connectorDot} className="backpack-connector-dot" r="3" />
        </svg>
      </div>
    </div>
  );
}
