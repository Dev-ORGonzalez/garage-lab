import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CarModel } from './CarModel';
import { facade, softShadow } from './textures';
import { CARS } from '../data/cars';

// Entorno urbano: manzana del taller, aceras, calles, cruce con semáforo,
// árboles, faroles y tráfico que respeta el semáforo.

// La manzana del taller va de x -7..10 y z -6..10 (arriba del suelo, y = 0)
const BLOCK = { x0: -7, x1: 10, z0: -6, z1: 10 };
const ROAD_W = 6.4;
const ROAD_Y = -0.16;
// Calle A corre a lo largo de X (frente al taller); calle B a lo largo de Z
const ROAD_A_Z = BLOCK.z1 + ROAD_W / 2; // centro de la calle A
const ROAD_B_X = BLOCK.x1 + ROAD_W / 2; // centro de la calle B
const EXTENT = 60;

const mat = (color: number, roughness = 0.8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

type Light = 'green' | 'yellow' | 'red';

interface Vehicle {
  model: CarModel;
  axis: 'x' | 'z';
  dir: 1 | -1;
  lane: number; // coordenada fija del carril
  s: number; // posición a lo largo del eje
  speed: number;
  maxSpeed: number;
}

export class City extends THREE.Group {
  private lightA: Light = 'green'; // semáforo para la calle A
  private lightB: Light = 'red';
  private cycle = 0;
  private lamps: { a: THREE.Mesh[]; b: THREE.Mesh[] } = { a: [], b: [] };
  private lampMats: Record<Light, { on: THREE.MeshStandardMaterial; off: THREE.MeshStandardMaterial }>;
  private vehicles: Vehicle[] = [];

  constructor() {
    super();
    const lamp = (color: number) => ({
      on: new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2, roughness: 0.2 }),
      off: new THREE.MeshStandardMaterial({ color: 0x2a2d3a, roughness: 0.4 }),
    });
    this.lampMats = { red: lamp(0xff3030), yellow: lamp(0xffc21a), green: lamp(0x2ee86a) };

    this.buildGround();
    this.buildRoads();
    this.buildSidewalksAndLot();
    this.buildStreetFurniture();
    this.buildTrafficLights();
    this.buildTraffic();
    this.applyLights();
  }

  // ---------- Suelo y manzanas ----------

  private buildGround(): void {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT * 3, EXTENT * 3), mat(0x5fb848, 0.95));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = ROAD_Y - 0.02;
    grass.receiveShadow = true;
    this.add(grass);

    // Manzanas vecinas (césped elevado con acera)
    const blocks = [
      [BLOCK.x0 - 30, BLOCK.x0 - 0.0, BLOCK.z0 - 30, BLOCK.z1], // (no se ve mucho)
      [BLOCK.x1 + ROAD_W, BLOCK.x1 + ROAD_W + 30, BLOCK.z0 - 30, BLOCK.z1],
      [BLOCK.x0 - 30, BLOCK.x1, BLOCK.z1 + ROAD_W, BLOCK.z1 + ROAD_W + 30],
      [BLOCK.x1 + ROAD_W, BLOCK.x1 + ROAD_W + 30, BLOCK.z1 + ROAD_W, BLOCK.z1 + ROAD_W + 30],
    ];
    blocks.slice(1).forEach(([x0, x1, z0, z1]) => this.addLawnBlock(x0, x1, z0, z1));
  }

  private addLawnBlock(x0: number, x1: number, z0: number, z1: number): void {
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, -ROAD_Y, d), mat(0xd9dde4, 0.85));
    curb.position.set(cx, ROAD_Y / 2, cz);
    curb.receiveShadow = true;
    this.add(curb);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(w - 2.4, d - 2.4), mat(0x6cc452, 0.95));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cx, 0.005, cz);
    lawn.receiveShadow = true;
    this.add(lawn);
  }

  // ---------- Calles ----------

  private buildRoads(): void {
    const asphalt = mat(0x5a606c, 0.9);
    const roadA = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT * 3, ROAD_W), asphalt);
    roadA.rotation.x = -Math.PI / 2;
    roadA.position.set(0, ROAD_Y, ROAD_A_Z);
    roadA.receiveShadow = true;
    const roadB = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, EXTENT * 3), asphalt);
    roadB.rotation.x = -Math.PI / 2;
    roadB.position.set(ROAD_B_X, ROAD_Y + 0.001, 0);
    roadB.receiveShadow = true;
    this.add(roadA, roadB);

    const white = mat(0xf4f6fa, 0.6);
    const yellow = mat(0xffc21a, 0.6);
    const y = ROAD_Y + 0.006;
    const half = ROAD_W / 2;

    // Líneas centrales discontinuas (amarillas) fuera del cruce
    for (let x = -EXTENT; x < EXTENT; x += 2.2) {
      if (x > BLOCK.x1 - 1.5 && x < BLOCK.x1 + ROAD_W + 0.5) continue;
      this.add(mesh(new THREE.BoxGeometry(1.2, 0.01, 0.14), yellow, x, y, ROAD_A_Z, false));
    }
    for (let z = -EXTENT; z < EXTENT; z += 2.2) {
      if (z > BLOCK.z1 - 1.5 && z < BLOCK.z1 + ROAD_W + 0.5) continue;
      this.add(mesh(new THREE.BoxGeometry(0.14, 0.01, 1.2), yellow, ROAD_B_X, y, z, false));
    }

    // Pasos de cebra en los cuatro lados del cruce
    const zebra = (cx: number, cz: number, alongX: boolean) => {
      for (let i = -2; i <= 2; i++) {
        const geo = alongX ? new THREE.BoxGeometry(1.6, 0.01, 0.45) : new THREE.BoxGeometry(0.45, 0.01, 1.6);
        const ox = alongX ? 0 : i * 1.05;
        const oz = alongX ? i * 1.05 : 0;
        this.add(mesh(geo, white, cx + ox, y, cz + oz, false));
      }
    };
    zebra(BLOCK.x1 - 1.1, ROAD_A_Z, true);
    zebra(BLOCK.x1 + ROAD_W + 1.1, ROAD_A_Z, true);
    zebra(ROAD_B_X, BLOCK.z1 - 1.1, false);
    zebra(ROAD_B_X, BLOCK.z1 + ROAD_W + 1.1, false);

    // Líneas de pare
    this.add(mesh(new THREE.BoxGeometry(0.3, 0.01, half), white, BLOCK.x1 - 2.3, y, ROAD_A_Z + half / 2, false));
    this.add(mesh(new THREE.BoxGeometry(0.3, 0.01, half), white, BLOCK.x1 + ROAD_W + 2.3, y, ROAD_A_Z - half / 2, false));
    this.add(mesh(new THREE.BoxGeometry(half, 0.01, 0.3), white, ROAD_B_X - half / 2, y, BLOCK.z1 - 2.3, false));
    this.add(mesh(new THREE.BoxGeometry(half, 0.01, 0.3), white, ROAD_B_X + half / 2, y, BLOCK.z1 + ROAD_W + 2.3, false));
  }

  // ---------- Manzana del taller: acera y estacionamiento ----------

  private buildSidewalksAndLot(): void {
    const w = BLOCK.x1 - BLOCK.x0;
    const d = BLOCK.z1 - BLOCK.z0;
    // Bloque elevado con borde de acera
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, -ROAD_Y, d), mat(0xd9dde4, 0.85));
    slab.position.set((BLOCK.x0 + BLOCK.x1) / 2, ROAD_Y / 2, (BLOCK.z0 + BLOCK.z1) / 2);
    slab.receiveShadow = true;
    this.add(slab);

    // Estacionamiento de concreto frente al taller
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(w - 2.4, d - 2.4), mat(0xa9b0bb, 0.9));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set((BLOCK.x0 + BLOCK.x1) / 2, 0.001, (BLOCK.z0 + BLOCK.z1) / 2);
    lot.receiveShadow = true;
    this.add(lot);

    // Juntas de la acera
    const joint = mat(0xbfc4cc, 0.9);
    for (let x = BLOCK.x0; x <= BLOCK.x1; x += 1.4) {
      this.add(mesh(new THREE.BoxGeometry(0.04, 0.005, 1.2), joint, x, 0.003, BLOCK.z1 - 0.6, false));
    }
    for (let z = BLOCK.z0; z <= BLOCK.z1; z += 1.4) {
      this.add(mesh(new THREE.BoxGeometry(1.2, 0.005, 0.04), joint, BLOCK.x1 - 0.6, 0.003, z, false));
    }

    // Puestos de estacionamiento (líneas blancas)
    const white = mat(0xf4f6fa, 0.6);
    for (let i = 0; i <= 3; i++) {
      this.add(mesh(new THREE.BoxGeometry(0.12, 0.005, 3.0), white, -5.2 + i * 2.8, 0.004, 7.2, false));
    }

    // Barreras de concreto en el borde del estacionamiento (con entrada libre)
    const barrierGeo = new RoundedBoxGeometry(1.5, 0.55, 0.38, 2, 0.08);
    const barrierMat = mat(0xc9ced6, 0.8);
    const stripe = mat(0xffc21a, 0.6);
    const addBarrier = (x: number, z: number, rotY: number) => {
      const b = mesh(barrierGeo, barrierMat, x, 0.275, z);
      b.rotation.y = rotY;
      const s = mesh(new THREE.BoxGeometry(1.52, 0.08, 0.4), stripe, x, 0.42, z);
      s.rotation.y = rotY;
      this.add(b, s);
    };
    for (const x of [-6.0, -4.4, 6.6, 8.2]) addBarrier(x, BLOCK.z1 - 1.5, 0);
    for (const z of [-3.6, -2.0, 2.6, 4.2]) addBarrier(BLOCK.x1 - 1.5, z, Math.PI / 2);

    // Arbustos en las esquinas del estacionamiento
    const hedge = new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.9 });
    for (const [x, z, sx] of [[-6.2, -5.2, 0], [BLOCK.x1 - 1.6, -5.3, 1]] as const) {
      const h = mesh(new RoundedBoxGeometry(sx ? 1 : 1, 0.9, sx ? 1.8 : 1.8, 3, 0.3), hedge, x, 0.45, z);
      this.add(h);
    }
  }

  // ---------- Árboles y faroles ----------

  private tree(x: number, z: number, scale = 1): void {
    const g = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 10), mat(0x8a5a33), 0, 0.6, 0);
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3fae4a, roughness: 0.85 });
    const leaf2 = new THREE.MeshStandardMaterial({ color: 0x56c45a, roughness: 0.85 });
    g.add(trunk);
    g.add(mesh(new THREE.SphereGeometry(0.8, 18, 14), leaf, 0, 1.7, 0));
    g.add(mesh(new THREE.SphereGeometry(0.6, 18, 14), leaf2, 0.4, 2.1, 0.2));
    g.add(mesh(new THREE.SphereGeometry(0.55, 18, 14), leaf2, -0.35, 2.0, -0.25));
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.01;
    g.add(sh);
    g.scale.setScalar(scale);
    g.position.set(x, 0, z);
    this.add(g);
  }

  // Palmera caribeña
  private palm(x: number, z: number, scale = 1, lean = 0): void {
    const g = new THREE.Group();
    const h = 4.2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean * 0.3, h * 0.35, 0),
      new THREE.Vector3(lean * 0.8, h * 0.7, 0),
      new THREE.Vector3(lean * 1.4, h, 0),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.14, 10), mat(0xa9773f, 0.9));
    trunk.castShadow = true;
    g.add(trunk);
    // Anillos del tronco
    for (let i = 1; i < 8; i++) {
      const p = curve.getPoint(i / 8);
      const r = mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 14), mat(0x8a5a33, 0.9), p.x, p.y, p.z, false);
      r.rotation.x = Math.PI / 2;
      g.add(r);
    }
    const top = curve.getPoint(1);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.8, side: THREE.DoubleSide });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x45b85a, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (x + z) * 0.3;
      const pivot = new THREE.Group();
      pivot.position.copy(top);
      pivot.rotation.y = a;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), i % 2 ? leafMat : leafMat2);
      leaf.scale.set(1.35, 0.05, 0.32);
      leaf.position.set(1.15, -0.3, 0);
      leaf.rotation.z = -0.45;
      leaf.castShadow = true;
      pivot.add(leaf);
      g.add(pivot);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.add(mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(0x6b4423, 0.7), top.x + Math.cos(a) * 0.15, top.y - 0.2, top.z + Math.sin(a) * 0.15));
    }
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false, opacity: 0.4 }),
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(lean, 0.01, 0);
    g.add(sh);
    g.scale.setScalar(scale);
    g.position.set(x, 0, z);
    g.rotation.y = (x * 13 + z * 7) % 6;
    this.add(g);
  }

  // Edificio de ciudad con ventanas (y tienda opcional en planta baja)
  private building(x: number, z: number, w: number, d: number, h: number, color: string, shop?: number): void {
    const g = new THREE.Group();
    const cell = 1.4;
    const floorH = 1.3;
    const makeMat = (len: number) => {
      const t = facade(color);
      t.repeat.set(Math.max(1, Math.round(len / cell)), Math.max(1, Math.round((h - (shop !== undefined ? 1.6 : 0)) / floorH)));
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 });
    };
    const roof = mat(0x5d6779, 0.8);
    const base = shop !== undefined ? 1.6 : 0;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w, h - base, d), [makeMat(d), makeMat(d), roof, roof, makeMat(w), makeMat(w)]);
    upper.position.y = base + (h - base) / 2;
    upper.castShadow = true;
    upper.receiveShadow = true;
    g.add(upper);
    // Cornisa y techo
    g.add(mesh(new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2), mat(0xf1f4f9, 0.7), 0, h + 0.1, 0));
    g.add(mesh(new RoundedBoxGeometry(0.9, 0.5, 0.7, 2, 0.08), mat(0xb9c1cd, 0.6), w * 0.2, h + 0.45, d * 0.15));
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 14), mat(0x8a93a3, 0.5, 0.4), -w * 0.25, h + 0.55, -d * 0.2));

    if (shop !== undefined) {
      const t = facade(color, '#bfe6ff', true);
      t.repeat.set(Math.max(1, Math.round(w / 1.6)), 1);
      const tz = facade(color, '#bfe6ff', true);
      tz.repeat.set(Math.max(1, Math.round(d / 1.6)), 1);
      const sm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 });
      const smz = new THREE.MeshStandardMaterial({ map: tz, roughness: 0.4 });
      const ground = new THREE.Mesh(new THREE.BoxGeometry(w, base, d), [smz, smz, roof, roof, sm, sm]);
      ground.position.y = base / 2;
      ground.receiveShadow = true;
      g.add(ground);
      // Toldos de colores
      const awning = new THREE.MeshStandardMaterial({ color: shop, roughness: 0.7 });
      const a1 = mesh(new THREE.BoxGeometry(w + 0.1, 0.08, 0.9), awning, 0, base + 0.05, d / 2 + 0.4);
      a1.rotation.x = 0.35;
      const a2 = mesh(new THREE.BoxGeometry(0.9, 0.08, d + 0.1), awning, w / 2 + 0.4, base + 0.05, 0);
      a2.rotation.z = -0.35;
      g.add(a1, a2);
    }
    g.position.set(x, 0, z);
    this.add(g);
  }

  private streetLamp(x: number, z: number, rotY: number): void {
    const g = new THREE.Group();
    const pole = mat(0x2f3747, 0.4, 0.6);
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 10), pole, 0, 1.8, 0));
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), pole, 0.5, 3.55, 0));
    g.add(mesh(new RoundedBoxGeometry(0.5, 0.14, 0.28, 2, 0.05), pole, 1.0, 3.5, 0));
    const bulb = new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xffe9a0, emissiveIntensity: 0.8 });
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.04, 0.2), bulb, 1.0, 3.42, 0, false));
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    this.add(g);
  }

  private buildStreetFurniture(): void {
    // Palmeras en la acera del taller
    this.palm(-3.2, BLOCK.z1 - 0.6, 0.85, 0.5);
    this.palm(3.4, BLOCK.z1 - 0.6, 0.8, -0.4);
    this.palm(BLOCK.x1 - 0.6, -4.6, 0.85, 0.4);
    this.palm(BLOCK.x1 - 0.6, 6.8, 0.75, -0.3);

    // Manzana de enfrente (calle A): parque con palmeras y árboles
    for (const [x, z] of [[-2, 20], [4, 21.5], [-8, 21], [10, 22]]) this.palm(x, z, 1, 0.5);
    for (const [x, z] of [[1, 24], [-5, 25], [7, 26]]) this.tree(x, z, 1.1);

    // Manzana de la derecha (calle B): tiendas bajas
    this.building(21, -1.5, 5, 4, 3.6, '#ffd7a8', 0xe63946);
    this.building(21, 4.2, 5, 4.2, 4.4, '#bfe0ff', 0x1f6fff);
    this.building(21, -7.5, 5, 4.5, 5.2, '#d8f0c8', 0x2ecc71);
    this.palm(18.4, 8.2, 0.9, 0.4);
    this.palm(18.4, 1.3, 0.8, -0.3);
    for (const [x, z] of [[21, 21], [25, 24], [27, 14]]) this.tree(x, z, 1.1);

    // Ciudad al fondo (detrás del taller)
    const colors = ['#f6d7b0', '#cfe3ff', '#f8c8c8', '#d9d2f5', '#ffe7a3', '#c8ecd9'];
    let i = 0;
    for (let x = -24; x <= 12; x += 6.5) {
      if (x + 3 > BLOCK.x1 && x - 3 < BLOCK.x1 + ROAD_W) continue; // no sobre la calle B
      const h = 7 + ((i * 37) % 9);
      this.building(x, -12 - (i % 2) * 1.5, 5.5, 5, h, colors[i % colors.length], i % 3 === 0 ? 0xff8a00 : undefined);
      i++;
    }
    for (let z = -4; z <= 22; z += 6.5) {
      if (z + 3 > BLOCK.z1 && z - 3 < BLOCK.z1 + ROAD_W) continue; // no sobre la calle A
      const h = 6 + ((i * 29) % 10);
      this.building(-13 - (i % 2) * 1.5, z, 5, 5.5, h, colors[i % colors.length], i % 3 === 1 ? 0x8e44ad : undefined);
      i++;
    }
    for (const [x, z] of [[-9.5, -8.5], [-9.5, 0], [-9.5, 9], [0, -8.5], [6, -8.6]]) this.palm(x, z, 1.1, 0.6);
    this.streetLamp(-6.2, BLOCK.z1 - 0.5, -Math.PI / 2);
    this.streetLamp(BLOCK.x1 - 0.5, -1.0, 0);
    this.streetLamp(BLOCK.x1 + ROAD_W + 0.5, BLOCK.z1 + ROAD_W + 6, Math.PI);
  }

  // ---------- Semáforos ----------

  private buildTrafficLights(): void {
    // Uno en la esquina del taller y otro en la esquina opuesta
    this.trafficLight(BLOCK.x1 - 0.7, BLOCK.z1 - 0.7, 0);
    this.trafficLight(BLOCK.x1 + ROAD_W + 0.7, BLOCK.z1 + ROAD_W + 0.7, Math.PI);
  }

  private trafficLight(x: number, z: number, rotY: number): void {
    const g = new THREE.Group();
    const pole = mat(0x2f3747, 0.4, 0.6);
    const housing = mat(0x1a1a2e, 0.5);
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.8, 12), pole, 0, 1.9, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.15, 16), pole, 0, 0.075, 0));

    // Cabeza mirando a la calle A (tráfico que va por X) y otra a la calle B (por Z)
    const head = (forA: boolean) => {
      const h = new THREE.Group();
      h.add(mesh(new RoundedBoxGeometry(0.42, 1.15, 0.32, 3, 0.08), housing, 0, 0, 0));
      const lights: THREE.Mesh[] = [];
      [0.36, 0, -0.36].forEach((y) => {
        const l = mesh(new THREE.SphereGeometry(0.12, 16, 12), this.lampMats.red.off, 0, y, 0.15, false);
        l.scale.z = 0.5;
        lights.push(l);
        h.add(l);
        const visor = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 16, 1, true, -Math.PI / 2, Math.PI), housing, 0, y + 0.06, 0.2, false);
        visor.rotation.x = Math.PI / 2;
        visor.rotation.z = Math.PI / 2;
        h.add(visor);
      });
      (forA ? this.lamps.a : this.lamps.b).push(...lights);
      return h;
    };
    const ha = head(true);
    ha.position.set(0.3, 3.2, 0);
    ha.rotation.y = Math.PI / 2; // mira hacia +X (hacia el tráfico de la calle A)
    const hb = head(false);
    hb.position.set(0, 3.2, 0.3); // mira hacia +Z (tráfico de la calle B)
    g.add(ha, hb);

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    this.add(g);
  }

  private applyLights(): void {
    const set = (lights: THREE.Mesh[], state: Light) => {
      for (let i = 0; i < lights.length; i += 3) {
        lights[i].material = state === 'red' ? this.lampMats.red.on : this.lampMats.red.off;
        lights[i + 1].material = state === 'yellow' ? this.lampMats.yellow.on : this.lampMats.yellow.off;
        lights[i + 2].material = state === 'green' ? this.lampMats.green.on : this.lampMats.green.off;
      }
    };
    set(this.lamps.a, this.lightA);
    set(this.lamps.b, this.lightB);
  }

  // ---------- Tráfico ----------

  private buildTraffic(): void {
    const colors = [0xffc21a, 0x1f6fff, 0xf4f6fa, 0x2ecc71, 0xff8a00, 0x8e44ad, 0x2b2d36, 0xe63946];
    const spawn = (axis: 'x' | 'z', dir: 1 | -1, lane: number, s: number, i: number) => {
      const police = i >= 90;
      const model = new CarModel({
        model: police ? 'patrol' : CARS[(i * 3 + 1) % CARS.length].id,
        color: police ? 0x16181e : colors[i % colors.length],
        rimColor: police ? 0xb9c1cd : i % 3 === 0 ? 0x3a3d48 : 0xd9dde3,
        rimStyle: police ? 0 : i % 3,
        rideHeight: 0,
        sound: 0,
        finish: police ? 0 : i % 4 === 2 ? 2 : 0,
        tint: police ? 2 : i % 4,
      });
      model.scale.setScalar(0.9);
      const maxSpeed = police ? 6.2 : 5 + (i % 3) * 0.8;
      this.vehicles.push({ model, axis, dir, lane, s, speed: maxSpeed, maxSpeed });
      this.add(model);
    };
    const q = ROAD_W / 4;
    // Calle A: carril cercano va hacia -X, carril lejano hacia +X
    spawn('x', -1, ROAD_A_Z + q, 30, 0);
    spawn('x', 1, ROAD_A_Z - q, -20, 2);
    spawn('x', 1, ROAD_A_Z - q, 26, 3);
    // Calle B: carril derecho va hacia -Z, izquierdo hacia +Z
    spawn('z', -1, ROAD_B_X + q, 25, 4);
    spawn('z', 1, ROAD_B_X - q, -25, 6);
    spawn('z', 1, ROAD_B_X - q, 2, 7);
    // Patrullas de policía recorriendo las calles
    spawn('x', -1, ROAD_A_Z + q, -8, 90);
    spawn('z', -1, ROAD_B_X + q, -20, 91);
    this.placeVehicles();
  }

  private placeVehicles(): void {
    for (const v of this.vehicles) {
      const y = ROAD_Y;
      if (v.axis === 'x') {
        v.model.position.set(v.s, y, v.lane);
        v.model.rotation.y = v.dir === 1 ? 0 : Math.PI;
      } else {
        v.model.position.set(v.lane, y, v.s);
        v.model.rotation.y = v.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      }
    }
  }

  update(dt: number): void {
    // Ciclo del semáforo: A verde 7s, amarillo 2s, luego B verde 7s, amarillo 2s
    this.cycle = (this.cycle + dt) % 18;
    const c = this.cycle;
    const a: Light = c < 7 ? 'green' : c < 9 ? 'yellow' : 'red';
    const b: Light = c >= 9 && c < 16 ? 'green' : c >= 16 ? 'yellow' : 'red';
    if (a !== this.lightA || b !== this.lightB) {
      this.lightA = a;
      this.lightB = b;
      this.applyLights();
    }

    for (const v of this.vehicles) {
      const light = v.axis === 'x' ? this.lightA : this.lightB;
      const crossCenter = v.axis === 'x' ? ROAD_B_X : ROAD_A_Z;
      // Línea de pare: antes del cruce según la dirección
      const stopAt = crossCenter - v.dir * (ROAD_W / 2 + 2.6);
      const distToStop = (stopAt - v.s) * v.dir;

      let target = v.maxSpeed;
      if (light !== 'green' && distToStop > -0.2 && distToStop < 10) {
        target = distToStop < 0.3 ? 0 : Math.min(v.maxSpeed, distToStop * 1.1);
      }
      // Distancia con el carro de adelante en el mismo carril
      for (const o of this.vehicles) {
        if (o === v || o.axis !== v.axis || o.lane !== v.lane) continue;
        const gap = (o.s - v.s) * v.dir;
        if (gap > 0 && gap < 7) target = Math.min(target, Math.max(0, (gap - 5) * 1.5));
      }
      v.speed += (target - v.speed) * Math.min(1, dt * 3);
      v.s += v.speed * v.dir * dt;
      v.model.roll(v.speed * dt * 0.9);
      if (v.s * v.dir > EXTENT) v.s = -EXTENT * v.dir;
      v.model.update(dt);
    }
    this.placeVehicles();
  }
}
