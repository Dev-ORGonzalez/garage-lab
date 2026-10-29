import * as THREE from 'three';
import { softShadow } from './textures';

export interface PersonLook {
  skin: number;
  shirt: number;
  pants: number;
  hair: number;
  cap?: number;
  shoes?: number;
}

// Personaje cartoon "chibi": cabeza grande y cuerpo pequeño.
// Más adelante: sistema modular de ropa, pelo y accesorios.
export class Person extends THREE.Group {
  private head = new THREE.Group();
  private bodyGroup = new THREE.Group();
  private armL: THREE.Object3D;
  private armR: THREE.Object3D;
  private phase = Math.random() * Math.PI * 2;
  private waveTime = 0;

  constructor(look: PersonLook) {
    super();
    const mat = (color: number, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });
    const skin = mat(look.skin, 0.55);
    const shirt = mat(look.shirt, 0.7);
    const pants = mat(look.pants, 0.8);
    const shoes = mat(look.shoes ?? 0x1a1a2e, 0.5);

    // Piernas y zapatos
    for (const x of [-0.11, 0.11]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 6, 12), pants);
      leg.position.set(x, 0.27, 0);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), shoes);
      shoe.scale.set(1, 0.6, 1.4);
      shoe.position.set(x, 0.06, 0.04);
      this.bodyGroup.add(leg, shoe);
    }

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.22, 8, 16), shirt);
    torso.position.y = 0.7;
    torso.scale.set(1, 1, 0.8);
    this.bodyGroup.add(torso);

    // Brazos
    const makeArm = (x: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.86, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 6, 12), shirt);
      arm.position.y = -0.17;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skin);
      hand.position.y = -0.36;
      pivot.add(arm, hand);
      pivot.rotation.z = x < 0 ? -0.12 : 0.12;
      this.bodyGroup.add(pivot);
      return pivot;
    };
    this.armL = makeArm(-0.27);
    this.armR = makeArm(0.27);

    // Cabeza grande
    this.head.position.y = 1.22;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), skin);
    this.head.add(skull);
    for (const x of [-0.12, 0.12]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat(0xffffff, 0.3));
      eye.position.set(x, 0.03, 0.29);
      eye.scale.set(0.9, 1.15, 0.5);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat(0x1a1a2e, 0.2));
      pupil.position.set(x, 0.02, 0.325);
      pupil.scale.set(1, 1.2, 0.5);
      this.head.add(eye, pupil);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 16, Math.PI), mat(0x7a2b2b, 0.5));
    smile.position.set(0, -0.11, 0.315);
    smile.rotation.z = Math.PI;
    this.head.add(smile);
    const ear = new THREE.SphereGeometry(0.07, 12, 10);
    for (const x of [-0.33, 0.33]) {
      const e = new THREE.Mesh(ear, skin);
      e.position.set(x, 0, 0);
      e.scale.set(0.6, 1, 0.8);
      this.head.add(e);
    }

    if (look.cap !== undefined) {
      const capMat = mat(look.cap, 0.5);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.355, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), capMat);
      dome.position.y = 0.04;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24, 1, false, -Math.PI / 2, Math.PI), capMat);
      brim.position.set(0, 0.1, 0.25);
      brim.scale.set(1.2, 1, 1.1);
      this.head.add(dome, brim);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), mat(look.hair, 0.8));
      hair.position.y = 0.03;
      hair.rotation.x = -0.25;
      this.head.add(hair);
    }
    this.bodyGroup.add(this.head);
    this.add(this.bodyGroup);

    this.bodyGroup.traverse((o) => ((o as THREE.Mesh).castShadow = true));

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    this.add(shadow);
  }

  lookAtPoint(x: number, z: number): void {
    this.rotation.y = Math.atan2(x - this.position.x, z - this.position.z);
  }

  wave(): void {
    this.waveTime = 1.6;
  }

  update(dt: number, t: number): void {
    const breathe = Math.sin(t * 2.2 + this.phase);
    this.bodyGroup.position.y = Math.max(0, breathe) * 0.02;
    this.head.rotation.z = Math.sin(t * 0.9 + this.phase) * 0.06;
    this.head.rotation.y = Math.sin(t * 0.5 + this.phase) * 0.25;
    this.armL.rotation.x = Math.sin(t * 2.2 + this.phase) * 0.05;

    if (this.waveTime > 0) {
      this.waveTime -= dt;
      this.armR.rotation.z = 2.6 + Math.sin(t * 14) * 0.35;
      this.bodyGroup.position.y += Math.abs(Math.sin(t * 7)) * 0.06;
    } else {
      this.armR.rotation.z = 0.12;
      this.armR.rotation.x = -Math.sin(t * 2.2 + this.phase) * 0.05;
    }
  }
}
