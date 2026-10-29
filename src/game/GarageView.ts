import * as THREE from 'three';
import { loadState, saveState } from '../core/GameState';
import type { GameState } from '../core/GameState';
import { World } from '../three/World';
import { BAY1, BAY2, Garage, LIFT_TOP } from '../three/Garage';
import { City } from '../three/City';
import { CarModel } from '../three/CarModel';
import { Person } from '../three/Person';
import type { PersonLook } from '../three/Person';
import { Hud, iconMenu } from '../ui/Hud';
import { CustomizeScreen } from '../ui/CustomizeScreen';
import { DealerScreen } from '../ui/DealerScreen';
import type { CarConfig } from '../core/GameState';
import { el, showToast } from '../ui/dom';

interface Worker {
  name: string;
  role: string;
  line: string;
  look: PersonLook;
  x: number;
  z: number;
  owner?: boolean;
}

const OWNER_LOOK: PersonLook = { skin: 0xc68642, shirt: 0x23252d, pants: 0x3a4256, hair: 0x2a1a10, cap: 0x1a1a2e, shoes: 0xf4f6fa };

const WORKERS: Worker[] = [
  { name: 'Tú', role: 'Dueño', line: '¡Este taller va a ser el mejor de la ciudad!', x: 2.2, z: 2.9, owner: true, look: OWNER_LOOK },
  { name: 'Luis', role: 'Mecánico', line: 'Luis: ¡Listo para trabajar, jefe!', x: -3.9, z: 1.9,
    look: { skin: 0xf1c27d, shirt: 0x1f6fff, pants: 0x1f3d8a, hair: 0x3b2314, cap: 0x1f6fff } },
  { name: 'Carla', role: 'Pintura', line: 'Carla: ¿Qué color le ponemos hoy?', x: 4.6, z: -2.6,
    look: { skin: 0x8d5524, shirt: 0xff8a00, pants: 0x1f3d8a, hair: 0x111111 } },
];

// Controla la vista del taller: mundo 3D + interfaz
export class GarageView {
  private state: GameState;
  private world: World;
  private hud: Hud;
  private car: CarModel;
  private custom: CustomizeScreen | DealerScreen | null = null;
  private carSlot = new THREE.Group();
  private ui: HTMLElement[] = [];
  private carSpin = 0;

  constructor(container: HTMLElement, onExit: () => void) {
    this.state = loadState();
    saveState(this.state);

    this.world = new World(container);
    const city = new City();
    const garage = new Garage(this.state.garageName);
    this.world.scene.add(city, garage);
    this.world.onUpdate((dt) => city.update(dt));

    // Carro del jugador en la bahía 1 (dentro de un "soporte" que se puede girar)
    this.carSlot.position.set(BAY1.x, LIFT_TOP, BAY1.z);
    this.world.scene.add(this.carSlot);
    this.car = this.showCar(this.state.car);
    this.world.onUpdate((dt) => {
      this.car.update(dt);
      // Al cerrar la personalización el carro vuelve a su orientación
      if (!this.custom) this.carSpin *= Math.exp(-dt * 6);
      this.carSlot.rotation.y = this.carSpin;
    });
    this.world.addClickable(this.carSlot, () => this.openCustomize());

    // Carro de un cliente en la bahía 2 y dos estacionados afuera
    this.addParkedCar(BAY2.x, LIFT_TOP, BAY2.z, -Math.PI / 2, { model: 'luxe', color: 0xf4f6fa, rimColor: 0x3a3d48, rimStyle: 1, rideHeight: 1, sound: 0, finish: 3, tint: 2 });
    this.addParkedCar(-3.8, 0, 7.6, Math.PI / 2, { model: 'trailx', color: 0x2b5c8a, rimColor: 0x23252d, rimStyle: 0, rideHeight: 0, sound: 0, finish: 2, tint: 3 });
    this.addParkedCar(-1.0, 0, 7.6, Math.PI / 2, { model: 'vento', color: 0xffc21a, rimColor: 0x23252d, rimStyle: 2, rideHeight: 2, sound: 0, finish: 0, tint: 3 });
    this.addParkedCar(1.8, 0, 7.6, Math.PI / 2, { model: 'metro', color: 0x4fc3ff, rimColor: 0xd9dde3, rimStyle: 1, rideHeight: 1, sound: 0, finish: 0, tint: 1 });

    // Personajes
    for (const w of WORKERS) {
      const p = new Person(w.look);
      p.position.set(w.x, 0, w.z);
      p.lookAtPoint(w.x + 6, w.z + 6);
      this.world.scene.add(p);
      this.world.onUpdate((dt, t) => p.update(dt, t));
      this.world.addLabel(p, `${w.name}<small>${w.role}</small>`, 1.85);
      this.world.addClickable(p, () => {
        p.wave();
        showToast(w.line);
      });
    }

    // Interfaz
    this.hud = new Hud(() => {
      saveState(this.state);
      this.destroy();
      onExit();
    });
    this.hud.update(this.state);
    const portrait = new Person(OWNER_LOOK);
    this.hud.setAvatar(World.renderPortrait(portrait));

    const soon = (what: string) => () => showToast(`${what}: ¡próximamente!`);
    const side = iconMenu('side-menu', [
      { label: 'Misiones', icon: 'target', color: '#ff8a00', onClick: soon('Misiones') },
      { label: 'Tienda', icon: 'store', color: '#1f6fff', onClick: soon('Tienda') },
      { label: 'Logros', icon: 'trophy', color: '#f2b600', onClick: soon('Logros') },
      { label: 'Eventos', icon: 'party', color: '#e63946', onClick: soon('Eventos') },
    ]);
    const dock = iconMenu('dock', [
      { label: 'Servicios', icon: 'clipboard', color: '#22b14c', onClick: soon('Servicios') },
      { label: 'Modificar', icon: 'brush', color: '#ff8a00', onClick: () => this.openCustomize() },
      { label: 'Autos', icon: 'car', color: '#e63946', onClick: () => this.openDealer() },
      { label: 'Mejoras', icon: 'hammer', color: '#8e44ad', onClick: soon('Mejoras') },
      { label: 'Empleados', icon: 'users', color: '#1f6fff', onClick: soon('Empleados') },
      { label: 'Mapa', icon: 'map', color: '#13a3a3', onClick: soon('Mapa') },
    ]);
    const zoom = el('div', 'zoom');
    const zin = el('button', 'round-btn', '+');
    const zout = el('button', 'round-btn', '−');
    zin.addEventListener('click', () => this.world.zoomBy(1.2));
    zout.addEventListener('click', () => this.world.zoomBy(1 / 1.2));
    zoom.append(zin, zout);

    this.ui = [this.hud.root, side, dock, zoom];
    document.getElementById('app')!.append(...this.ui);
    showToast(`¡Bienvenido a ${this.state.garageName}! Toca tu carro para modificarlo.`);
  }

  // Coloca un carro en el elevador (reemplaza al anterior)
  private showCar(config: CarConfig): CarModel {
    this.carSlot.clear();
    const car = new CarModel(config);
    this.carSlot.add(car);
    this.car = car;
    return car;
  }

  private focusCar(): void {
    document.body.classList.add('customizing');
    const target = new THREE.Vector3(BAY1.x, 0.9, BAY1.z).addScaledVector(this.world.cameraRight(), 1.3);
    this.world.focusOn(target, 2.4, (dx) => (this.carSpin += dx * 0.012));
  }

  // Acerca la cámara a una zona del carro (rueda, parte trasera o carrocería)
  private focusArea(area: 'wheel' | 'rear' | 'body'): void {
    if (area === 'body') return this.focusCar();
    this.carSlot.updateMatrixWorld(true);
    const p = this.car.localToWorld(this.car.focusPoint(area));
    const zoom = area === 'wheel' ? 4.2 : 3.4;
    const target = p.addScaledVector(this.world.cameraRight(), (1.3 * 2.4) / zoom);
    this.world.focusOn(target, zoom, (dx) => (this.carSpin += dx * 0.012));
  }

  private unfocus(): void {
    this.custom = null;
    this.carSpin = Math.atan2(Math.sin(this.carSpin), Math.cos(this.carSpin));
    document.body.classList.remove('customizing');
    this.world.clearFocus();
  }

  private openDealer(): void {
    if (this.custom) return;
    this.focusCar();
    this.custom = new DealerScreen(
      this.state,
      (config) => this.showCar(config).bounce(),
      () => this.hud.update(this.state),
      () => {
        // Al salir, en el elevador queda el carro activo
        if (this.car.spec.id !== this.state.car.model) this.showCar(this.state.car);
        this.unfocus();
      },
    );
  }

  private addParkedCar(x: number, y: number, z: number, rotY: number, config: ConstructorParameters<typeof CarModel>[0]): void {
    const c = new CarModel(config);
    c.position.set(x, y, z);
    c.rotation.y = rotY;
    this.world.scene.add(c);
  }

  private openCustomize(): void {
    if (this.custom) return;
    this.car.bounce();
    this.focusCar();
    this.custom = new CustomizeScreen(
      this.state,
      this.car,
      () => this.hud.update(this.state),
      () => this.unfocus(),
      (area) => this.focusArea(area),
    );
  }

  private destroy(): void {
    this.custom?.close();
    this.ui.forEach((e) => e.remove());
    this.world.dispose();
  }
}
