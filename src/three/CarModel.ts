import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CarConfig } from '../core/GameState';
import { carSpec } from '../data/cars';
import type { CarSpec } from '../data/cars';
import { plate, softShadow } from './textures';

// Vehículo 3D generado a partir de una ficha (CarSpec): carrocería extruida
// con su perfil lateral, cabina con vidrios, frente y cola según el estilo,
// y ruedas con aros intercambiables. Pintura, acabado, tintado y altura
// se cambian en vivo. Más adelante se podrán cargar modelos GLB de Blender.

const BEVEL = 0.24;
const BEV = BEVEL * 0.9; // cuánto sobresale el bisel en el perfil
const DROP = [0, 0.08, 0.16]; // Original, Deportiva, Coilovers
const GLASS_TINT = [0x4f6f95, 0x31496a, 0x1b2740, 0x0b0f18];

type P = [number, number];

function extrude(shape: THREE.Shape, depth: number, bevel: number, segments = 5): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelSegments: segments,
    curveSegments: 24,
  });
  geo.translate(0, 0, -Math.max(0.001, depth - bevel * 2) / 2);
  return geo;
}

function shapeFrom(points: P[]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  return s;
}

// Desplaza un polígono convexo hacia adentro una distancia d
function inset(points: P[], d: number): P[] {
  const n = points.length;
  // Orientación (antihorario > 0)
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const sign = area > 0 ? 1 : -1;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const e1 = [p[0] - prev[0], p[1] - prev[1]];
    const e2 = [next[0] - p[0], next[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1;
    const l2 = Math.hypot(e2[0], e2[1]) || 1;
    const n1 = [(-e1[1] / l1) * sign, (e1[0] / l1) * sign];
    const n2 = [(-e2[1] / l2) * sign, (e2[0] / l2) * sign];
    const nx = n1[0] + n2[0];
    const ny = n1[1] + n2[1];
    const nl = Math.hypot(nx, ny) || 1;
    const cos = (n1[0] * nx + n1[1] * ny) / nl;
    const k = d / Math.max(0.35, cos);
    return [p[0] + (nx / nl) * k, p[1] + (ny / nl) * k] as P;
  });
}

// Perfil lateral de la carrocería
function bodyShape(s: CarSpec): THREE.Shape {
  const { L, wb, y0, beltF, belt, beltR, ws, rw } = s;
  const ar = s.wheelR + 0.1;
  const sh = new THREE.Shape();
  sh.moveTo(-L + 0.25, y0);
  sh.lineTo(-wb - ar, y0);
  sh.absarc(-wb, y0 - 0.03, ar, Math.PI, 0, true);
  sh.lineTo(wb - ar, y0);
  sh.absarc(wb, y0 - 0.03, ar, Math.PI, 0, true);
  sh.lineTo(L - 0.25, y0);
  sh.quadraticCurveTo(L, y0, L, y0 + 0.18);
  // Frente ligeramente inclinado y capó abombado
  sh.lineTo(L - 0.05, beltF - 0.12);
  sh.quadraticCurveTo(L - 0.08, beltF, L - 0.35, beltF + 0.03);
  sh.quadraticCurveTo(ws + 0.15, belt + 0.01, ws, belt);
  sh.lineTo(rw, belt);
  sh.quadraticCurveTo(-L + 0.35, belt, -L + 0.12, beltR);
  sh.quadraticCurveTo(-L + 0.02, beltR - 0.02, -L, beltR - 0.16);
  sh.lineTo(-L, y0 + 0.18);
  sh.quadraticCurveTo(-L, y0, -L + 0.25, y0);
  return sh;
}

// Puntos de la cabina (parabrisas, techo, vidrio trasero) como polígono convexo
function cabinPoints(s: CarSpec): P[] {
  const { belt, roof, ws, rf, rr, rw } = s;
  const pts: P[] = [[ws, belt - 0.06]];
  // Esquina delantera del techo redondeada
  const cf: P = [rf, roof];
  const a: P = [rf + (ws - rf) * 0.14, roof - (roof - belt) * 0.1];
  for (let t = 0; t <= 1.001; t += 0.25) {
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cf[0] + t * t * (rf - 0.18);
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cf[1] + t * t * roof;
    pts.push([x, y]);
  }
  // Esquina trasera
  const cr: P = [rr, roof];
  const b: P = [rr + (rw - rr) * 0.16, roof - (roof - belt) * 0.12];
  for (let t = 0; t <= 1.001; t += 0.25) {
    const x = (1 - t) * (1 - t) * (rr + 0.2) + 2 * (1 - t) * t * cr[0] + t * t * b[0];
    const y = (1 - t) * (1 - t) * roof + 2 * (1 - t) * t * cr[1] + t * t * b[1];
    pts.push([x, y]);
  }
  pts.push([rw, belt - 0.06]);
  return pts;
}

export class CarModel extends THREE.Group {
  readonly spec: CarSpec;
  private config: CarConfig;
  private body = new THREE.Group();
  private wheels: THREE.Group[] = [];
  private paint: THREE.MeshPhysicalMaterial;
  private rimMat: THREE.MeshStandardMaterial;
  private glass: THREE.MeshPhysicalMaterial;
  private sirenRed: THREE.MeshStandardMaterial | null = null;
  private sirenBlue: THREE.MeshStandardMaterial | null = null;
  private time = Math.random() * 10;
  private pulse = 0;
  private hop = 0;
  private bodyBaseY = 0;

  constructor(config: CarConfig) {
    super();
    this.config = { ...config };
    this.spec = carSpec(config.model);

    this.paint = new THREE.MeshPhysicalMaterial({ color: config.color, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
    this.rimMat = new THREE.MeshStandardMaterial({ color: config.rimColor, metalness: 0.9, roughness: 0.22 });
    this.glass = new THREE.MeshPhysicalMaterial({ color: 0x1b2a45, metalness: 0.1, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.6 });

    this.buildBody();
    this.add(this.body);
    this.buildWheels();

    const s = this.spec;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(s.L * 2 + 0.9, s.W + 0.9),
      new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    this.add(shadow);

    this.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== shadow) o.castShadow = true;
    });
    this.applyConfig();
  }

  setConfig(config: CarConfig): void {
    const rimChanged = config.rimStyle !== this.config.rimStyle;
    this.config = { ...config };
    if (rimChanged) this.buildRims();
    this.applyConfig();
  }

  // Gira las ruedas según la distancia recorrida
  roll(distance: number): void {
    for (const w of this.wheels) w.rotation.z -= distance / this.spec.wheelR;
  }

  // Puntos de interés para acercar la cámara (en coordenadas locales)
  focusPoint(area: 'wheel' | 'rear' | 'body'): THREE.Vector3 {
    const s = this.spec;
    if (area === 'wheel') return new THREE.Vector3(s.wb, s.wheelR + 0.1, s.W / 2);
    if (area === 'rear') return new THREE.Vector3(-s.L, s.belt, 0);
    return new THREE.Vector3(0, s.belt, 0);
  }

  bassPulse(strength: number): void {
    this.pulse = Math.max(this.pulse, 0.5 + strength * 0.5);
  }

  bounce(): void {
    this.hop = 1;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.sirenRed && this.sirenBlue) {
      // Destellos alternos rojo/azul
      const phase = Math.floor(this.time * 6) % 4;
      this.sirenRed.emissiveIntensity = phase === 0 || phase === 1 ? 3 : 0.15;
      this.sirenBlue.emissiveIntensity = phase === 2 || phase === 3 ? 3 : 0.15;
    }
    this.pulse = Math.max(0, this.pulse - dt * 4);
    this.hop = Math.max(0, this.hop - dt * 3.2);
    const hopY = Math.sin(this.hop * Math.PI) * 0.18;
    this.body.position.y = this.bodyBaseY + hopY - this.pulse * 0.05;
    this.body.scale.set(1 + this.pulse * 0.015, 1 + this.pulse * 0.03, 1 + this.pulse * 0.015);
  }

  private applyConfig(): void {
    const f = this.config.finish ?? 0;
    const p = this.paint;
    p.color.setHex(this.config.color);
    p.metalness = [0.25, 0, 0.75, 0.35][f];
    p.roughness = [0.32, 0.78, 0.3, 0.24][f];
    p.clearcoat = f === 1 ? 0 : 1;
    p.iridescence = f === 3 ? 1 : 0;
    p.iridescenceIOR = 1.35;
    p.sheen = f === 3 ? 0.6 : 0;
    p.needsUpdate = true;
    this.glass.color.setHex(GLASS_TINT[this.config.tint ?? 0]);
    this.rimMat.color.setHex(this.config.rimColor);
    this.bodyBaseY = -(DROP[this.config.rideHeight] ?? 0);
    this.body.position.y = this.bodyBaseY;
  }

  private buildBody(): void {
    const s = this.spec;
    const b = this.body;
    const halfW = s.W / 2;
    const xF = s.L + BEV; // cara delantera
    const xR = -s.L - BEV; // cara trasera

    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2028, roughness: 0.55 });
    const plastic = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.8 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 });
    const lamp = new THREE.MeshStandardMaterial({ color: 0xf6fbff, emissive: 0xdff1ff, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.3 });
    const drl = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 });
    const tail = new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0xff1a2a, emissiveIntensity: 0.7, roughness: 0.15 });
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.set(0, ry, rz);
      b.add(mesh);
      return mesh;
    };
    const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

    // ---------- Carrocería ----------
    b.add(new THREE.Mesh(extrude(bodyShape(s), s.W, BEVEL, 6), this.paint));

    // Guardabarros pronunciados sobre cada rueda
    const ar = s.wheelR + 0.1;
    for (const x of [-s.wb, s.wb]) {
      for (const side of [-1, 1]) {
        const flare = new THREE.Mesh(new THREE.TorusGeometry(ar + 0.03, 0.085, 10, 28, Math.PI), this.paint);
        flare.position.set(x, s.y0 - 0.03, side * (s.W / 2 - 0.05));
        flare.scale.z = 1.5;
        b.add(flare);
      }
    }

    // ---------- Cabina ----------
    const cab = cabinPoints(s);
    const cabW = s.W * s.cabinW;
    // Vidrio (bloque un poco hacia adentro)
    b.add(new THREE.Mesh(extrude(shapeFrom(inset(cab, 0.035)), cabW - 0.02, 0.06, 3), this.glass));
    // Marco lateral con el hueco de las ventanas
    const frame = shapeFrom(cab);
    const holePts = inset(cab, 0.075).map(([x, y]) => [x, Math.max(y, s.belt + 0.12)] as P);
    const hole = new THREE.Path();
    hole.moveTo(holePts[0][0], holePts[0][1]);
    holePts.slice(1).forEach(([x, y]) => hole.lineTo(x, y));
    hole.closePath();
    frame.holes.push(hole);
    for (const side of [-1, 1]) {
      const f = new THREE.Mesh(extrude(frame, 0.07, 0.022, 2), this.paint);
      f.position.z = side * (cabW / 2 - 0.02);
      b.add(f);
      // Pilar B (y pilar C en SUV)
      const pillarX = (s.rf + s.rr) / 2 + 0.05;
      add(new THREE.BoxGeometry(0.09, s.roof - s.belt, 0.06), dark, pillarX, (s.roof + s.belt) / 2, side * (cabW / 2 + 0.005));
      if (s.suv) add(new THREE.BoxGeometry(0.12, s.roof - s.belt - 0.08, 0.06), this.paint, s.rr + 0.15, (s.roof + s.belt) / 2, side * (cabW / 2 + 0.005));
      // Moldura de ventanas (cromada en lujo)
      if (s.chrome) add(new THREE.BoxGeometry(s.ws - s.rw - 0.3, 0.03, 0.03), chrome, (s.ws + s.rw) / 2, s.belt + 0.12, side * (cabW / 2 + 0.03));
    }
    // Techo
    const roofLen = s.rf - s.rr + 0.2;
    add(rbox(roofLen, 0.06, cabW + 0.03, 0.03), this.paint, (s.rf + s.rr) / 2, s.roof + 0.0, 0);
    if (s.sunroof) add(rbox(roofLen * 0.55, 0.03, cabW * 0.6, 0.015), this.glass, (s.rf + s.rr) / 2 + 0.05, s.roof + 0.035, 0);
    if (s.suv) {
      for (const z of [-cabW * 0.38, cabW * 0.38]) {
        add(rbox(roofLen - 0.2, 0.05, 0.06, 0.02), plastic, (s.rf + s.rr) / 2, s.roof + 0.1, z);
        for (const dx of [-roofLen / 2 + 0.25, roofLen / 2 - 0.25]) add(new THREE.BoxGeometry(0.08, 0.08, 0.06), plastic, (s.rf + s.rr) / 2 + dx, s.roof + 0.05, z);
      }
    }
    if (s.police) this.buildPolice(add, rbox, cabW);
    if (s.spoiler) add(rbox(0.22, 0.04, s.W * 0.8, 0.02), this.paint, -s.L + 0.08, s.beltR + 0.08, 0);

    // ---------- Frente ----------
    const fy = (s.beltF + s.y0) / 2 + 0.05;
    const gw = s.W * 0.48;
    if (s.grille === 'slim') {
      add(rbox(0.06, 0.07, gw, 0.03), dark, xF, s.beltF - 0.17, 0);
      add(rbox(0.06, 0.2, gw * 1.2, 0.05), dark, xF, s.y0 + 0.24, 0);
      add(rbox(0.07, 0.025, gw * 1.1, 0.01), chrome, xF + 0.005, s.y0 + 0.36, 0);
    } else if (s.grille === 'big') {
      add(rbox(0.06, 0.32, gw * 1.3, 0.08), dark, xF, s.y0 + 0.3, 0);
      for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.07, 0.02, gw * 1.2), plastic, xF + 0.01, s.y0 + 0.2 + i * 0.09, 0);
      add(rbox(0.06, 0.06, gw * 0.9, 0.03), chrome, xF, s.beltF - 0.16, 0);
    } else if (s.grille === 'wide') {
      add(rbox(0.06, 0.2, gw * 1.25, 0.06), dark, xF, s.beltF - 0.24, 0);
      add(rbox(0.07, 0.035, gw * 1.25, 0.015), chrome, xF + 0.005, s.beltF - 0.12, 0);
      add(rbox(0.06, 0.12, gw * 0.9, 0.05), dark, xF, s.y0 + 0.22, 0);
    } else if (s.grille === 'tiger') {
      add(rbox(0.06, 0.24, gw * 1.6, 0.1), dark, xF, s.y0 + 0.32, 0);
      add(rbox(0.07, 0.03, gw * 1.6, 0.012), chrome, xF + 0.005, s.y0 + 0.46, 0);
      add(rbox(0.06, 0.05, gw * 0.5, 0.02), dark, xF, s.beltF - 0.15, 0);
    } else {
      // Lujo: parrilla vertical con marco cromado y barras horizontales
      add(rbox(0.07, 0.34, gw * 0.95, 0.06), chrome, xF, fy + 0.02, 0);
      add(rbox(0.075, 0.28, gw * 0.85, 0.05), dark, xF + 0.004, fy + 0.02, 0);
      for (const dy of [-0.07, 0.03, 0.12]) add(new THREE.BoxGeometry(0.085, 0.022, gw * 0.85), chrome, xF + 0.006, fy + dy, 0);
      add(rbox(0.06, 0.1, gw * 1.4, 0.04), dark, xF, s.y0 + 0.18, 0);
      for (const z of [-halfW * 0.6, halfW * 0.6]) add(new THREE.BoxGeometry(0.07, 0.025, 0.3), chrome, xF + 0.004, s.y0 + 0.18, z);
    }
    // Faros
    for (const side of [-1, 1]) {
      const z = side * (halfW - 0.38);
      if (s.lights === 'slim') {
        add(rbox(0.06, 0.09, 0.5, 0.03), lamp, xF - 0.005, s.beltF - 0.17, z);
        add(new THREE.BoxGeometry(0.065, 0.018, 0.48), drl, xF, s.beltF - 0.135, z);
        // El faro envuelve un poco el costado
        add(rbox(0.32, 0.08, 0.05, 0.02), lamp, s.L - 0.08, s.beltF - 0.17, side * (halfW + 0.005));
      } else {
        add(rbox(0.06, 0.16, 0.44, 0.05), lamp, xF - 0.005, s.beltF - 0.2, z);
        add(new THREE.BoxGeometry(0.065, 0.02, 0.4), drl, xF, s.beltF - 0.27, z);
        add(rbox(0.28, 0.13, 0.05, 0.03), lamp, s.L - 0.06, s.beltF - 0.2, side * (halfW + 0.005));
      }
      // Antiniebla
      add(rbox(0.05, 0.06, 0.16, 0.02), lamp, xF, s.y0 + 0.24, side * (halfW - 0.25));
    }

    // ---------- Cola ----------
    if (s.tail === 'bar') {
      add(rbox(0.06, 0.07, s.W - 0.3, 0.03), tail, xR, s.beltR - 0.16, 0);
      for (const side of [-1, 1]) add(rbox(0.3, 0.09, 0.05, 0.02), tail, -s.L + 0.08, s.beltR - 0.16, side * (halfW + 0.005));
    } else {
      for (const side of [-1, 1]) {
        add(rbox(0.06, s.suv ? 0.34 : 0.15, 0.44, 0.04), tail, xR, s.suv ? s.beltR - 0.08 : s.beltR - 0.18, side * (halfW - 0.33));
        add(rbox(0.3, s.suv ? 0.3 : 0.13, 0.05, 0.03), tail, -s.L + 0.08, s.suv ? s.beltR - 0.08 : s.beltR - 0.18, side * (halfW + 0.005));
      }
    }
    add(rbox(0.06, 0.16, s.W * 0.75, 0.05), plastic, xR, s.y0 + 0.14, 0); // difusor
    for (const z of [-halfW * 0.5, halfW * 0.5]) {
      const tip = add(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 14), chrome, xR - 0.02, s.y0 + 0.1, z);
      tip.rotation.z = Math.PI / 2;
    }

    // Placas
    const plateMat = new THREE.MeshStandardMaterial({ map: plate('GL-' + s.id.slice(0, 3).toUpperCase()), roughness: 0.4 });
    const pf = add(new THREE.PlaneGeometry(0.42, 0.15), plateMat, xF + 0.045, s.y0 + (s.grille === 'luxury' ? 0.3 : 0.12), 0, Math.PI / 2);
    if (s.grille === 'big' || s.grille === 'tiger') pf.position.y = s.beltF - 0.32;
    add(new THREE.PlaneGeometry(0.42, 0.15), plateMat, xR - 0.035, s.beltR - (s.suv ? 0.42 : 0.36), 0, -Math.PI / 2);

    // ---------- Costados ----------
    for (const side of [-1, 1]) {
      const z = side * (halfW + 0.004);
      // Faldón
      add(rbox(s.wb * 2 - s.wheelR * 2 - 0.25, 0.1, 0.05, 0.02), s.suv ? plastic : dark, 0, s.y0 + 0.04, z);
      // Líneas de puertas
      for (const x of [s.ws - 0.05, (s.rf + s.rr) / 2 + 0.05, s.rr + 0.1]) {
        add(new THREE.BoxGeometry(0.012, s.belt - s.y0 - 0.12, 0.012), dark, x, (s.belt + s.y0) / 2 + 0.04, z);
      }
      // Manijas
      for (const x of [s.ws - 0.45, (s.rf + s.rr) / 2 - 0.4]) add(rbox(0.17, 0.035, 0.04, 0.015), s.chrome ? chrome : dark, x, s.belt - 0.12, z);
      // Espejos
      const mirror = add(rbox(0.16, 0.12, 0.2, 0.05), this.paint, s.ws - 0.08, s.belt + 0.08, side * (cabW / 2 + 0.16));
      mirror.castShadow = true;
      add(new THREE.BoxGeometry(0.1, 0.06, 0.12), plastic, s.ws - 0.04, s.belt + 0.02, side * (cabW / 2 + 0.07));
      // Revestimiento negro en los arcos (SUV)
      if (s.suv) {
        for (const x of [-s.wb, s.wb]) {
          const arch = add(new THREE.TorusGeometry(s.wheelR + 0.12, 0.05, 6, 20, Math.PI), plastic, x, s.y0 - 0.03, z);
          arch.scale.z = 0.8;
        }
      }
    }
  }

  // Barra de luces, defensa delantera y rotulación de patrulla (genérica)
  private buildPolice(
    add: (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry?: number) => THREE.Mesh,
    rbox: (w: number, h: number, d: number, r: number) => THREE.BufferGeometry,
    cabW: number,
  ): void {
    const s = this.spec;
    const x = (s.rf + s.rr) / 2;
    const black = new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.4 });
    this.sirenRed = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1a1a, emissiveIntensity: 2, roughness: 0.2 });
    this.sirenBlue = new THREE.MeshStandardMaterial({ color: 0x2a6bff, emissive: 0x1a5aff, emissiveIntensity: 2, roughness: 0.2 });
    add(rbox(0.32, 0.06, cabW * 0.95, 0.03), black, x, s.roof + 0.06, 0);
    add(rbox(0.26, 0.11, cabW * 0.42, 0.04), this.sirenRed, x, s.roof + 0.14, -cabW * 0.23);
    add(rbox(0.26, 0.11, cabW * 0.42, 0.04), this.sirenBlue, x, s.roof + 0.14, cabW * 0.23);
    // Defensa delantera (push bar)
    const xF = s.L + BEV;
    for (const z of [-0.28, 0.28]) add(rbox(0.06, 0.4, 0.07, 0.02), black, xF + 0.12, s.y0 + 0.3, z);
    add(rbox(0.06, 0.07, 0.75, 0.02), black, xF + 0.12, s.y0 + 0.44, 0);
    add(rbox(0.06, 0.07, 0.75, 0.02), black, xF + 0.12, s.y0 + 0.2, 0);
    // Puertas blancas con rótulo
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f4f6fa';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#1f6fff';
    g.fillRect(0, 118, 512, 14);
    g.fillStyle = '#15161c';
    g.font = '78px "Lilita One", "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('POLICÍA', 256, 66);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const decal = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
    const len = s.ws - s.rr - 0.1;
    const h = (s.belt - s.y0) * 0.72;
    for (const side of [-1, 1]) {
      const m = add(new THREE.PlaneGeometry(len, h), decal, (s.ws + s.rr) / 2 - 0.05, s.y0 + h / 2 + 0.1, side * (s.W / 2 + 0.012));
      if (side < 0) m.rotation.y = Math.PI;
    }
  }

  private buildWheels(): void {
    const s = this.spec;
    const R = s.wheelR;
    const pts: THREE.Vector2[] = [];
    const w = 0.17 + R * 0.06;
    pts.push(new THREE.Vector2(R * 0.66, -w));
    pts.push(new THREE.Vector2(R - 0.06, -w));
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + (i / 8) * Math.PI;
      pts.push(new THREE.Vector2(R - 0.06 + Math.cos(a) * 0.06, Math.sin(a) * w));
    }
    pts.push(new THREE.Vector2(R * 0.66, w));
    const tireGeo = new THREE.LatheGeometry(pts, 32);
    tireGeo.rotateX(Math.PI / 2);
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.85 });
    // Ruedas anchas que sobresalen un poco de la carrocería (estilo cartoon)
    const wz = s.W / 2 - w * 0.45;
    for (const x of [-s.wb, s.wb]) {
      for (const side of [-1, 1]) {
        const wheel = new THREE.Group();
        wheel.position.set(x, R, side * wz);
        wheel.add(new THREE.Mesh(tireGeo, rubber));
        wheel.userData.side = side;
        wheel.userData.w = w;
        this.wheels.push(wheel);
        this.add(wheel);
      }
    }
    this.buildRims();
  }

  private buildRims(): void {
    const style = this.config.rimStyle;
    const k = (this.spec.wheelR * 0.68) / 0.25; // escala del aro según la rueda
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.5, metalness: 0.4 });
    for (const wheel of this.wheels) {
      const old = wheel.getObjectByName('rim');
      if (old) wheel.remove(old);
      const rim = new THREE.Group();
      rim.name = 'rim';
      const side = wheel.userData.side as number;
      const face = (wheel.userData.w as number) - 0.01;
      rim.rotation.y = side < 0 ? Math.PI : 0;

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.255 * k, 0.255 * k, face * 2 - 0.02, 28), darkMat);
      barrel.rotation.x = Math.PI / 2;
      rim.add(barrel);
      const at = (m: THREE.Mesh, x: number, y: number, z: number) => {
        m.position.set(x, y, z);
        rim.add(m);
        return m;
      };

      if (style === 1) {
        at(new THREE.Mesh(new THREE.TorusGeometry(0.25 * k, 0.025 * k, 10, 36), this.rimMat), 0, 0, face);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const sp = at(new THREE.Mesh(new THREE.BoxGeometry(0.24 * k, 0.05 * k, 0.04), this.rimMat), Math.cos(a) * 0.12 * k, Math.sin(a) * 0.12 * k, face - 0.01);
          sp.rotation.z = a;
        }
      } else if (style === 2) {
        at(new THREE.Mesh(new THREE.TorusGeometry(0.232 * k, 0.05 * k, 12, 36), this.rimMat), 0, 0, face);
        const dish = at(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * k, 0.2 * k, 0.05, 28, 1, true), this.rimMat), 0, 0, face - 0.03);
        dish.rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.3;
          const sp = at(new THREE.Mesh(new THREE.BoxGeometry(0.2 * k, 0.065 * k, 0.04), this.rimMat), Math.cos(a) * 0.1 * k, Math.sin(a) * 0.1 * k, face - 0.06);
          sp.rotation.z = a;
        }
      } else {
        const disc = at(new THREE.Mesh(new THREE.CylinderGeometry(0.25 * k, 0.25 * k, 0.05, 32), this.rimMat), 0, 0, face - 0.01);
        disc.rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const h = at(new THREE.Mesh(new THREE.CylinderGeometry(0.045 * k, 0.045 * k, 0.06, 12), darkMat), Math.cos(a) * 0.15 * k, Math.sin(a) * 0.15 * k, face);
          h.rotation.x = Math.PI / 2;
        }
      }
      const cap = at(new THREE.Mesh(new THREE.CylinderGeometry(0.06 * k, 0.07 * k, 0.05, 16), this.rimMat), 0, 0, face + 0.02);
      cap.rotation.x = Math.PI / 2;
      rim.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      wheel.add(rim);
    }
  }
}
