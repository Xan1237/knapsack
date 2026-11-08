import type { ExpoWebGLRenderingContext } from "expo-gl";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { type Item, type Placement, type Plan, type Suitcase, type Vec3, permutations, sizeOf } from "../domain";
import { ModelKit, clamshellCase, clamshellPose, itemModel, openBag, selectionBox } from "./models";

const unit = 100;

export type SceneProps = {
  items: Item[];
  bag: Suitcase;
  plan: Plan | null;
  selected: string | null;
  layer: number;
  step: number;
  exploded: boolean;
  view: "perspective" | "top";
  resetKey: number;
  reservedSpace: Placement | null;
  reduceMotion: boolean;
};

/**
 * Three reaches WebGL through canvas.getContext. Handing it expo-gl's context this way (rather
 * than through the `context` option) avoids its WebGL1 instanceof guard, as react-three-fiber does.
 */
export function createRenderer(gl: ExpoWebGLRenderingContext) {
  const canvas = {
    style: {},
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    getContext: () => gl,
    addEventListener() {},
    removeEventListener() {},
  };
  const renderer = new WebGLRenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    antialias: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.toneMapping = ACESFilmicToneMapping;
  return renderer;
}

/** Solver [X,Y length,Z up] -> Three [X,Y up,Z length], with proper signed rotations. */
function itemQuaternion(orientation: number) {
  const p = permutations[orientation];
  const basis = [new Vector3(), new Vector3(), new Vector3()];
  for (let occupied = 0; occupied < 3; occupied++) basis[p[occupied]].setComponent(occupied, 1);
  const solver = new Matrix4().makeBasis(basis[0], basis[1], basis[2]);
  if (solver.determinant() < 0) basis[0].multiplyScalar(-1);
  solver.makeBasis(basis[0], basis[1], basis[2]);
  const swap = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  return new Quaternion().setFromRotationMatrix(swap.clone().multiply(solver).multiply(swap));
}

/** Give each overflow item its own floor space beyond both open suitcase halves. */
function explorerLayout(items: Item[], bag: Suitcase) {
  const width = bag.dimensions[0] / unit;
  const length = bag.dimensions[1] / unit;
  const right = bag.clamshell ? width : width / 2;
  const start = right + 0.8;
  const gap = 0.45;
  const sizes = items.map((item) => sizeOf(item).map((n) => n / unit) as Vec3);
  const rowWidth = Math.max(4, width * 1.25, ...sizes.map((d) => d[0]));
  const bounds = {
    min: [-right - 0.5, -0.45, -length / 2 - 0.7] as Vec3,
    max: [right + 0.5, bag.dimensions[2] / unit + 0.7, length / 2 + 0.7] as Vec3,
  };
  let x = start,
    z = -length / 2,
    rowDepth = 0;
  const overflow = items.map((item, index) => {
    const d = sizes[index];
    if (x > start && x + d[0] > start + rowWidth) {
      x = start;
      z += rowDepth + gap;
      rowDepth = 0;
    }
    const position: Vec3 = [x + d[0] / 2, d[2] / 2, z + d[1] / 2];
    bounds.max[0] = Math.max(bounds.max[0], x + d[0] + gap);
    bounds.max[1] = Math.max(bounds.max[1], d[2] + gap);
    bounds.max[2] = Math.max(bounds.max[2], z + d[1] + gap);
    x += d[0] + gap;
    rowDepth = Math.max(rowDepth, d[1]);
    return { id: item.id, position };
  });
  return { overflow, bounds };
}

type Entity = {
  group: Group;
  inner: Group;
  selection: Object3D;
  target: Vector3;
  modelKey: string;
  item: Item;
  orientation: number;
};

export class SuitcaseEngine {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private kit = new ModelKit();
  private frame = new Group();
  private props: SceneProps | null = null;
  private entities = new Map<string, Entity>();
  private bagKey = "";
  private bagGroup: Group | null = null;
  private clamshell: ReturnType<typeof clamshellCase> | null = null;
  private closing = 0;
  private reserved: Group | null = null;
  private reservedKey = "";
  private target = new Vector3(0, 0.6, 0);
  private azimuth = Math.atan2(7.2, 10.8);
  private polar = 1;
  private distance = 15;
  private maxDistance = 22;
  private frameKey = "";
  private aspect: number;
  private dirty = 3;
  private raycaster = new Raycaster();
  private drag: { id: string; plane: Plane; offset: Vector3; origin: Vector3; moved: boolean } | null = null;

  constructor(
    private gl: ExpoWebGLRenderingContext,
    private viewSize: { width: number; height: number },
    private onDrop: (item: Item, point: Vec3, orientation: number) => boolean,
  ) {
    this.renderer = createRenderer(gl);
    this.aspect = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
    this.camera = new PerspectiveCamera(39, this.aspect, 0.1, 150);
    this.scene.background = new Color("#eeeae1");
    this.scene.add(new AmbientLight(0xffffff, 1.7));
    const sun = new DirectionalLight(0xffffff, 3);
    sun.position.set(4, 9, 3);
    const fill = new DirectionalLight(0xffffff, 1.2);
    fill.position.set(-5, 4, -4);
    this.scene.add(sun, fill, this.frame);
  }

  setViewSize(size: { width: number; height: number }) {
    this.viewSize = size;
  }

  update(props: SceneProps) {
    this.props = props;
    this.dirty = Math.max(this.dirty, 2);
    this.syncBag(props);
    const parents = this.clamshell
      ? { base: this.clamshell.base, lid: this.clamshell.lid }
      : { base: this.frame, lid: this.frame };
    const { items, bag, plan, layer, step, exploded } = props;
    const w = bag.dimensions[0] / unit,
      l = bag.dimensions[1] / unit;
    const depth = bag.dimensions[2] / (bag.clamshell ? 2 : 1);
    const wanted = new Map<string, { item: Item; parent: Object3D; position: Vec3; orientation: number }>();
    for (const p of plan?.placements ?? []) {
      const item = items.find((i) => i.id === p.id);
      if (
        !item ||
        p.order > step ||
        p.position[2] > bag.clearance + ((depth - bag.clearance) * layer) / 100 + 0.001
      )
        continue;
      const size = sizeOf(item);
      const dims = permutations[p.orientation].map((k) => size[k]);
      wanted.set(p.id, {
        item,
        parent: p.compartment === "lid" ? parents.lid : parents.base,
        orientation: p.orientation,
        position: [
          (p.position[0] + dims[0] / 2) / unit - w / 2,
          (p.position[2] + dims[2] / 2) / unit + (exploded ? p.position[2] / 80 : 0),
          (p.position[1] + dims[1] / 2) / unit - l / 2,
        ],
      });
    }
    const unplacedIds = new Set(
      plan ? plan.unplaced.map((u) => u.id) : items.filter((i) => i.included).map((i) => i.id),
    );
    const { overflow, bounds } = explorerLayout(
      items.filter((i) => i.included && (i.aside || unplacedIds.has(i.id))),
      bag,
    );
    for (const u of overflow) {
      const item = items.find((i) => i.id === u.id);
      if (item) wanted.set(u.id, { item, parent: this.frame, position: u.position, orientation: 0 });
    }
    for (const [id, entity] of this.entities)
      if (!wanted.has(id)) {
        entity.group.removeFromParent();
        this.entities.delete(id);
      }
    for (const [id, next] of wanted) this.syncEntity(id, next, props);
    this.syncReserved(props);
    this.frameCamera(bounds, props);
  }

  private syncBag(props: SceneProps) {
    const { bag } = props;
    const key = JSON.stringify([bag.id, bag.dimensions, bag.color, !!bag.clamshell]);
    if (key === this.bagKey) return;
    this.bagKey = key;
    for (const entity of this.entities.values()) entity.group.removeFromParent();
    this.entities.clear();
    if (this.bagGroup) this.frame.remove(this.bagGroup);
    this.clamshell = null;
    this.reservedKey = "";
    this.reserved = null;
    if (bag.clamshell) {
      this.clamshell = clamshellCase(this.kit, bag);
      this.bagGroup = this.clamshell.root;
    } else this.bagGroup = openBag(this.kit, bag);
    this.frame.add(this.bagGroup);
  }

  private syncEntity(
    id: string,
    next: { item: Item; parent: Object3D; position: Vec3; orientation: number },
    props: SceneProps,
  ) {
    const { item } = next;
    const modelKey = `${item.category}|${item.color}|${item.mesh ? "mesh" : ""}`;
    let entity = this.entities.get(id);
    if (entity && entity.modelKey !== modelKey) {
      entity.group.removeFromParent();
      this.entities.delete(id);
      entity = undefined;
    }
    if (!entity) {
      const group = new Group();
      const inner = new Group();
      group.userData.itemId = id;
      inner.add(itemModel(this.kit, item));
      const selection = selectionBox(this.kit, item);
      inner.add(selection);
      group.add(inner);
      // New belongings settle into place from above.
      group.position.set(next.position[0], next.position[1] + (props.reduceMotion ? 0 : 2), next.position[2]);
      next.parent.add(group);
      entity = { group, inner, selection, target: new Vector3(...next.position), modelKey, item, orientation: -1 };
      this.entities.set(id, entity);
    } else if (entity.group.parent !== next.parent) next.parent.attach(entity.group);
    entity.item = item;
    if (this.drag?.id !== id) entity.target.set(...next.position);
    if (entity.orientation !== next.orientation) {
      entity.orientation = next.orientation;
      entity.group.quaternion.copy(itemQuaternion(next.orientation));
    }
    const d = sizeOf(item);
    entity.inner.scale.set(d[0] / unit, d[2] / unit, d[1] / unit);
    entity.selection.visible = props.selected === id;
  }

  private syncReserved(props: SceneProps) {
    const { reservedSpace: r, exploded, step, plan, layer, bag } = props;
    const show = !!r && !exploded && step === plan?.placements.length && layer === 100;
    const key = show ? JSON.stringify(r) : "";
    if (key === this.reservedKey) return;
    this.reservedKey = key;
    this.reserved?.removeFromParent();
    this.reserved = null;
    if (!show || !r || !this.clamshell) return;
    const w = bag.dimensions[0] / unit,
      l = bag.dimensions[1] / unit;
    const box = new BoxGeometry(r.dimensions[0] / unit, r.dimensions[2] / unit, r.dimensions[1] / unit);
    const group = new Group();
    group.position.set(
      (r.position[0] + r.dimensions[0] / 2) / unit - w / 2,
      (r.position[2] + r.dimensions[2] / 2) / unit,
      (r.position[1] + r.dimensions[1] / 2) / unit - l / 2,
    );
    group.add(new Mesh(box, new MeshBasicMaterial({ color: "#b78b56", transparent: true, opacity: 0.08, depthWrite: false })));
    group.add(new LineSegments(new EdgesGeometry(box), new LineBasicMaterial({ color: "#b78b56" })));
    (r.compartment === "lid" ? this.clamshell.lid : this.clamshell.base).add(group);
    this.reserved = group;
  }

  /** Reframe only when the occupied area, view mode, or reset changes, preserving orbiting. */
  private frameCamera(bounds: { min: Vec3; max: Vec3 }, props: SceneProps) {
    const top = props.view === "top";
    const key = JSON.stringify([bounds, top, props.resetKey, this.aspect]);
    if (key === this.frameKey) return;
    this.frameKey = key;
    const box = new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max));
    box.getCenter(this.target);
    const radius = box.getSize(new Vector3()).length() / 2;
    const vertical = (this.camera.fov * Math.PI) / 360;
    const limiting = Math.min(vertical, Math.atan(Math.tan(vertical) * this.aspect));
    // The bounding sphere is conservative for a flat, open case, so frame a little inside it.
    this.distance = (radius / Math.sin(limiting)) * 0.92;
    this.maxDistance = Math.max(22, this.distance * 2);
    this.camera.far = Math.max(150, this.distance + radius * 3);
    this.camera.updateProjectionMatrix();
    this.azimuth = top ? 0 : Math.atan2(7.2, 10.8);
    this.polar = top ? 0.001 : Math.acos(8.2 / new Vector3(7.2, 8.2, 10.8).length());
  }

  private applyCamera() {
    const sin = Math.sin(this.polar);
    this.camera.position.set(
      this.target.x + this.distance * sin * Math.sin(this.azimuth),
      this.target.y + this.distance * Math.cos(this.polar),
      this.target.z + this.distance * sin * Math.cos(this.azimuth),
    );
    this.camera.lookAt(this.target);
  }

  orbit(dx: number, dy: number) {
    this.azimuth -= dx * 0.008;
    this.polar = MathUtils.clamp(this.polar - dy * 0.008, 0.001, Math.PI * 0.48);
    this.dirty = Math.max(this.dirty, 2);
  }

  zoom(ratio: number) {
    this.distance = MathUtils.clamp(this.distance / ratio, 5, this.maxDistance);
    this.dirty = Math.max(this.dirty, 2);
  }

  private ray(x: number, y: number) {
    this.applyCamera();
    this.camera.updateMatrixWorld();
    const ndc = new Vector2((x / this.viewSize.width) * 2 - 1, -(y / this.viewSize.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster;
  }

  /** The belonging under a touch point. */
  pick(x: number, y: number): string | null {
    const roots = [...this.entities.values()].map((e) => e.group);
    if (!roots.length) return null;
    this.scene.updateMatrixWorld();
    for (const hit of this.ray(x, y).intersectObjects(roots, true)) {
      let node: Object3D | null = hit.object;
      while (node) {
        if (node.userData.itemId) return node.userData.itemId as string;
        node = node.parent;
      }
    }
    // Small belongings are hard to hit exactly with a finger, so accept a near miss.
    let nearest: string | null = null;
    let best = 30;
    for (const [id, entity] of this.entities) {
      const p = entity.group.getWorldPosition(new Vector3()).project(this.camera);
      if (p.z > 1) continue;
      const distance = Math.hypot(
        ((p.x + 1) / 2) * this.viewSize.width - x,
        ((1 - p.y) / 2) * this.viewSize.height - y,
      );
      if (distance < best) {
        best = distance;
        nearest = id;
      }
    }
    return nearest;
  }

  /** The drawing buffer's shape, fixed when the GL context was created. */
  get aspectRatio() {
    return this.aspect;
  }

  beginDrag(x: number, y: number): string | null {
    const id = this.pick(x, y);
    const entity = id ? this.entities.get(id) : undefined;
    if (!id || !entity) return null;
    const center = entity.group.getWorldPosition(new Vector3());
    const plane = new Plane(new Vector3(0, 1, 0), -center.y);
    const hit = this.ray(x, y).ray.intersectPlane(plane, new Vector3());
    if (!hit) return null;
    this.drag = { id, plane, offset: center.clone().sub(hit), origin: entity.target.clone(), moved: false };
    return id;
  }

  dragTo(x: number, y: number) {
    const drag = this.drag;
    const entity = drag && this.entities.get(drag.id);
    if (!drag || !entity?.group.parent) return;
    const hit = this.ray(x, y).ray.intersectPlane(drag.plane, new Vector3());
    if (!hit) return;
    drag.moved = true;
    entity.target.copy(entity.group.parent.worldToLocal(hit.add(drag.offset)));
    entity.group.position.copy(entity.target);
    this.dirty = Math.max(this.dirty, 2);
  }

  endDrag(cancel = false) {
    const drag = this.drag;
    this.drag = null;
    const entity = drag && this.entities.get(drag.id);
    if (!drag || !entity) return;
    let accepted = false;
    if (!cancel && drag.moved) {
      const local = this.frame.worldToLocal(entity.group.getWorldPosition(new Vector3()));
      accepted = this.onDrop(entity.item, local.toArray() as Vec3, Math.max(0, entity.orientation));
    }
    if (!accepted) entity.target.copy(drag.origin);
    this.dirty = Math.max(this.dirty, 2);
  }

  /** Draws only while something is moving, so an idle suitcase doesn't drain the battery. */
  tick(delta: number) {
    const props = this.props;
    if (!props) return;
    let moving = false;
    for (const entity of this.entities.values()) {
      if (this.drag?.id === entity.group.userData.itemId) continue;
      const position = entity.group.position;
      if (position.distanceToSquared(entity.target) > 1e-6) {
        if (props.reduceMotion) position.copy(entity.target);
        else position.lerp(entity.target, 1 - Math.exp(-delta * 10));
        moving = true;
      }
    }
    if (this.clamshell) {
      const closed = props.step > (props.plan?.placements.length ?? 0) && !props.exploded;
      const goal = closed ? 1 : 0;
      if (Math.abs(this.closing - goal) > 1e-3) {
        this.closing = props.reduceMotion ? goal : MathUtils.damp(this.closing, goal, 5, delta);
        moving = true;
      } else this.closing = goal;
      const pose = clamshellPose(this.clamshell.w, this.clamshell.h, this.closing);
      this.clamshell.hinge.rotation.z = pose.lidAngle;
      this.clamshell.root.position.x = pose.rootX;
    }
    if (moving) this.dirty = Math.max(this.dirty, 2);
    if (this.dirty <= 0) return;
    this.dirty--;
    this.applyCamera();
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
  }

  dispose() {
    this.kit.dispose();
    this.renderer.dispose();
  }
}
