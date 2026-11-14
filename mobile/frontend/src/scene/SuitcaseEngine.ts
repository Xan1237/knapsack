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
import {
  type Item,
  type Placement,
  type Plan,
  type Suitcase,
  type Vec3,
  anchorAtPoint,
  outsideCase,
  packedSize,
  permutations,
  sizeOf,
  softness,
  weightOf,
} from "../domain";
import { styledBag, styledClamshell } from "./bags";
import { ModelKit, clamshellCase, clamshellPose, itemModel, openBag, selectionBox } from "./models";

const unit = 100;
/** Gravity in scene units (10 cm) per second squared: a little slower than life, so drops read. */
const gravity = 38;

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

/**
 * Give each overflow item its own floor space beyond both open suitcase halves. `extent` is the
 * bag model's own footprint, which reaches past the packing space for straps and open panels.
 */
function explorerLayout(items: Item[], bag: Suitcase, extent: Box3 | null) {
  const width = bag.dimensions[0] / unit;
  const length = bag.dimensions[1] / unit;
  const right = Math.max(bag.clamshell ? width : width / 2, extent?.max.x ?? -Infinity);
  const start = right + 0.8;
  const gap = 0.45;
  const sizes = items.map((item) => sizeOf(item).map((n) => n / unit) as Vec3);
  const rowWidth = Math.max(4, width * 1.25, ...sizes.map((d) => d[0]));
  const bounds = {
    min: [-right - 0.5, -0.45, -length / 2 - 0.7] as Vec3,
    max: [right + 0.5, bag.dimensions[2] / unit + 0.7, length / 2 + 0.7] as Vec3,
  };
  if (extent) {
    for (let k = 0; k < 3; k++) {
      bounds.min[k] = Math.min(bounds.min[k], extent.min.getComponent(k) - 0.2);
      bounds.max[k] = Math.max(bounds.max[k], extent.max.getComponent(k) + 0.2);
    }
  }
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
  parent: Object3D;
  /** Size in scene units along the scene's x, y (up) and z, as placed. */
  extent: Vector3;
  /** Vertical speed while falling (units per second, negative is down). */
  fall: number;
  /** Squash and stretch: >0 flattened, <0 stretched; a damped spring back to 0. */
  squash: number;
  squashSpeed: number;
  /** Seconds to hold before dropping, so belongings land one after another in packing order. */
  delay: number;
};

/** How an item answers a landing: how much it flattens, how stiff the spring back is, and its bounce. */
function feel(item: Item) {
  const s = softness[item.category];
  // Heavier things land harder; the softest give the most and settle slowest.
  const mass = Math.min(3, 0.4 + weightOf(item));
  return {
    give: 0.012 + s.squish * 0.06,
    maxSquash: 0.06 + s.squish * 0.6,
    stiffness: 260 - s.squish * 420,
    damping: 2 * Math.sqrt(260 - s.squish * 420) * (0.55 - s.bounce * 0.4),
    bounce: s.bounce,
    mass,
  };
}

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
  /** The open bag model's bounds in the frame, for framing and overflow layout. */
  private bagExtent: Box3 | null = null;
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
  private landing: Group | null = null;

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
    const wanted = new Map<string, { item: Item; parent: Object3D; position: Vec3; orientation: number; squish: number; order: number }>();
    for (const p of plan?.placements ?? []) {
      const item = items.find((i) => i.id === p.id);
      if (
        !item ||
        p.order > step ||
        p.position[2] > bag.clearance + ((depth - bag.clearance) * layer) / 100 + 0.001
      )
        continue;
      const size = packedSize(item, p.squish);
      const dims = permutations[p.orientation].map((k) => size[k]);
      wanted.set(p.id, {
        item,
        parent: p.compartment === "lid" ? parents.lid : parents.base,
        orientation: p.orientation,
        squish: p.squish ?? 0,
        order: p.order,
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
      this.bagExtent,
    );
    for (const u of overflow) {
      const item = items.find((i) => i.id === u.id);
      if (item) wanted.set(u.id, { item, parent: this.frame, position: u.position, orientation: 0, squish: 0, order: 0 });
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
    const key = JSON.stringify([bag.id, bag.dimensions, bag.color, !!bag.clamshell, bag.kind, bag.style]);
    if (key === this.bagKey) return;
    this.bagKey = key;
    for (const entity of this.entities.values()) entity.group.removeFromParent();
    this.entities.clear();
    if (this.bagGroup) {
      this.frame.remove(this.bagGroup);
      // Styled bags build their geometry per bag; shared materials and textures stay in the kit.
      this.bagGroup.traverse((o) => {
        if (o instanceof Mesh && o.userData.ownsGeometry) o.geometry.dispose();
      });
    }
    this.clamshell = null;
    this.reservedKey = "";
    this.reserved = null;
    // The traveler's own bags are drawn from their kind and style; built-in and imported ones keep their case.
    const styled = !!bag.kind;
    if (bag.clamshell) {
      this.clamshell = styled ? styledClamshell(this.kit, bag) : clamshellCase(this.kit, bag);
      this.bagGroup = this.clamshell.root;
    } else this.bagGroup = styled ? styledBag(this.kit, bag).group : openBag(this.kit, bag);
    this.frame.add(this.bagGroup);
    this.bagGroup.updateMatrixWorld(true);
    this.bagExtent = styled ? new Box3().setFromObject(this.bagGroup) : null;
  }

  private syncEntity(
    id: string,
    next: { item: Item; parent: Object3D; position: Vec3; orientation: number; squish: number; order: number },
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
      // New belongings drop in from above and land under gravity.
      group.position.set(next.position[0], next.position[1] + (props.reduceMotion ? 0 : 2.4), next.position[2]);
      next.parent.add(group);
      entity = {
        group,
        inner,
        selection,
        target: new Vector3(...next.position),
        modelKey,
        item,
        orientation: -1,
        parent: next.parent,
        extent: new Vector3(),
        fall: 0,
        squash: 0,
        squashSpeed: 0,
        delay: props.reduceMotion ? 0 : Math.min(1.6, Math.max(0, next.order - 1) * 0.09),
      };
      // Waiting its turn to drop: out of sight rather than hovering over the bag.
      group.visible = entity.delay <= 0;
      this.entities.set(id, entity);
    } else if (entity.group.parent !== next.parent) next.parent.attach(entity.group);
    entity.parent = next.parent;
    entity.item = item;
    if (this.drag?.id !== id) entity.target.set(...next.position);
    if (entity.orientation !== next.orientation) {
      entity.orientation = next.orientation;
      entity.group.quaternion.copy(itemQuaternion(next.orientation));
    }
    const d = packedSize(item, next.squish);
    entity.inner.userData.baseScale = new Vector3(d[0] / unit, d[2] / unit, d[1] / unit);
    // Its footprint and height in the scene, for landings on what's beneath.
    const dims = permutations[Math.max(0, entity.orientation)].map((k) => d[k] / unit);
    entity.extent.set(dims[0], dims[2], dims[1]);
    entity.selection.visible = props.selected === id;
    this.applySquash(entity);
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
    // Lift it clear of the bag while dragging, so it falls into place when let go.
    const bag = this.props?.bag;
    const rim = bag ? bag.dimensions[2] / unit / (bag.clamshell ? 2 : 1) : 0;
    const lifted = Math.max(center.y, rim + entity.extent.y / 2 + 0.35);
    const plane = new Plane(new Vector3(0, 1, 0), -lifted);
    const hit = this.ray(x, y).ray.intersectPlane(plane, new Vector3());
    if (!hit) return null;
    // Measure the grab offset at the lifted height: where the item's center shows on screen,
    // projected onto the same plane as the finger. Measuring it against the item down on the floor
    // would add the camera's parallax and leave the item tens of centimetres from the finger.
    const shown = center.clone().project(this.camera);
    const centerHit = this.ray(((shown.x + 1) / 2) * this.viewSize.width, ((1 - shown.y) / 2) * this.viewSize.height)
      .ray.intersectPlane(plane, new Vector3());
    const offset = centerHit ? new Vector3(centerHit.x - hit.x, 0, centerHit.z - hit.z) : new Vector3();
    this.drag = { id, plane, offset, origin: entity.target.clone(), moved: false };
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
    entity.fall = 0;
    this.showLanding(entity);
    this.dirty = Math.max(this.dirty, 2);
  }

  /** A ghost where the dragged item will come to rest if let go here: on top of things, or down a gap. */
  private showLanding(entity: Entity) {
    const props = this.props;
    if (!props) return;
    const { bag, plan } = props;
    const local = this.frame.worldToLocal(entity.group.getWorldPosition(new Vector3()));
    const point = local.toArray() as Vec3;
    const orientation = Math.max(0, entity.orientation);
    const anchor = outsideCase(bag, point, [entity.extent.x / 2, entity.extent.z / 2])
      ? null
      : anchorAtPoint(entity.item, bag, point, orientation, plan?.placements ?? []);
    if (!anchor) {
      this.landing?.removeFromParent();
      return;
    }
    const size = sizeOf(entity.item);
    const dims = permutations[orientation].map((k) => size[k]);
    const parent = anchor.compartment === "lid" && this.clamshell ? this.clamshell.lid : this.clamshell ? this.clamshell.base : this.frame;
    const landing = (this.landing ??= this.makeLanding());
    landing.scale.set(dims[0] / unit, dims[2] / unit, dims[1] / unit);
    landing.position.set(
      (anchor.position[0] + dims[0] / 2) / unit - bag.dimensions[0] / unit / 2,
      (anchor.position[2] + dims[2] / 2) / unit,
      (anchor.position[1] + dims[1] / 2) / unit - bag.dimensions[1] / unit / 2,
    );
    if (landing.parent !== parent) parent.add(landing);
  }

  private makeLanding() {
    const group = new Group();
    const box = new BoxGeometry(1, 1, 1);
    group.add(new Mesh(box, new MeshBasicMaterial({ color: "#3f5b3f", transparent: true, opacity: 0.16, depthWrite: false })));
    group.add(new LineSegments(new EdgesGeometry(box), new LineBasicMaterial({ color: "#3f5b3f" })));
    group.traverse((o) => (o.raycast = () => {}));
    return group;
  }

  /** Something landed on whatever is directly beneath it: soft things give under the load. */
  private loadBelow(entity: Entity, impact: number) {
    const f = feel(entity.item);
    const bottom = entity.target.y - entity.extent.y / 2;
    for (const other of this.entities.values()) {
      if (other === entity || other.parent !== entity.parent) continue;
      const top = other.target.y + other.extent.y / 2;
      if (Math.abs(top - bottom) > 0.12) continue;
      const overlapX = Math.abs(other.target.x - entity.target.x) < (other.extent.x + entity.extent.x) / 2;
      const overlapZ = Math.abs(other.target.z - entity.target.z) < (other.extent.z + entity.extent.z) / 2;
      if (!overlapX || !overlapZ) continue;
      const g = feel(other.item);
      other.squashSpeed += impact * g.give * f.mass * 1.4;
    }
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
    // Accepted: fall toward where it will land now, before the new plan arrives to confirm it.
    else if (this.landing?.parent && this.landing.parent === entity.group.parent)
      entity.target.copy(this.landing.position);
    this.landing?.removeFromParent();
    this.dirty = Math.max(this.dirty, 2);
  }

  /** Draws only while something is moving, so an idle suitcase doesn't drain the battery. */
  tick(delta: number) {
    const props = this.props;
    if (!props) return;
    let moving = false;
    const dt = Math.min(delta, 1 / 30);
    for (const entity of this.entities.values()) {
      if (this.drag?.id === entity.group.userData.itemId) continue;
      const position = entity.group.position;
      if (props.reduceMotion) {
        if (position.distanceToSquared(entity.target) > 1e-6) moving = true;
        position.copy(entity.target);
        entity.squash = entity.squashSpeed = entity.fall = 0;
        this.applySquash(entity);
        continue;
      }
      if (entity.delay > 0) {
        entity.delay -= dt;
        entity.group.visible = entity.delay <= 0;
        moving = true;
        continue;
      }
      const f = feel(entity.item);
      // Sideways moves glide; anything above its resting place falls under gravity.
      const ease = 1 - Math.exp(-dt * 10);
      position.x += (entity.target.x - position.x) * ease;
      position.z += (entity.target.z - position.z) * ease;
      if (position.y > entity.target.y + 1e-4 || entity.fall > 0) {
        entity.fall -= gravity * dt;
        position.y += entity.fall * dt;
        if (position.y <= entity.target.y) {
          const impact = -entity.fall;
          position.y = entity.target.y;
          entity.squashSpeed += impact * f.give * 10;
          // Springy things hop back up a little; soft ones just flatten and settle.
          entity.fall = impact > 1.5 ? impact * f.bounce * 0.6 : 0;
          if (impact > 1.5) this.loadBelow(entity, impact);
        }
        moving = true;
      } else if (position.y < entity.target.y - 1e-4) {
        position.y += (entity.target.y - position.y) * ease;
        entity.fall = 0;
        moving = true;
      }
      // The squash spring.
      if (Math.abs(entity.squash) > 1e-4 || Math.abs(entity.squashSpeed) > 1e-3) {
        entity.squashSpeed += (-f.stiffness * entity.squash - f.damping * entity.squashSpeed) * dt;
        entity.squash = MathUtils.clamp(entity.squash + entity.squashSpeed * dt, -f.maxSquash * 0.5, f.maxSquash);
        moving = true;
      } else entity.squash = entity.squashSpeed = 0;
      this.applySquash(entity);
      if (position.distanceToSquared(entity.target) > 1e-6) moving = true;
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

  /** Flatten (or stretch) about the item's base, bulging sideways to keep its volume. */
  private applySquash(entity: Entity) {
    const s = entity.squash;
    const scale = entity.inner.userData.baseScale as Vector3 | undefined;
    if (!scale) return;
    // The inner group is in the item's own frame; flatten along the scene's up axis.
    const up = new Vector3(0, 1, 0).applyQuaternion(entity.group.quaternion.clone().invert());
    // Sideways bulge stays within the packing clearance (about 3 mm at a typical item's size),
    // so something packed flush against a wall or into a corner never pushes through the lining.
    const bulge = s > 0 ? Math.min(s * 0.5, 0.02) : s * 0.5;
    const sx = 1 + bulge * (1 - Math.abs(up.x)) - s * Math.abs(up.x);
    const sy = 1 + bulge * (1 - Math.abs(up.y)) - s * Math.abs(up.y);
    const sz = 1 + bulge * (1 - Math.abs(up.z)) - s * Math.abs(up.z);
    entity.inner.scale.set(scale.x * sx, scale.y * sy, scale.z * sz);
    entity.inner.position.set(0, (-s * entity.extent.y) / 2, 0).applyQuaternion(entity.group.quaternion.clone().invert());
  }

  dispose() {
    this.kit.dispose();
    this.renderer.dispose();
  }
}
