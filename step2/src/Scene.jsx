import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const box = (size, color, radius = 0.7) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(n => n / 3))), material(color));
  mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
};
function dispose(group) { group.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }); }
function fixture(item) {
  const group = new THREE.Group(), [w, h, d] = item.dimensions;
  if (item.category === 'shoes') {
    for (const z of [-d * .24, d * .24]) {
      const sole = box([w * .95, h * .18, d * .44], '#e5e3da', 1.2); sole.position.set(0, -h * .37, z); group.add(sole);
      const upper = box([w * .85, h * .65, d * .39], item.color, 2); upper.position.set(-w * .025, h * .04, z); group.add(upper);
      const heel = box([w * .28, h * .36, d * .37], '#8a9b85', .7); heel.position.set(-w * .29, h * .27, z); group.add(heel);
      for (let i = 0; i < 4; i++) { const lace = box([.65, .25, d * .3], '#f6f3e9', .1); lace.position.set(-w * .08 + i * 1.3, h * .38, z); group.add(lace); }
    }
  } else if (item.category === 'bottle') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(w * .45, w * .46, h * .77, 28), material(item.color)); body.position.y = -h * .08; body.castShadow = true; group.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(w * .3, w * .3, h * .17, 24), material('#354e45')); cap.position.y = h * .4; group.add(cap);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(w * .455, w * .455, h * .12, 28), material('#b5c9b0')); band.position.y = -h * .12; group.add(band);
  } else if (item.category === 'camera') {
    group.add(box([w, h * .78, d * .65], item.color, 1));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(h * .29, h * .32, d * .38, 24), material('#222d2b')); lens.rotation.x = Math.PI / 2; lens.position.z = d * .28; group.add(lens);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(h * .22, h * .22, .2, 24), material('#435d69', { metalness: .6, roughness: .2 })); glass.rotation.x = Math.PI / 2; glass.position.z = d * .48; group.add(glass);
    const top = box([w * .25, h * .16, d * .4], '#c5c2b4', .3); top.position.set(-w * .25, h * .45, 0); group.add(top);
  } else if (item.category === 'headphones') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(w * .34, w * .07, 12, 40, Math.PI), material(item.color)); arc.position.y = -h * .18; arc.scale.y = h / w * 1.8; group.add(arc);
    for (const x of [-w * .35, w * .35]) { const cup = box([w * .24, h * .5, d * .6], item.color, 1.5); cup.position.set(x, -h * .17, 0); group.add(cup); }
  } else {
    group.add(box([w * .98, h * .94, d * .98], item.color, item.category === 'book' ? .3 : 1));
    if (item.category === 'book') {
      const pages = box([w * .93, h * .65, d * .92], '#f2e9d8', .2); pages.position.x = .35; group.add(pages);
      const cover = box([w, .3, d], item.color, .15); cover.position.y = h * .46; group.add(cover);
    } else if (item.category === 'clothing') {
      const fold = box([w * .81, .18, d * .78], new THREE.Color(item.color).multiplyScalar(.9), .08); fold.position.set(w * .05, h * .48, d * .07); group.add(fold);
      const band = box([w * .12, .21, d * .78], new THREE.Color(item.color).multiplyScalar(1.12), .08); band.position.set(-w * .29, h * .49, 0); group.add(band);
    } else if (item.category === 'pouch') {
      const zip = box([w * .85, .22, .4], '#e9ddbf', .1); zip.position.y = h * .49; group.add(zip);
      const tag = box([w * .14, .4, d * .3], '#ede2c8', .15); tag.position.set(w * .2, h * .49, d * .1); group.add(tag);
    }
  }
  const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const fit = Math.min(1, w / size.x, h / size.y, d / size.z);
  group.scale.setScalar(fit); group.position.copy(center.multiplyScalar(-fit));
  return group;
}

class PackingScene {
  constructor(host, onSelect, onModelIssue) {
    this.host = host; this.onSelect = onSelect; this.onModelIssue = onModelIssue;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#e7ece4');
    this.camera = new THREE.PerspectiveCamera(34, 1, .1, 1000); this.camera.position.set(85, 95, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.3;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D suitcase with packed items');
    host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.minDistance = 45; this.controls.maxDistance = 230; this.controls.maxPolarAngle = Math.PI * .48; this.controls.target.set(0, 5, 0);
    this.scene.add(new THREE.HemisphereLight('#fff8e8', '#6c8269', 3));
    const sun = new THREE.DirectionalLight('#fff7e5', 4); sun.position.set(-35, 100, 50); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, far: 250 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .15; this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#eaf2ff', 1.7); fill.position.set(60, 30, -20); this.scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), material('#e7ece4')); floor.rotation.x = -Math.PI / 2; floor.position.y = -3; floor.receiveShadow = true; this.scene.add(floor);
    const grid = new THREE.GridHelper(230, 46, '#a5b3a0', '#c8d1c2'); grid.position.y = -2.95; grid.material.opacity = .28; grid.material.transparent = true; this.scene.add(grid);
    this.bagGroup = new THREE.Group(); this.itemGroup = new THREE.Group(); this.scene.add(this.bagGroup, this.itemGroup);
    this.meshes = []; this.generation = 0; this.explode = 0;
    this.raycaster = new THREE.Raycaster();
    this.down = null;
    this.pointerDown = event => { this.down = [event.clientX, event.clientY]; };
    this.pointerUp = event => {
      if (!this.down || Math.hypot(event.clientX - this.down[0], event.clientY - this.down[1]) > 5) return;
      const rect = host.getBoundingClientRect();
      this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const hits = this.raycaster.intersectObjects(this.meshes.filter(m => m.visible), true);
      let object = hits[0]?.object;
      while (object && !object.userData.itemId) object = object.parent;
      if (object?.userData.itemId) this.onSelect(object.userData.itemId);
    };
    host.addEventListener('pointerdown', this.pointerDown); host.addEventListener('pointerup', this.pointerUp);
    this.observer = new ResizeObserver(() => { const { width, height } = host.getBoundingClientRect(); this.renderer.setSize(width, height); this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix(); }); this.observer.observe(host);
    this.tick = () => {
      this.frame = requestAnimationFrame(this.tick);
      this.meshes.forEach(mesh => { mesh.position.lerp(mesh.userData.target, .12); });
      this.controls.update(); this.renderer.render(this.scene, this.camera);
    }; this.tick();
  }

  loadModel(url, dimensions, target, generation, onLoaded = () => {}) {
    new GLTFLoader().load(url, gltf => {
      if (generation !== this.generation) { dispose(gltf.scene); return; }
      const bounds = new THREE.Box3().setFromObject(gltf.scene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      if (Math.min(size.x, size.y, size.z) <= 0) { dispose(gltf.scene); this.onModelIssue('A model has no usable 3D bounds. Showing its preview shape.'); return; }
      const content = new THREE.Group(); gltf.scene.position.sub(center); content.add(gltf.scene);
      content.scale.set(dimensions[0] / size.x, dimensions[1] / size.y, dimensions[2] / size.z);
      gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      [...target.children].forEach(child => { dispose(child); target.remove(child); }); target.add(content); onLoaded();
    }, undefined, () => { if (generation === this.generation) this.onModelIssue('A 3D model could not load. Its preview shape is shown so you can keep packing.'); });
  }

  setData(bag, items, plan) {
    this.generation++; const generation = this.generation; this.bag = bag; this.plan = plan;
    [this.bagGroup, this.itemGroup].forEach(group => { dispose(group); group.clear(); });
    const [w, h, d] = bag.dimensions;
    const base = box([w + 3.5, 2.3, d + 3.5], bag.color || '#d7b68a', 1.5); base.position.y = -1; this.bagGroup.add(base);
    const lining = box([w, .5, d], '#b3b29b', .2); lining.position.y = .1; this.bagGroup.add(lining);
    // The cutaway front lets travelers inspect every envelope inside the bag.
    for (const sign of [-1, 1]) {
      const side = box([1.7, h + 1, d + 2.2], bag.color || '#d7b68a', .7); side.position.set(sign * (w / 2 + .8), h / 2 - .5, 0); this.bagGroup.add(side);
      const wall = box([w + 1.4, sign === -1 ? h + 1 : 3, 1.7], bag.color || '#d7b68a', .7); wall.position.set(0, sign === -1 ? h / 2 - .5 : 1, sign * (d / 2 + .8)); this.bagGroup.add(wall);
      for (const x of [-w * .33, w * .33]) { const wheel = box([4.2, 2.8, 3], '#39463d', .8); wheel.position.set(x, -2, sign * d * .4); this.bagGroup.add(wheel); }
    }
    const lid = new THREE.Group(); lid.position.set(0, 0, -d / 2 - 1.7); lid.rotation.x = .92;
    const shell = box([w + 3, 2, d + 2], bag.color || '#d7b68a', 1.2); shell.position.set(0, .5, -d / 2); lid.add(shell);
    const pocket = box([w - 3, .5, d - 3], '#a9ae98', 1); pocket.position.set(0, 1.8, -d / 2); lid.add(pocket);
    for (const sign of [-1, 1]) { const strap = box([1.4, .3, d - 6], '#d7cfb0', .1); strap.position.set(sign * w * .24, 2.15, -d / 2); lid.add(strap); }
    const seam = box([w - 8, .3, .5], '#e5ddc2', .1); seam.position.set(0, 2.2, -d * .75); lid.add(seam); this.bagGroup.add(lid);
    const handle = box([w * .28, 2.2, 2.5], '#746f5b', .8); handle.position.set(0, -1, d / 2 + 3); this.bagGroup.add(handle);
    if (bag.modelUrl) {
      // A supplied bag should be an open/cutaway model; use modelDimensions to
      // describe its external bounds and modelOffset to align its usable cavity.
      const imported = new THREE.Group(); this.bagGroup.add(imported);
      imported.position.fromArray(bag.modelOffset || [0, h / 2, 0]);
      this.loadModel(bag.modelUrl, bag.modelDimensions || [w + 4, h + 2, d + 4], imported, generation, () => {
        this.bagGroup.children.filter(c => c !== imported).forEach(c => { c.visible = false; });
      });
    }
    this.meshes = [];
    for (const placement of plan.placements) {
      const item = items.find(i => i.id === placement.id), mesh = new THREE.Group(), content = fixture(item); mesh.add(content);
      mesh.userData.itemId = item.id; mesh.userData.placement = placement;
      const axes = [0, 1, 2].map(i => { const v = new THREE.Vector3(); v.setComponent(placement.permutation.indexOf(i), 1); return v; });
      const matrix = new THREE.Matrix4().makeBasis(...axes); if (matrix.determinant() < 0) { axes[0].negate(); matrix.makeBasis(...axes); } mesh.quaternion.setFromRotationMatrix(matrix);
      const target = new THREE.Vector3(placement.position[0] + placement.size[0] / 2 - w / 2, placement.position[1] + placement.size[1] / 2 + .5, placement.position[2] + placement.size[2] / 2 - d / 2);
      mesh.userData.base = target.clone(); mesh.userData.target = target.clone(); mesh.position.copy(target);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...item.dimensions)), new THREE.LineBasicMaterial({ color: '#2a5c42', transparent: true, opacity: .9 })); outline.visible = false; mesh.add(outline); mesh.userData.outline = outline;
      if (item.modelUrl) this.loadModel(item.modelUrl, item.dimensions, content, generation);
      this.itemGroup.add(mesh); this.meshes.push(mesh);
    }
    this.setDisplay(this.display || { count: plan.placements.length, explode: 0 });
  }

  setDisplay({ count, explode, selectedId }) {
    this.display = { count, explode, selectedId };
    this.meshes.forEach((mesh, i) => {
      const visible = i < count;
      if (visible && !mesh.visible) mesh.position.y = mesh.userData.base.y + 28;
      mesh.visible = visible;
      mesh.userData.target.copy(mesh.userData.base); mesh.userData.target.y += explode * (i + 1) * 2.5;
      mesh.userData.outline.visible = mesh.userData.itemId === selectedId;
    });
  }

  setView(view) {
    const w = this.bag?.dimensions[0] || 48;
    this.controls.target.set(0, 6, -3);
    if (view.startsWith('top')) this.camera.position.set(.01, w * 2.5, .01);
    else this.camera.position.set(w * 1.6, w * 1.8, w * 1.9);
    this.controls.update();
  }

  destroy() {
    this.generation++; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.controls.dispose();
    this.host.removeEventListener('pointerdown', this.pointerDown); this.host.removeEventListener('pointerup', this.pointerUp);
    dispose(this.scene); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

export default function Scene({ bag, items, plan, count, explode, selectedId, view, onSelect, onModelIssue }) {
  const host = useRef(null), engine = useRef(null), callbacks = useRef({ onSelect, onModelIssue });
  callbacks.current = { onSelect, onModelIssue };
  const [error, setError] = useState('');
  useEffect(() => {
    try { engine.current = new PackingScene(host.current, id => callbacks.current.onSelect(id), message => callbacks.current.onModelIssue(message)); }
    catch { setError('The 3D view needs WebGL. Try a browser with hardware acceleration enabled. Your packing list and fit results are still available.'); }
    return () => engine.current?.destroy();
  }, []);
  useEffect(() => { engine.current?.setData(bag, items, plan); }, [bag, items, plan]);
  useEffect(() => { engine.current?.setDisplay({ count, explode, selectedId }); }, [count, explode, selectedId, plan]);
  useEffect(() => { engine.current?.setView(view); }, [view, bag]);
  return <div className="scene-host" ref={host} data-testid="packing-scene" role="img" aria-label="Interactive 3D packing scene">{error && <p className="scene-error" role="alert">{error}</p>}</div>;
}
