"use client";

import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { type Item, sizeOf } from "@/lib/domain";
import GeneratedMesh from "./GeneratedMesh";

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p>Mesh preview unavailable. Your item is saved.</p>
    ) : (
      this.props.children
    );
  }
}

export default function GeneratedMeshPreview({ item }: { item: Item }) {
  if (!item.mesh) return null;
  const size = sizeOf(item);
  const largest = Math.max(...size);
  return (
    <PreviewBoundary>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [2.2, 1.8, 2.8], fov: 34 }}
        fallback={
          <span>Your generated mesh is available in the packing view.</span>
        }
        aria-label={`Astra-generated 3D mesh of ${item.label}`}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 4, 5]} intensity={2.5} />
        <group
          scale={[
            (size[0] / largest) * 1.8,
            (size[2] / largest) * 1.8,
            (size[1] / largest) * 1.8,
          ]}
        >
          <GeneratedMesh mesh={item.mesh} />
        </group>
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </PreviewBoundary>
  );
}
