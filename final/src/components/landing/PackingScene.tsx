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
import { Group, MathUtils } from "three";
import { landingItemProgress } from "@/lib/landing-timeline";

type V3 = [number, number, number];
type SceneProps = {
  progress: RefObject<number>;
  reducedMotion: RefObject<boolean>;
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
  useFrame(() => {
    if (!group.current) return;
    const arrival = landingItemProgress(progress.current, index);
    const t = reducedMotion.current ? (arrival === 1 ? 1 : 0) : ease(arrival);
    group.current.visible = t > 0;
    group.current.position.set(
      MathUtils.lerp(start[0], end[0], t),
      MathUtils.lerp(start[1], end[1], t),
      MathUtils.lerp(start[2], end[2], t),
    );
    group.current.rotation.set(
      MathUtils.lerp(rotation[0], 0, t),
      MathUtils.lerp(rotation[1], 0, t),
      MathUtils.lerp(rotation[2], 0, t),
    );
    group.current.scale.setScalar(
      reducedMotion.current ? 1 : MathUtils.lerp(0.82, 1, t),
    );
  });
  return (
    <group ref={group} position={start} rotation={rotation} visible={false}>
      {children}
    </group>
  );
}

function Suitcase({ progress, reducedMotion }: SceneProps) {
  const itemProps = { progress, reducedMotion };
  return (
    <group position={[0, -0.55, 0]} rotation={[0, -0.12, -0.035]}>
      <Box
        size={[5.6, 0.24, 3.85]}
        at={[0, -0.19, 0]}
        color="#798773"
        radius={0.17}
      />
      <Box
        size={[5.28, 0.1, 3.53]}
        at={[0, -0.035, 0]}
        color="#d6d5c2"
        radius={0.12}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            size={[0.18, 0.83, 3.7]}
            at={[side * 2.7, 0.3, 0]}
            color="#798773"
          />
          <Box
            size={[5.48, 0.83, 0.18]}
            at={[0, 0.3, side * 1.82]}
            color="#798773"
          />
          <Box
            size={[0.04, 0.055, 3.7]}
            at={[side * 2.7, 0.74, 0]}
            color="#465640"
            radius={0.015}
          />
          <Box
            size={[5.44, 0.055, 0.04]}
            at={[0, 0.74, side * 1.82]}
            color="#465640"
            radius={0.015}
          />
          <Box
            size={[0.04, 0.65, 3.4]}
            at={[side * 2.58, 0.34, 0]}
            color="#b3b9a2"
            radius={0.015}
          />
          <Box
            size={[5.12, 0.65, 0.04]}
            at={[0, 0.34, side * 1.7]}
            color="#b3b9a2"
            radius={0.015}
          />
          {[-1, 1].map((end) => (
            <mesh
              key={end}
              position={[side * 2.35, -0.39, end * 1.52]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.18, 0.2, 24]} />
              <meshStandardMaterial color="#394237" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: 13 }, (_, index) => (
        <Box
          key={index}
          size={[0.025, 0.57, 0.025]}
          at={[-2.32 + index * 0.387, 0.3, 1.923]}
          color="#65735f"
          radius={0.008}
        />
      ))}
      <Box
        size={[1.04, 0.16, 0.16]}
        at={[0, 0.31, 2.12]}
        color="#465640"
        radius={0.06}
      />
      {[-0.46, 0.46].map((x) => (
        <Box
          key={x}
          size={[0.12, 0.16, 0.24]}
          at={[x, 0.31, 2.02]}
          color="#465640"
          radius={0.04}
        />
      ))}
      <PackingItem
        start={[-1.61, 2.8, -0.84]}
        end={[-1.61, 0.26, -0.84]}
        rotation={[0.08, -0.12, -0.08]}
        index={0}
        {...itemProps}
      >
        <group scale={[1.08, 1.45, 1.02]}>
          <Shirt color="#aebc98" />
        </group>
      </PackingItem>
      <PackingItem
        start={[-1.61, 2.8, 0.84]}
        end={[-1.61, 0.26, 0.84]}
        rotation={[-0.06, 0.12, 0.08]}
        index={1}
        {...itemProps}
      >
        <group scale={[1.08, 1.45, 1.02]}>
          <Shirt color="#e0d5be" knit />
        </group>
      </PackingItem>
      <PackingItem
        start={[-0.25, 2.8, -0.61]}
        end={[-0.25, 0.23, -0.61]}
        rotation={[0.12, -0.15, -0.08]}
        index={2}
        {...itemProps}
      >
        <group scale={[1, 1, 1.2]}>
          <Sneaker />
        </group>
      </PackingItem>
      <PackingItem
        start={[0.49, 2.8, -0.61]}
        end={[0.49, 0.23, -0.61]}
        rotation={[-0.1, 0.15, 0.08]}
        index={3}
        {...itemProps}
      >
        <group scale={[1, 1, 1.2]}>
          <Sneaker flip />
        </group>
      </PackingItem>
      <PackingItem
        start={[1.76, 2.8, -0.8]}
        end={[1.76, 0.21, -0.8]}
        rotation={[0.08, -0.12, 0.06]}
        index={4}
        {...itemProps}
      >
        <group scale={[1.2, 1.8, 1.1]}>
          <Book />
        </group>
      </PackingItem>
      <PackingItem
        start={[1.76, 2.8, 0.93]}
        end={[1.76, 0.33, 0.93]}
        rotation={[0.08, 0.12, -0.06]}
        index={5}
        {...itemProps}
      >
        <group scale={[1.08, 1, 1.6]}>
          <Pouch />
        </group>
      </PackingItem>
      <PackingItem
        start={[0.12, 2.8, 1.45]}
        end={[0.12, 0.23, 1.45]}
        rotation={[0, 0.12, 0.1]}
        index={6}
        {...itemProps}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <Bottle />
        </group>
      </PackingItem>
      <PackingItem
        start={[0.12, 2.8, 0.72]}
        end={[0.12, 0.11, 0.72]}
        rotation={[0.08, -0.12, -0.08]}
        index={7}
        {...itemProps}
      >
        <group scale={[1, 1, 0.85]}>
          <Sunglasses />
        </group>
      </PackingItem>
    </group>
  );
}

function Scene(props: SceneProps) {
  useFrame(({ camera }) => {
    camera.lookAt(0, 0.3, 0);
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
        position={[0, -1.14, 0]}
        opacity={0.25}
        scale={18}
        blur={2.8}
        far={8}
        resolution={512}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.15, 0]}
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
      <div className="lp-flat-case">
        <i />
        <i />
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
          camera={{ position: [4.2, 12, 8.4], fov: 34, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          fallback={<Fallback />}
          aria-label="Scroll to fill one open suitcase compartment with eight travel essentials, one by one"
        >
          <Scene {...props} />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
