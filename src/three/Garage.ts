import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { checkerFloor, hazardStripes, pegboard, shutter, sign, softShadow } from './textures';

// Taller tipo "diorama" (vista recortada estilo juego social):
// piso a cuadros, dos paredes, rótulo en el techo, dos bahías con elevador,
// sala de espera y utilería. Piso de x -6..6 y z -5..5.

const W = 12;
const D = 10;
const WALL_H = 4.6;
export const LIFT_TOP = 0.3;
// Bahía 1 (carro del jugador, a lo largo de X) y bahía 2 (cliente, a lo largo de Z)
export const BAY1 = { x: -1.0, z: 0.4 };
export const BAY2 = { x: 2.6, z: -1.8 };

const mat = (color: number, roughness = 0.6, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function box(w: number, h: number, d: number, m: THREE.Material, radius = 0): THREE.Mesh {
  const geo = radius > 0 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rotY = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = rotY;
  return o;
}

function shadowSpot(x: number, z: number, w: number, d: number, opacity = 0.55): THREE.Mesh {
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false, opacity }),
  );
  p.rotation.x = -Math.PI / 2;
  p.position.set(x, 0.008, z);
  return p;
}

export class Garage extends THREE.Group {
  private signMesh!: THREE.Mesh;

  constructor(garageName: string) {
    super();
    this.buildFloor();
    this.buildWalls();
    this.buildRoofSign(garageName);
    this.buildDoor();
    this.buildLift(BAY1.x, BAY1.z, false);
    this.buildLift(BAY2.x, BAY2.z, true);
    this.buildWorkArea();
    this.buildWaitingArea();
  }

  setName(name: string): void {
    const m = this.signMesh.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.map = sign(name.toUpperCase());
    m.needsUpdate = true;
  }

  private buildFloor(): void {
    const tex = checkerFloor();
    tex.repeat.set(W / 2.4, D / 2.4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, metalness: 0.08 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.004;
    floor.receiveShadow = true;
    this.add(floor);
    // Borde del piso del taller
    const edge = mat(0x0b1d4a, 0.5);
    this.add(at(box(W, 0.06, 0.12, edge), 0, 0.03, D / 2));
    this.add(at(box(0.12, 0.06, D, edge), W / 2, 0.03, 0));
  }

  private buildWalls(): void {
    const wall = mat(0xf3f5f9, 0.85);
    const lower = mat(0x1b2f63, 0.6);
    const blue = mat(0x1f6fff, 0.5);
    const yellow = mat(0xffc21a, 0.5);

    this.add(at(box(0.3, WALL_H, D + 0.3, wall), -W / 2 - 0.15, WALL_H / 2, -0.15));
    this.add(at(box(W, WALL_H, 0.3, wall), 0, WALL_H / 2, -D / 2 - 0.15));
    const trim = mat(0x0b1d4a, 0.6);
    this.add(at(box(0.42, 0.2, D + 0.42, trim), -W / 2 - 0.15, WALL_H + 0.1, -0.15));
    this.add(at(box(W + 0.1, 0.2, 0.42, trim), 0, WALL_H + 0.1, -D / 2 - 0.15));

    // Zócalo azul oscuro con franjas de la marca
    this.add(at(box(0.04, 1.1, D, lower), -W / 2 + 0.02, 0.55, 0));
    this.add(at(box(W, 1.1, 0.04, lower), 0, 0.55, -D / 2 + 0.02));
    this.add(at(box(0.05, 0.1, D, yellow), -W / 2 + 0.03, 1.15, 0));
    this.add(at(box(W, 0.1, 0.05, yellow), 0, 1.15, -D / 2 + 0.03));
    this.add(at(box(0.05, 0.12, D, blue), -W / 2 + 0.03, 1.3, 0));
    this.add(at(box(W, 0.12, 0.05, blue), 0, 1.3, -D / 2 + 0.03));

    // Ventana (pared izquierda)
    const frame = mat(0x0b1d4a, 0.5);
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fdcff, emissive: 0x6cc4ff, emissiveIntensity: 0.55, roughness: 0.1 });
    this.add(at(box(0.08, 1.8, 2.8, frame, 0.03), -W / 2 + 0.04, 2.85, -3.1));
    this.add(at(box(0.1, 1.55, 2.55, glass), -W / 2 + 0.06, 2.85, -3.1));
    this.add(at(box(0.12, 1.6, 0.08, frame), -W / 2 + 0.07, 2.85, -3.1));
    this.add(at(box(0.12, 0.08, 2.6, frame), -W / 2 + 0.07, 2.85, -3.1));

    // Lámparas de pared
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xffe9a0, emissiveIntensity: 1.2 });
    for (const x of [-3.8, 0.2, 4.4]) this.add(at(box(0.9, 0.16, 0.18, lampMat, 0.06), x, 4.15, -D / 2 + 0.1));
    for (const z of [-0.6, 2.4]) this.add(at(box(0.18, 0.16, 0.9, lampMat, 0.06), -W / 2 + 0.1, 4.15, z));
  }

  // Rótulo grande sobre la pared del fondo, con el ícono GL
  private buildRoofSign(garageName: string): void {
    const navy = mat(0x0b1d4a, 0.45, 0.2);
    const y = WALL_H + 1.05;
    const z = -D / 2 - 0.05;
    this.add(at(box(7.4, 1.7, 0.3, navy, 0.12), -0.6, y, z));
    // Patas del rótulo
    for (const x of [-3.4, 2.2]) this.add(at(box(0.18, 0.5, 0.18, navy), x, WALL_H + 0.1, z));
    this.signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.4),
      new THREE.MeshStandardMaterial({ map: sign(garageName.toUpperCase()), roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.12 }),
    );
    this.signMesh.position.set(0.25, y, z + 0.16);
    this.add(this.signMesh);

    // Insignia GL
    const badgeTex = new THREE.TextureLoader().load('apple-touch-icon.png');
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    const badge = new THREE.Mesh(
      new THREE.CircleGeometry(0.82, 40),
      new THREE.MeshStandardMaterial({ map: badgeTex, transparent: true, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.1, emissiveMap: badgeTex }),
    );
    badge.position.set(-3.45, y + 0.05, z + 0.2);
    this.add(badge);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.07, 10, 40), mat(0xffc21a, 0.35, 0.4));
    ring.position.copy(badge.position);
    this.add(ring);
  }

  private buildDoor(): void {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.4), new THREE.MeshStandardMaterial({ map: shutter(), roughness: 0.45, metalness: 0.4 }));
    door.position.set(BAY2.x, 1.7, -D / 2 + 0.05);
    door.receiveShadow = true;
    this.add(door);
    const frame = mat(0x3a4256, 0.5, 0.3);
    this.add(at(box(0.22, 3.6, 0.22, frame), BAY2.x - 1.9, 1.8, -D / 2 + 0.1));
    this.add(at(box(0.22, 3.6, 0.22, frame), BAY2.x + 1.9, 1.8, -D / 2 + 0.1));
    this.add(at(box(4.02, 0.32, 0.28, frame), BAY2.x, 3.55, -D / 2 + 0.12));
    const stripes = hazardStripes();
    stripes.repeat.set(4, 1);
    this.add(at(box(4.0, 0.14, 0.05, new THREE.MeshStandardMaterial({ map: stripes })), BAY2.x, 3.55, -D / 2 + 0.27));
  }

  // Elevador de plataforma con marco de seguridad
  private buildLift(cx: number, cz: number, alongZ: boolean): void {
    const g = new THREE.Group();
    const stripes = hazardStripes();
    stripes.repeat.set(6, 1);
    const stripeMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 });
    const len = 5.4;
    const wid = 2.9;
    const t = 0.16;
    g.add(at(box(len, 0.02, t, stripeMat), 0, 0.012, -wid / 2));
    g.add(at(box(len, 0.02, t, stripeMat), 0, 0.012, wid / 2));
    const s2 = stripes.clone();
    s2.repeat.set(3, 1);
    const sideMat = new THREE.MeshStandardMaterial({ map: s2, roughness: 0.5 });
    g.add(at(box(wid, 0.02, t, sideMat), -len / 2, 0.012, 0, Math.PI / 2));
    g.add(at(box(wid, 0.02, t, sideMat), len / 2, 0.012, 0, Math.PI / 2));

    const steel = mat(0x6b7486, 0.35, 0.6);
    const dark = mat(0x2f3747, 0.5, 0.4);
    const yellow = mat(0xffc21a, 0.4);
    g.add(at(box(4.5, 0.12, 2.2, dark, 0.04), 0, 0.06, 0));
    for (const dz of [-0.74, 0.74]) {
      g.add(at(box(4.3, 0.16, 0.5, steel, 0.04), 0, LIFT_TOP - 0.08, dz));
      g.add(at(box(0.25, 0.17, 0.52, yellow, 0.03), -2.15, LIFT_TOP - 0.08, dz));
      g.add(at(box(0.25, 0.17, 0.52, yellow, 0.03), 2.15, LIFT_TOP - 0.08, dz));
    }
    // Consola de control
    g.add(at(box(0.35, 1.2, 0.35, mat(0x1f6fff, 0.4), 0.06), 2.9, 0.6, -1.65));
    g.add(at(box(0.04, 0.35, 0.22, mat(0x1a1a2e, 0.3)), 3.08, 0.95, -1.65));
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 0.8 }));
    g.add(at(led, 3.11, 1.0, -1.65));

    g.position.set(cx, 0, cz);
    g.rotation.y = alongZ ? -Math.PI / 2 : 0;
    this.add(g);
  }

  private buildWorkArea(): void {
    // Tablero de herramientas + gabinete rojo (pared izquierda)
    const board = box(0.06, 1.5, 2.4, new THREE.MeshStandardMaterial({ map: pegboard(), roughness: 0.8 }));
    this.add(at(board, -W / 2 + 0.06, 2.75, 0.2));
    const tool = mat(0x8a93a3, 0.3, 0.8);
    const handle = mat(0xe63946, 0.5);
    [-0.7, -0.3, 0.1, 0.5, 0.9].forEach((z, i) => {
      const len = 0.45 + (i % 2) * 0.25;
      this.add(at(box(0.05, len, 0.08, tool, 0.02), -W / 2 + 0.12, 2.95 - (0.7 - len) / 2, z + 0.2));
      this.add(at(box(0.07, 0.2, 0.1, handle, 0.03), -W / 2 + 0.13, 2.95 - len / 2 - (0.7 - len) / 2 - 0.08, z + 0.2));
    });
    const red = new THREE.MeshPhysicalMaterial({ color: 0xe63946, roughness: 0.35, clearcoat: 0.6 });
    const chrome = mat(0xffffff, 0.15, 1);
    const cab = new THREE.Group();
    cab.add(at(box(0.9, 1.3, 2.3, red, 0.06), 0, 0.65, 0));
    for (let i = 0; i < 5; i++) {
      cab.add(at(box(0.04, 0.2, 2.1, mat(0xc92d3a, 0.4)), 0.46, 0.25 + i * 0.22, 0));
      cab.add(at(box(0.05, 0.04, 0.5, chrome, 0.015), 0.5, 0.25 + i * 0.22, 0));
    }
    cab.add(at(box(0.95, 0.06, 2.35, mat(0x2a2d3a, 0.5), 0.02), 0, 1.33, 0));
    this.add(at(cab, -W / 2 + 0.55, 0, 0.2));
    this.add(shadowSpot(-W / 2 + 0.7, 0.2, 2, 3));

    // Estante con cajas de piezas (pared del fondo)
    const shelf = new THREE.Group();
    const metal = mat(0x3a4256, 0.45, 0.5);
    for (const dx of [-1.05, 1.05]) for (const dz of [-0.28, 0.28]) shelf.add(at(box(0.07, 2.6, 0.07, metal), dx, 1.3, dz));
    const boxColors = [0x1f6fff, 0xffc21a, 0xe63946, 0x2ecc71, 0xff8a00];
    [0.35, 1.15, 1.95].forEach((y, row) => {
      shelf.add(at(box(2.2, 0.06, 0.65, metal), 0, y, 0));
      for (let i = 0; i < 3; i++) {
        const c = boxColors[(row * 2 + i) % boxColors.length];
        shelf.add(at(box(0.55, 0.45, 0.5, mat(c, 0.6), 0.04), -0.7 + i * 0.7, y + 0.26, 0));
      }
    });
    this.add(at(shelf, -3.9, 0, -D / 2 + 0.45));

    // Mesa de trabajo con prensa
    const wood = mat(0xc8894b, 0.6);
    const legs = mat(0x3a4256, 0.4, 0.5);
    const bench = new THREE.Group();
    bench.add(at(box(2.2, 0.12, 0.9, wood, 0.03), 0, 1.0, 0));
    for (const dx of [-1.0, 1.0]) for (const dz of [-0.35, 0.35]) bench.add(at(box(0.08, 1.0, 0.08, legs), dx, 0.5, dz));
    bench.add(at(box(2.0, 0.06, 0.7, legs), 0, 0.35, 0));
    bench.add(at(box(0.35, 0.25, 0.3, mat(0x1f6fff, 0.4, 0.3), 0.04), -0.6, 1.18, 0.1));
    bench.add(at(box(0.5, 0.3, 0.35, mat(0xe63946, 0.5), 0.04), 0.5, 1.21, -0.1));
    this.add(at(bench, -1.3, 0, -D / 2 + 0.6));

    // Tanques de aceite
    const drumMat = new THREE.MeshPhysicalMaterial({ color: 0x1f6fff, roughness: 0.35, clearcoat: 0.5 });
    const ring = mat(0x0b1d4a, 0.4);
    for (const [x, z] of [[-5.45, -4.4], [-5.45, -3.65]]) {
      const drum = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.05, 24), drumMat);
      body.position.y = 0.525;
      drum.add(body);
      for (const y of [0.3, 0.75]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.025, 8, 24), ring);
        r.rotation.x = Math.PI / 2;
        r.position.y = y;
        drum.add(r);
      }
      drum.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      this.add(at(drum, x, 0, z));
    }

    // Gomas apiladas junto a la puerta
    const tireGeo = new THREE.TorusGeometry(0.34, 0.15, 14, 28);
    const rubber = mat(0x1c1d22, 0.85);
    const stack = (x: number, z: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const t = new THREE.Mesh(tireGeo, rubber);
        t.rotation.x = Math.PI / 2;
        t.position.set(x + (i % 2) * 0.04, 0.15 + i * 0.29, z);
        t.castShadow = true;
        this.add(t);
      }
    };
    stack(5.35, -4.3, 4);
    stack(5.35, -3.45, 2);
    this.add(shadowSpot(5.3, -3.9, 1.8, 2.2));

    // Carrito de herramientas rojo
    const cart = new THREE.Group();
    cart.add(at(box(0.9, 0.9, 0.55, red, 0.05), 0, 0.55, 0));
    for (let i = 0; i < 3; i++) cart.add(at(box(0.7, 0.04, 0.03, chrome), 0, 0.35 + i * 0.25, 0.29));
    for (const dx of [-0.35, 0.35]) for (const dz of [-0.2, 0.2]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), mat(0x1a1a2e));
      w.rotation.x = Math.PI / 2;
      w.position.set(dx, 0.06, dz);
      cart.add(w);
    }
    this.add(at(cart, 4.75, 0, 0.3, -0.4));

    // Conos en la entrada
    const cone = mat(0xff7a1a, 0.5);
    const white = mat(0xffffff, 0.5);
    for (const [x, z] of [[5.6, 1.6], [5.6, 4.4]]) {
      const g = new THREE.Group();
      g.add(at(box(0.55, 0.06, 0.55, cone, 0.02), 0, 0.03, 0));
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 20), cone);
      c.position.y = 0.4;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.15, 0.12, 20), white);
      band.position.y = 0.45;
      g.add(c, band);
      g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      this.add(at(g, x, 0, z));
    }
  }

  // Sala de espera para clientes (mejora futura de satisfacción)
  private buildWaitingArea(): void {
    const g = new THREE.Group();
    // Alfombra
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), mat(0x1f6fff, 0.95));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-4.5, 0.012, 3.5);
    rug.receiveShadow = true;
    g.add(rug);
    const rugBorder = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.2), mat(0xffc21a, 0.95));
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.set(-4.5, 0.01, 3.5);
    g.add(rugBorder);

    // Sofá contra la pared izquierda
    const fabric = mat(0xe63946, 0.85);
    const sofa = new THREE.Group();
    sofa.add(at(box(0.85, 0.42, 2.4, fabric, 0.1), 0, 0.3, 0));
    sofa.add(at(box(0.25, 0.75, 2.4, fabric, 0.1), -0.32, 0.6, 0));
    sofa.add(at(box(0.85, 0.55, 0.22, fabric, 0.08), 0, 0.42, -1.2));
    sofa.add(at(box(0.85, 0.55, 0.22, fabric, 0.08), 0, 0.42, 1.2));
    for (const z of [-0.55, 0.55]) sofa.add(at(box(0.6, 0.14, 1.0, mat(0xff5a66, 0.85), 0.06), 0.08, 0.56, z));
    g.add(at(sofa, -5.45, 0, 3.5));

    // Mesa de centro
    g.add(at(box(0.8, 0.08, 1.3, mat(0x2a2d3a, 0.3, 0.2), 0.03), -4.3, 0.45, 3.5));
    for (const dz of [-0.5, 0.5]) g.add(at(box(0.6, 0.4, 0.06, mat(0x3a4256, 0.4, 0.5)), -4.3, 0.22, 3.5 + dz));
    g.add(at(box(0.3, 0.04, 0.22, mat(0x1f6fff, 0.6)), -4.3, 0.51, 3.3));

    // Plantas
    const pot = mat(0xf1f4f9, 0.6);
    const leaf = mat(0x3fae4a, 0.8);
    for (const [x, z] of [[-5.5, 1.85], [-5.5, 4.75]]) {
      const p = new THREE.Group();
      const potM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.45, 18), pot);
      potM.position.y = 0.225;
      p.add(potM);
      for (let i = 0; i < 6; i++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), leaf);
        const a = (i / 6) * Math.PI * 2;
        l.scale.set(0.5, 1.4, 0.5);
        l.position.set(Math.cos(a) * 0.14, 0.75, Math.sin(a) * 0.14);
        l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        p.add(l);
      }
      p.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      g.add(at(p, x, 0, z));
    }

    // TV en la pared
    g.add(at(box(0.08, 1.0, 1.7, mat(0x1a1a2e, 0.3), 0.04), -W / 2 + 0.05, 2.6, 3.5));
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.86),
      new THREE.MeshStandardMaterial({ color: 0x4fa3ff, emissive: 0x2f7bff, emissiveIntensity: 0.6, roughness: 0.2 }),
    );
    screen.rotation.y = Math.PI / 2;
    screen.position.set(-W / 2 + 0.1, 2.6, 3.5);
    g.add(screen);

    // Máquina de café / dispensadora
    g.add(at(box(0.8, 1.9, 0.75, mat(0xffc21a, 0.45), 0.06), -3.4, 0.95, 4.55));
    g.add(at(box(0.6, 0.9, 0.04, new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x6cc4ff, emissiveIntensity: 0.4 })), -3.4, 1.2, 4.94));

    this.add(g);
  }
}
