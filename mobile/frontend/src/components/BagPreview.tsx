import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useEffect, useRef } from "react";
import { AmbientLight, Box3, Color, DirectionalLight, Group, Mesh, PerspectiveCamera, Scene, Vector3 } from "three";
import type { Suitcase } from "../domain";
import { styledBag, styledClamshell } from "../scene/bags";
import { ModelKit } from "../scene/models";
import { createRenderer } from "../scene/SuitcaseEngine";

/** The bag exactly as the suitcase view will draw it, open and slowly turning. */
export default function BagPreview({ bag, background }: { bag: Suitcase; background: string }) {
  const latest = useRef(bag);
  latest.current = bag;
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
    scene.add(new AmbientLight(0xffffff, 1.7));
    const sun = new DirectionalLight(0xffffff, 3);
    sun.position.set(4, 9, 3);
    const fill = new DirectionalLight(0xffffff, 1.2);
    fill.position.set(-5, 4, -4);
    scene.add(sun, fill);
    const camera = new PerspectiveCamera(34, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 200);
    const spin = new Group();
    scene.add(spin);
    let shownKey = "";
    let radius = 1;
    let request = 0;
    const loop = () => {
      const current = latest.current;
      const key = JSON.stringify([current.dimensions, current.color, current.clamshell, current.kind, current.style]);
      if (key !== shownKey) {
        shownKey = key;
        spin.traverse((o) => {
          if (o instanceof Mesh && o.userData.ownsGeometry) o.geometry.dispose();
        });
        spin.clear();
        const model = current.clamshell ? styledClamshell(kit, current).root : styledBag(kit, current).group;
        // Center the model on the turntable, sitting on the floor.
        const box = new Box3().setFromObject(model);
        const center = box.getCenter(new Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        spin.add(model);
        const size = box.getSize(new Vector3());
        radius = Math.max(size.x, size.z) / 2 + size.y * 0.3;
        const distance = radius / Math.sin((camera.fov * Math.PI) / 360) * 0.95;
        camera.position.set(0, distance * 0.62, distance * 0.82);
        camera.lookAt(0, size.y * 0.25, 0);
      }
      spin.rotation.y += 0.006;
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
