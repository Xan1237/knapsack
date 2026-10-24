"use client";

import {
  Component,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
  useRef,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { Group, MathUtils, Vector3, type Mesh } from "three";
import ClamshellCase from "@/components/packing/ClamshellCase";
import type { Suitcase as SuitcaseDefinition } from "@/lib/domain";
import { landingReadyToClose } from "@/lib/landing-timeline";

type V3 = [number, number, number];
type SceneProps = {
  progress: RefObject<number>;
  reducedMotion: RefObject<boolean>;
};
const landingBag: SuitcaseDefinition = {
  id: "landing",
  name: "The weekender",
  subtitle: "Two sides. Everything in its place.",
  dimensions: [560, 385, 200],
  clearance: 3,
  clamshell: true,
  color: "#798773",
};
const ease = (n: number) => {
  const x = MathUtils.clamp(n, 0, 1);
  return x * x * (3 - 2 * x);
};

function Box({
  size,
  at = [0, 0, 0],
  color,
  radius = 0.08,
  roughness = 0.8,
  ...props
}: {
  size: V3;
  at?: V3;
  color: string;
  radius?: number;
  roughness?: number;
  rotation?: V3;
}) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, ...size.map((n) => n / 2 - 0.001))}
      smoothness={4}
      position={at}
      castShadow
      receiveShadow
      {...props}
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </RoundedBox>
  );
}

function Shirt({ color, knit = false }: { color: string; knit?: boolean }) {
  return (
    <group>
      <Box size={[1.7, 0.32, 1.55]} color={color} radius={0.13} />
      <Box
        size={[1.63, 0.1, 1.48]}
        at={[0, 0.16, -0.01]}
        color={color}
        radius={0.04}
      />
      <Box
        size={[0.55, 0.07, 0.38]}
        at={[0, 0.23, -0.5]}
        color={knit ? "#c7bda8" : "#899778"}
        radius={0.07}
      />
      <Box
        size={[0.34, 0.075, 0.24]}
        at={[0, 0.25, -0.56]}
        color={knit ? "#e8e0cc" : "#b9c4a3"}
        radius={0.05}
      />
      <Box
        size={[0.055, 0.012, 1.05]}
        at={[0, 0.218, 0.21]}
        color={knit ? "#cbc1ac" : "#98a787"}
        radius={0.003}
      />
      {[0, 0.3, 0.6].map((z) => (
        <mesh
          key={z}
          position={[0.02, 0.233, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.024, 0.024, 0.015, 12]} />
          <meshStandardMaterial color="#e8e0ce" />
        </mesh>
      ))}
      {knit &&
        Array.from({ length: 19 }, (_, i) => (
          <Box
            key={i}
            size={[0.012, 0.008, 1.21]}
            at={[-0.75 + i * 0.083, 0.215, 0.06]}
            color="#d0c6b2"
            radius={0.002}
          />
        ))}
    </group>
  );
}

function Sneaker({ flip = false }: { flip?: boolean }) {
  return (
    <group rotation={[0, flip ? Math.PI : 0, 0]}>
      <Box
        size={[0.65, 0.16, 1.75]}
        at={[0, -0.1, 0]}
        color="#e2ddc9"
        radius={0.14}
      />
      <Box
        size={[0.63, 0.13, 1.7]}
        at={[0, -0.005, 0]}
        color="#f6f2e4"
        radius={0.14}
      />
      <Box
        size={[0.56, 0.35, 1.38]}
        at={[0, 0.19, -0.1]}
        color="#f0ebdb"
        radius={0.18}
      />
      <Box
        size={[0.55, 0.3, 0.7]}
        at={[0, 0.34, 0.35]}
        color="#e5dfcf"
        radius={0.13}
      />
      <Box
        size={[0.34, 0.06, 0.39]}
        at={[0, 0.51, 0.42]}
        color="#777d68"
        radius={0.1}
      />
      <Box
        size={[0.25, 0.08, 0.41]}
        at={[0, 0.39, 0.14]}
        color="#f8f4e7"
        radius={0.04}
        rotation={[-0.3, 0, 0]}
      />
      {[-0.35, -0.18, -0.01, 0.16].map((z, i) => (
        <Box
          key={z}
          size={[0.36, 0.035, 0.035]}
          at={[0, 0.375 + i * 0.027, z]}
          color="#fffcef"
          radius={0.012}
          rotation={[0, i % 2 ? 0.13 : -0.13, 0]}
        />
      ))}
      <Box
        size={[0.018, 0.13, 0.52]}
        at={[0.283, 0.22, -0.05]}
        color="#a4ab91"
        radius={0.008}
        rotation={[0.2, 0, 0]}
      />
      <Box
        size={[0.18, 0.15, 0.03]}
        at={[0, 0.37, 0.694]}
        color="#a4ab91"
        radius={0.015}
      />
    </group>
  );
}

function Pouch() {
  return (
    <group>
      <Box size={[1.37, 0.62, 0.9]} color="#be7354" radius={0.17} />
      <Box
        size={[1.18, 0.024, 0.045]}
        at={[0, 0.32, 0]}
        color="#e6c69c"
        radius={0.008}
      />
      <Box
        size={[0.11, 0.045, 0.18]}
        at={[0.42, 0.34, 0.06]}
        color="#bda879"
        radius={0.015}
      />
      <Box
        size={[0.37, 0.2, 0.015]}
        at={[0, 0.02, 0.456]}
        color="#cf9675"
        radius={0.02}
      />
      <Box
        size={[0.23, 0.025, 0.018]}
        at={[0, 0.04, 0.47]}
        color="#eed9ba"
        radius={0.005}
      />
    </group>
  );
}

function Bottle() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.85, 40]} />
        <meshStandardMaterial color="#d0aa66" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.49, 0]} castShadow>
        <cylinderGeometry args={[0.145, 0.145, 0.2, 32]} />
        <meshStandardMaterial color="#f0e7cf" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.204, 0.204, 0.38, 40]} />
        <meshStandardMaterial color="#eee4cb" />
      </mesh>
    </group>
  );
}

function Book() {
  return (
    <group>
      <Box size={[1.11, 0.21, 1.52]} color="#a7b4c4" radius={0.025} />
      <Box
        size={[1.05, 0.15, 1.45]}
        at={[0.035, 0, 0]}
        color="#f2eddd"
        radius={0.012}
      />
      <Box
        size={[1.12, 0.03, 1.53]}
        at={[0, 0.12, 0]}
        color="#8e9daf"
        radius={0.012}
      />
      <Box
        size={[0.69, 0.006, 0.028]}
        at={[0.08, 0.14, -0.31]}
        color="#e9e8df"
        radius={0.002}
      />
      <Box
        size={[0.47, 0.006, 0.028]}
        at={[0.08, 0.14, -0.2]}
        color="#e9e8df"
        radius={0.002}
      />
      <mesh position={[0.08, 0.145, 0.29]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.23, 40]} />
        <meshStandardMaterial color="#cfb58c" />
      </mesh>
    </group>
  );
}

function Sunglasses() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {[-0.29, 0.29].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.23, 0.035, 8, 32]} />
            <meshStandardMaterial color="#65523b" />
          </mesh>
          <mesh>
            <circleGeometry args={[0.21, 32]} />
            <meshStandardMaterial
              color="#5d6558"
              metalness={0.3}
              roughness={0.25}
            />
          </mesh>
        </group>
      ))}
      <Box
        size={[0.17, 0.035, 0.035]}
        at={[0, 0.04, 0]}
        color="#65523b"
        radius={0.01}
      />
      {[-0.53, 0.53].map((x) => (
        <Box
          key={x}
          size={[0.025, 0.61, 0.035]}
          at={[x, -0.25, -0.04]}
          color="#65523b"
          radius={0.008}
        />
      ))}
    </group>
  );
}

function PackingItem({
  start,
  end,
  rotation = [0, 0, 0],
  index,
  progress,
  reducedMotion,
  children,
}: SceneProps & {
  start: V3;
  end: V3;
  rotation?: V3;
  index: number;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const value = useRef(0);
  useFrame((state, delta) => {
    if (!group.current) return;
    const target = ease((progress.current - 0.07 - index * 0.074) / 0.2);
    value.current = reducedMotion.current
      ? target
      : MathUtils.damp(value.current, target, 7, delta);
    const t = value.current;
    const bob = reducedMotion.current
      ? 0
      : Math.sin(state.clock.elapsedTime * 0.8 + index * 1.3) * 0.07 * (1 - t);
    group.current.position.set(
      MathUtils.lerp(start[0], end[0], t),
      MathUtils.lerp(start[1], end[1], t) + bob,
      MathUtils.lerp(start[2], end[2], t),
    );
    group.current.rotation.set(
      MathUtils.lerp(rotation[0], 0, t),
      MathUtils.lerp(rotation[1], 0, t),
      MathUtils.lerp(rotation[2], 0, t),
    );
  });
  return (
    <group ref={group} position={start} rotation={rotation}>
      {children}
    </group>
  );
}

function Suitcase({ progress, reducedMotion }: SceneProps) {
  const closing = useRef(0);
  useFrame(() => {
    closing.current = landingReadyToClose(progress.current) ? 1 : 0;
  });
  const itemProps = { progress, reducedMotion };
  return (
    <group position={[0, -1.0, 0]} scale={0.8} rotation={[0, -0.12, -0.025]}>
      <ClamshellCase
        bag={landingBag}
        closing={closing}
        base={
          <>
            <PackingItem
              start={[-2.14, 2.39, 0.68]}
              end={[-1.62, 0.16, 0.78]}
              rotation={[0.09, -0.25, -0.16]}
              index={0}
              {...itemProps}
            >
              <Shirt color="#aebc98" />
            </PackingItem>
            <PackingItem
              start={[-1.3, 3.16, 1.1]}
              end={[-1.62, 0.61, 0.78]}
              rotation={[0.04, 0.18, -0.12]}
              index={1}
              {...itemProps}
            >
              <Shirt color="#e0d5be" knit />
            </PackingItem>
            <PackingItem
              start={[0.35, 2.7, -0.02]}
              end={[-0.31, 0.2, -0.45]}
              rotation={[0.12, -0.3, -0.2]}
              index={2}
              {...itemProps}
            >
              <Sneaker />
            </PackingItem>
            <PackingItem
              start={[-2.06, 1.85, -1.07]}
              end={[-1.72, 0.09, -1.0]}
              rotation={[0.1, -0.24, 0.1]}
              index={6}
              {...itemProps}
            >
              <Book />
            </PackingItem>
          </>
        }
        lid={
          <>
            <PackingItem
              start={[1.14, 3.19, -0.18]}
              end={[0.4, 0.2, -0.45]}
              rotation={[-0.1, -0.25, 0.16]}
              index={3}
              {...itemProps}
            >
              <Sneaker flip />
            </PackingItem>
            <PackingItem
              start={[2.26, 1.91, 0.96]}
              end={[1.7, 0.32, 0.98]}
              rotation={[0.12, -0.21, 0.12]}
              index={4}
              {...itemProps}
            >
              <Pouch />
            </PackingItem>
            <PackingItem
              start={[2.55, 2.95, -0.9]}
              end={[2.14, 0.22, -0.62]}
              rotation={[0.08, 0.3, -0.18]}
              index={5}
              {...itemProps}
            >
              <Bottle />
            </PackingItem>
            <PackingItem
              start={[0.93, 1.61, 2.13]}
              end={[0.2, 0.15, 1.1]}
              rotation={[0.15, -0.12, -0.24]}
              index={7}
              {...itemProps}
            >
              <Sunglasses />
            </PackingItem>
          </>
        }
      />
    </group>
  );
}

function Scene(props: SceneProps) {
  const light = useRef<Mesh>(null);
  useFrame(({ camera, size }, delta) => {
    const mobile = size.width < 600;
    const destination = new Vector3(
      mobile ? 8.5 : 7.5,
      mobile ? 9.5 : 9,
      mobile ? 12.5 : 11.5,
    );
    camera.position.lerp(destination, 1 - Math.exp(-delta * 3));
    camera.lookAt(0, 0.75, -0.1);
  });
  return (
    <>
      <ambientLight intensity={1.65} />
      <hemisphereLight args={["#fff9e9", "#c2b99e", 1.2]} />
      <directionalLight
        position={[-5, 10, 7]}
        intensity={3.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
        shadow-normalBias={0.025}
      />
      <directionalLight position={[4, 5, -6]} intensity={1.3} color="#f6e8cb" />
      <Suitcase {...props} />
      <ContactShadows
        position={[0, -1.46, 0]}
        opacity={0.25}
        scale={18}
        blur={2.8}
        far={8}
        resolution={512}
        frames={1}
      />
      <mesh
        ref={light}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.47, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.08} />
      </mesh>
    </>
  );
}

function Fallback() {
  return (
    <div
      className="lp-scene-fallback"
      role="img"
      aria-label="A sage green suitcase with neatly fitted travel essentials"
    >
      <div className="lp-flat-lid">
        <span>knapsack</span>
      </div>
      <div className="lp-flat-case">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="lp-fallback-caption">A little room for everything.</span>
    </div>
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
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

export default function PackingScene(props: SceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={container}>
      <SceneBoundary>
        <Canvas
          shadows
          frameloop={visible ? "always" : "never"}
          dpr={[1, 1.6]}
          camera={{ position: [7.5, 9, 11.5], fov: 38, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          fallback={<Fallback />}
          aria-label="Scroll to watch eight travel essentials fit into a three-dimensional suitcase"
        >
          <Scene {...props} />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
