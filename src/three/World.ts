import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { backgroundGradient } from './textures';

type Updater = (dt: number, time: number) => void;

interface Clickable {
  object: THREE.Object3D;
  onClick: () => void;
}

interface Label {
  object: THREE.Object3D;
  offsetY: number;
  el: HTMLElement;
}

// Motor 3D: escena, cámara isométrica, luces, sombras, clics y etiquetas
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  private container: HTMLElement;
  private labelLayer: HTMLElement;
  private updaters: Updater[] = [];
  private clickables: Clickable[] = [];
  private labels: Label[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downAt = new THREE.Vector2();
  private timer = new THREE.Timer();
  private target = new THREE.Vector3(2.4, 0.5, 3.2);
  private viewSize = 9.2;
  private camOffset = new THREE.Vector3(20, 17, 20);
  private dragging = false;
  // Objetivo suave de la cámara (para transiciones)
  private goalTarget = new THREE.Vector3(2.4, 0.5, 3.2);
  private goalZoom = 1;
  private home: { target: THREE.Vector3; zoom: number } | null = null;
  private dragHandler: ((dx: number) => void) | null = null;
  private lastPointer = new THREE.Vector2();
  private sun!: THREE.DirectionalLight;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    container.appendChild(this.renderer.domElement);

    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'label-layer';
    container.appendChild(this.labelLayer);

    // Fondo y reflejos del entorno (dan el brillo a la pintura)
    this.scene.background = backgroundGradient();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    // Cámara isométrica (ortográfica)
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.updateCamera();

    // Luces: cielo suave + sol con sombras
    this.scene.add(new THREE.HemisphereLight(0xdfeaff, 0x4a5368, 0.7));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
    this.sun = sun;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.far = 80;
    this.scene.add(sun.target);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    this.updateCamera();

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupPointer();

    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  onUpdate(fn: Updater): void {
    this.updaters.push(fn);
  }

  addClickable(object: THREE.Object3D, onClick: () => void): void {
    this.clickables.push({ object, onClick });
  }

  // Etiqueta HTML que sigue a un objeto 3D (nombres de personajes)
  addLabel(object: THREE.Object3D, html: string, offsetY: number): HTMLElement {
    const el = document.createElement('div');
    el.className = 'name-tag';
    el.innerHTML = html;
    this.labelLayer.appendChild(el);
    this.labels.push({ object, offsetY, el });
    return el;
  }

  // Acercar o alejar (1 = normal)
  zoomBy(factor: number): void {
    const max = this.home ? 3.2 : 2.6;
    this.goalZoom = THREE.MathUtils.clamp(this.goalZoom * factor, 0.7, max);
  }

  // Vector "derecha" de la cámara sobre el suelo (para desplazar encuadres)
  cameraRight(): THREE.Vector3 {
    return new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize();
  }

  // Acerca la cámara a un punto (modo personalización). Arrastrar llama a onDrag.
  focusOn(target: THREE.Vector3, zoom: number, onDrag: (dx: number) => void): void {
    if (!this.home) this.home = { target: this.goalTarget.clone(), zoom: this.goalZoom };
    this.goalTarget.copy(target);
    this.goalZoom = zoom;
    this.dragHandler = onDrag;
  }

  clearFocus(): void {
    if (!this.home) return;
    this.goalTarget.copy(this.home.target);
    this.goalZoom = this.home.zoom;
    this.home = null;
    this.dragHandler = null;
  }

  // Dibuja un retrato (para el avatar de la barra superior)
  static renderPortrait(object: THREE.Object3D, size = 160, view?: { pos: THREE.Vector3; look: THREE.Vector3; fov: number; w?: number }): string {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    const w = view?.w ?? size;
    r.setSize(w, size);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667799, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.5, 3, 3);
    scene.add(key, object);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;
    const cam = new THREE.PerspectiveCamera(view?.fov ?? 26, w / size, 0.1, 40);
    cam.position.copy(view?.pos ?? new THREE.Vector3(0.55, 1.45, 2.3));
    cam.lookAt(view?.look ?? new THREE.Vector3(0, 1.18, 0));
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/png');
    pmrem.dispose();
    r.dispose();
    r.forceContextLoss();
    return url;
  }

  private updateCamera(): void {
    this.camera.position.copy(this.target).add(this.camOffset);
    this.camera.lookAt(this.target);
    if (this.sun) {
      this.sun.position.copy(this.target).add(new THREE.Vector3(9, 18, 12));
      this.sun.target.position.copy(this.target);
    }
  }

  private pan(dx: number, dy: number): void {
    if (this.dragHandler) {
      this.dragHandler(dx);
      return;
    }
    const h = this.renderer.domElement.clientHeight || 1;
    const k = (this.camera.top - this.camera.bottom) / this.camera.zoom / h;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    // Mover sobre el plano del suelo (compensando la inclinación de la cámara)
    const groundUp = new THREE.Vector3(up.x, 0, up.z).normalize();
    const elevation = Math.atan2(this.camOffset.y, Math.hypot(this.camOffset.x, this.camOffset.z));
    this.goalTarget.addScaledVector(right, -dx * k).addScaledVector(groundUp, (dy * k) / Math.sin(elevation));
    this.goalTarget.x = THREE.MathUtils.clamp(this.goalTarget.x, -6, 16);
    this.goalTarget.z = THREE.MathUtils.clamp(this.goalTarget.z, -6, 16);
    this.target.copy(this.goalTarget);
    this.updateCamera();
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.container.innerHTML = '';
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / h;
    // En pantallas verticales (celular) alejamos la cámara para que quepa el taller
    const size = aspect < 1.25 ? this.viewSize * (1.25 / aspect) * 0.8 : this.viewSize;
    this.camera.left = -size * aspect;
    this.camera.right = size * aspect;
    this.camera.top = size;
    this.camera.bottom = -size;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private setupPointer(): void {
    const el = this.renderer.domElement;
    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    el.addEventListener('pointerdown', (e) => {
      this.downAt.set(e.clientX, e.clientY);
      this.lastPointer.set(e.clientX, e.clientY);
      this.dragging = true;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.dragging) {
        // Arrastrar para mover la cámara por la ciudad
        this.pan(e.clientX - this.lastPointer.x, e.clientY - this.lastPointer.y);
        this.lastPointer.set(e.clientX, e.clientY);
        if (this.downAt.distanceTo(this.lastPointer) > 8) el.style.cursor = 'grabbing';
        return;
      }
      toNdc(e);
      el.style.cursor = this.pick() ? 'pointer' : 'grab';
    });
    el.addEventListener('pointerup', (e) => {
      this.dragging = false;
      el.style.cursor = 'grab';
      if (this.downAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 8) return;
      toNdc(e);
      this.pick()?.onClick();
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    }, { passive: false });
  }

  private pick(): Clickable | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickables.map((c) => c.object), true);
    if (!hits.length) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      const found = this.clickables.find((c) => c.object === obj);
      if (found) return found;
      obj = obj.parent;
    }
    return null;
  }

  private tick(time: number): void {
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = time / 1000;
    this.updaters.forEach((fn) => fn(dt, t));

    // Transición suave de cámara
    const k = 1 - Math.exp(-dt * 5);
    if (this.target.distanceToSquared(this.goalTarget) > 1e-6 || Math.abs(this.camera.zoom - this.goalZoom) > 1e-4) {
      this.target.lerp(this.goalTarget, k);
      this.camera.zoom += (this.goalZoom - this.camera.zoom) * k;
      this.camera.updateProjectionMatrix();
      this.updateCamera();
    }
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }

  private updateLabels(): void {
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      l.object.getWorldPosition(v);
      v.y += l.offsetY;
      v.project(this.camera);
      l.el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }
}
