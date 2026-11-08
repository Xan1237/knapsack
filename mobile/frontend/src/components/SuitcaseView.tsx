import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, StyleSheet, Text, View } from "react-native";
import type { Item, Vec3 } from "../domain";
import { type SceneProps, SuitcaseEngine } from "../scene/SuitcaseEngine";
import { colors } from "../theme";

type Props = Omit<SceneProps, "reduceMotion"> & {
  moveMode: boolean;
  onSelect: (id: string) => void;
  onDrop: (item: Item, point: Vec3, orientation: number) => boolean;
};

/** One finger orbits, or drags a belonging in move mode. Two fingers pinch to zoom. */
export default function SuitcaseView(props: Props) {
  const engine = useRef<SuitcaseEngine | null>(null);
  const size = useRef({ width: 1, height: 1 });
  const latest = useRef(props);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const [contextKey, setContextKey] = useState(0);
  latest.current = props;
  const sceneProps = { ...props, reduceMotion };
  const sceneRef = useRef(sceneProps);
  sceneRef.current = sceneProps;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    engine.current?.update(sceneRef.current);
  });

  const frameRequest = useRef(0);
  useEffect(
    () => () => {
      cancelAnimationFrame(frameRequest.current);
      engine.current?.dispose();
      engine.current = null;
    },
    [],
  );

  function onContextCreate(gl: ExpoWebGLRenderingContext) {
    try {
      const instance = new SuitcaseEngine(gl, size.current, (item, point, orientation) =>
        latest.current.onDrop(item, point, orientation),
      );
      engine.current = instance;
      instance.update(sceneRef.current);
      let last = Date.now();
      const loop = () => {
        const now = Date.now();
        try {
          instance.tick(Math.min(0.1, (now - last) / 1000));
        } catch {
          setFailed(true);
          return;
        }
        last = now;
        frameRequest.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setFailed(true);
    }
  }

  const gesture = useRef({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    moved: false,
    dragging: false,
    pinch: 0,
  });
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const { locationX: x, locationY: y } = event.nativeEvent;
        const dragging = latest.current.moveMode && !!engine.current?.beginDrag(x, y);
        gesture.current = { x, y, dx: 0, dy: 0, moved: false, dragging, pinch: 0 };
      },
      onPanResponderMove: (event, state) => {
        const g = gesture.current;
        const touches = event.nativeEvent.touches;
        if (touches.length >= 2 && !g.dragging) {
          const distance = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          if (g.pinch) engine.current?.zoom(distance / g.pinch);
          g.pinch = distance;
          g.moved = true;
        } else {
          g.pinch = 0;
          if (Math.hypot(state.dx, state.dy) > 6) g.moved = true;
          if (g.dragging) {
            if (g.moved) engine.current?.dragTo(g.x + state.dx, g.y + state.dy);
          } else if (g.moved) engine.current?.orbit(state.dx - g.dx, state.dy - g.dy);
        }
        g.dx = state.dx;
        g.dy = state.dy;
      },
      onPanResponderRelease: () => {
        const g = gesture.current;
        if (g.dragging) engine.current?.endDrag();
        if (!g.moved) {
          const id = engine.current?.pick(g.x, g.y);
          if (id) latest.current.onSelect(id);
        }
      },
      onPanResponderTerminate: () => {
        if (gesture.current.dragging) engine.current?.endDrag(true);
      },
    }),
  ).current;

  if (failed)
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>3D view unavailable</Text>
        <Text style={styles.errorBody}>
          Your inventory and packing results are safe and still work below.
        </Text>
      </View>
    );
  return (
    <View
      style={styles.fill}
      accessibilityLabel="Interactive 3D packed suitcase. Drag to orbit, pinch to zoom, tap a belonging to select it."
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        size.current = { width, height };
        const current = engine.current;
        current?.setViewSize(size.current);
        // The GL drawing buffer keeps the size it was created at, so a view that changes shape
        // would show a cropped picture that no longer lines up with touches. Start a fresh one.
        if (current && height > 0 && Math.abs(current.aspectRatio - width / height) > 0.02) {
          cancelAnimationFrame(frameRequest.current);
          current.dispose();
          engine.current = null;
          setContextKey((k) => k + 1);
        }
      }}
      {...responder.panHandlers}
    >
      {/* pointerEvents none keeps every touch's coordinates relative to this wrapper. */}
      <View style={styles.fill} pointerEvents="none">
        <GLView key={contextKey} style={styles.fill} msaaSamples={4} onContextCreate={onContextCreate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  error: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 6,
    backgroundColor: colors.canvas,
  },
  errorTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  errorBody: { color: colors.muted, textAlign: "center" },
});
