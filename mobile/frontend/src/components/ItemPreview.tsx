import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useEffect, useRef } from "react";
import { AmbientLight, Color, DirectionalLight, Group, PerspectiveCamera, Scene } from "three";
import { type Item, sizeOf } from "../domain";
import { ModelKit, itemModel } from "../scene/models";
import { createRenderer } from "../scene/SuitcaseEngine";

/** A slowly turning 3D preview of one item, in its true proportions. */
export default function ItemPreview({ item, background }: { item: Item; background: string }) {
  const latest = useRef(item);
  latest.current = item;
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  function onContextCreate(gl: ExpoWebGLRenderingContext) {
    let renderer: ReturnType<typeof createRenderer>;
    try {
      renderer = createRenderer(gl);
    } catch {
      return;
    }
    const kit = new ModelKit();
    const scene = new Scene();
    scene.background = new Color(background);
    scene.add(new AmbientLight(0xffffff, 1.8));
    const sun = new DirectionalLight(0xffffff, 2.5);
    sun.position.set(3, 4, 5);
    scene.add(sun);
    const camera = new PerspectiveCamera(34, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 50);
    camera.position.set(2.2, 1.8, 2.8);
    camera.lookAt(0, 0, 0);
    const spin = new Group();
    scene.add(spin);
    let shown: Item | null = null;
    let request = 0;
    const loop = () => {
      const current = latest.current;
      if (
        !shown ||
        shown.category !== current.category ||
        shown.color !== current.color ||
        shown.mesh !== current.mesh
      ) {
        spin.clear();
        spin.add(itemModel(kit, current));
        shown = current;
      }
      const size = sizeOf(current);
      const largest = Math.max(...size);
      spin.scale.set((size[0] / largest) * 1.8, (size[2] / largest) * 1.8, (size[1] / largest) * 1.8);
      spin.rotation.y += 0.008;
      renderer.render(scene, camera);
      gl.endFrameEXP();
      request = requestAnimationFrame(loop);
    };
    loop();
    cleanup.current = () => {
      cancelAnimationFrame(request);
      kit.dispose();
      renderer.dispose();
    };
  }

  return <GLView style={{ flex: 1 }} msaaSamples={4} onContextCreate={onContextCreate} />;
}
