"use client";

import {
  Component,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { Group, MathUtils, Shape, Vector3, type Mesh } from "three";

type V3 = [number, number, number];
type SceneProps = {
  progress: RefObject<number>;
  reducedMotion: RefObject<boolean>;
};
const sage = "#798773";
const trim = "#465640";
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
  const lid = useRef<Group>(null);
  const whole = useRef<Group>(null);
  const closed = useRef(0);
  const strap = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-0.62, 0);
    shape.lineTo(0.62, 0);
    shape.lineTo(0.62, 0.3);
    shape.quadraticCurveTo(0.62, 0.44, 0.45, 0.44);
    shape.lineTo(-0.45, 0.44);
    shape.quadraticCurveTo(-0.62, 0.44, -0.62, 0.3);
    shape.closePath();
    return shape;
  }, []);
  useFrame((_, delta) => {
    const target = ease((progress.current - 0.83) / 0.15);
    closed.current = reducedMotion.current
      ? target
      : MathUtils.damp(closed.current, target, 6, delta);
    if (lid.current)
      lid.current.rotation.x = MathUtils.lerp(-1.88, 0, closed.current);
    if (whole.current)
      whole.current.rotation.y = MathUtils.lerp(
        -0.16,
        0.24,
        ease(progress.current),
      );
  });
  return (
    <group ref={whole} position={[0, -0.65, 0]} rotation={[0, -0.16, -0.035]}>
      <Box
        size={[5.6, 0.24, 3.85]}
        at={[0, -0.23, 0]}
        color={sage}
        radius={0.17}
      />
      <Box
        size={[5.28, 0.12, 3.53]}
        at={[0, -0.08, 0]}
        color="#d6d5c2"
        radius={0.12}
      />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            size={[0.19, 1.27, 3.7]}
            at={[s * 2.7, 0.35, 0]}
            color={sage}
            radius={0.08}
          />
          <Box
            size={[5.48, 1.27, 0.19]}
            at={[0, 0.35, s * 1.82]}
            color={sage}
            radius={0.08}
          />
          <Box
            size={[0.055, 0.055, 3.67]}
            at={[s * 2.71, 1.01, 0]}
            color={trim}
            radius={0.02}
          />
          <Box
            size={[5.45, 0.055, 0.055]}
            at={[0, 1.01, s * 1.83]}
            color={trim}
            radius={0.02}
          />
          <Box
            size={[0.07, 0.91, 3.38]}
            at={[s * 2.575, 0.44, 0]}
            color="#b3b9a2"
            radius={0.02}
          />
          {[-1, 1].map((z) => (
            <group key={z} position={[s * 2.35, -0.52, z * 1.52]}>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.22, 0.22, 0.21, 28]} />
                <meshStandardMaterial color="#394237" roughness={0.7} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.11, 0.11, 0.225, 24]} />
                <meshStandardMaterial
                  color="#6c7463"
                  metalness={0.4}
                  roughness={0.5}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <Box
          key={i}
          size={[0.025, 0.91, 0.025]}
          at={[-2.32 + i * 0.387, 0.31, 1.924]}
          color="#65735f"
          radius={0.008}
        />
      ))}
      <mesh position={[0, 0.1, 1.92]} castShadow>
        <extrudeGeometry
          args={[
            strap,
            {
              depth: 0.13,
              bevelEnabled: true,
              bevelSize: 0.025,
              bevelThickness: 0.025,
              bevelSegments: 3,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color={trim} roughness={0.55} />
      </mesh>
      <Box
        size={[0.88, 0.23, 0.16]}
        at={[0, 0.32, 2.1]}
        color="#7e8a70"
        radius={0.05}
      />
      <Box
        size={[0.02, 0.08, 3.31]}
        at={[-0.59, 0.02, 0]}
        color="#acb39d"
        radius={0.005}
      />
      <group ref={lid} position={[0, 1.0, -1.83]} rotation={[-1.88, 0, 0]}>
        <Box
          size={[5.6, 0.24, 3.85]}
          at={[0, 0.06, 1.83]}
          color={sage}
          radius={0.17}
        />
        <Box
          size={[5.24, 0.075, 3.48]}
          at={[0, -0.095, 1.83]}
          color="#b7bea6"
          radius={0.1}
        />
        <Box
          size={[5.29, 0.045, 0.045]}
          at={[0, -0.15, 0.2]}
          color={trim}
          radius={0.012}
        />
        <Box
          size={[5.29, 0.045, 0.045]}
          at={[0, -0.15, 3.46]}
          color={trim}
          radius={0.012}
        />
        {[-1, 1].map((s) => (
          <Box
            key={s}
            size={[0.045, 0.045, 3.3]}
            at={[s * 2.63, -0.15, 1.83]}
            color={trim}
            radius={0.012}
          />
        ))}
        <Box
          size={[4.72, 0.04, 1.36]}
          at={[0, -0.155, 2.4]}
          color="#a9b298"
          radius={0.08}
        />
        <Box
          size={[4.6, 0.016, 0.045]}
          at={[0, -0.183, 1.8]}
          color="#d5d6bf"
          radius={0.008}
        />
        <Box
          size={[0.1, 0.025, 0.18]}
          at={[1.89, -0.2, 1.82]}
          color="#8d8e6a"
          radius={0.015}
        />
        {Array.from({ length: 24 }, (_, i) => (
          <Box
            key={i}
            size={[0.012, 0.008, 1.16]}
            at={[-2.2 + i * 0.19, -0.182, 2.43]}
            color="#98a38a"
            radius={0.002}
          />
        ))}
        <Box
          size={[0.62, 0.025, 0.25]}
          at={[0, -0.15, 0.77]}
          color="#d7d7bd"
          radius={0.025}
        />
        {Array.from({ length: 13 }, (_, i) => (
          <Box
            key={i}
            size={[0.035, 0.04, 2.91]}
            at={[-2.3 + i * 0.383, 0.194, 1.83]}
            color="#6b7a64"
            radius={0.014}
          />
        ))}
      </group>
      <PackingItem
        start={[-2.14, 2.39, 0.68]}
        end={[-1.62, 0.16, 0.78]}
        rotation={[0.09, -0.25, -0.16]}
        index={0}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Shirt color="#aebc98" />
      </PackingItem>
      <PackingItem
        start={[-1.3, 3.16, 1.1]}
        end={[-1.62, 0.61, 0.78]}
        rotation={[0.04, 0.18, -0.12]}
        index={1}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Shirt color="#e0d5be" knit />
      </PackingItem>
      <PackingItem
        start={[0.35, 2.7, -0.02]}
        end={[-0.31, 0.2, -0.45]}
        rotation={[0.12, -0.3, -0.2]}
        index={2}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Sneaker />
      </PackingItem>
      <PackingItem
        start={[1.14, 3.19, -0.18]}
        end={[0.4, 0.2, -0.45]}
        rotation={[-0.1, -0.25, 0.16]}
        index={3}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Sneaker flip />
      </PackingItem>
      <PackingItem
        start={[2.26, 1.91, 0.96]}
        end={[1.7, 0.32, 0.98]}
        rotation={[0.12, -0.21, 0.12]}
        index={4}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Pouch />
      </PackingItem>
      <PackingItem
        start={[2.55, 2.95, -0.9]}
        end={[2.14, 0.22, -0.62]}
        rotation={[0.08, 0.3, -0.18]}
        index={5}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Bottle />
      </PackingItem>
      <PackingItem
        start={[-2.06, 1.85, -1.07]}
        end={[-1.72, 0.09, -1.0]}
        rotation={[0.1, -0.24, 0.1]}
        index={6}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Book />
      </PackingItem>
      <PackingItem
        start={[0.93, 1.61, 2.13]}
        end={[0.2, 0.15, 1.1]}
        rotation={[0.15, -0.12, -0.24]}
        index={7}
        progress={progress}
        reducedMotion={reducedMotion}
      >
        <Sunglasses />
      </PackingItem>
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
