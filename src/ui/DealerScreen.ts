import * as THREE from 'three';
import type { CarConfig, GameState } from '../core/GameState';
import { createDefaultState, saveState } from '../core/GameState';
import { addXp } from '../core/Economy';
import { CARS, carSpec } from '../data/cars';
import { CarModel } from '../three/CarModel';
import { World } from '../three/World';
import { el, money, showToast } from './dom';
import { coin, icon } from './icons';

let thumbs: Record<string, string> | null = null;

// Fotos de los carros para la tienda (se generan una sola vez)
function getThumbs(): Record<string, string> {
  if (thumbs) return thumbs;
  thumbs = {};
  for (const spec of CARS) {
    const car = new CarModel({ ...createDefaultState().car, model: spec.id, color: spec.defaultColor });
    thumbs[spec.id] = World.renderPortrait(car, 130, {
      pos: new THREE.Vector3(4.6, 2.3, 5.4),
      look: new THREE.Vector3(0, 0.75, 0),
      fov: 30,
      w: 220,
    });
  }
  return thumbs;
}

// Concesionario: comprar carros nuevos y elegir cuál está en el elevador
export class DealerScreen {
  private root: HTMLElement;
  private list: HTMLElement;
  private actionBtn: HTMLButtonElement;
  private info: HTMLElement;
  private selected: string;
  private state: GameState;
  private onPreview: (config: CarConfig) => void;
  private onChange: () => void;
  private onClose: () => void;

  constructor(state: GameState, onPreview: (config: CarConfig) => void, onChange: () => void, onClose: () => void) {
    this.state = state;
    this.onPreview = onPreview;
    this.onChange = onChange;
    this.onClose = onClose;
    this.selected = state.car.model;

    this.root = el('div', 'customize');
    const panel = el('aside', 'opt-panel dealer');
    const header = el('header', '', '<h2>Concesionario</h2>');
    const close = el('button', 'close-btn');
    close.appendChild(icon('x', 26, 3.5));
    close.addEventListener('click', () => this.close());
    header.appendChild(close);
    this.list = el('div', 'opt-content');
    const footer = el('footer');
    this.info = el('div', 'cost');
    this.actionBtn = el('button', 'btn green', '');
    this.actionBtn.addEventListener('click', () => this.action());
    footer.append(this.info, this.actionBtn);
    panel.append(header, this.list, footer);
    this.root.append(panel, el('div', 'drag-hint', 'Arrastra para girar el carro'));
    document.getElementById('app')!.appendChild(this.root);
    this.render();
  }

  private owned(id: string): CarConfig | undefined {
    return this.state.ownedCars.find((c) => c.model === id);
  }

  private render(): void {
    const t = getThumbs();
    const sc = this.list.scrollTop;
    this.list.innerHTML = '';
    for (const spec of CARS) {
      const own = this.owned(spec.id);
      const active = this.state.car.model === spec.id;
      const card = el('button', `car-card${spec.id === this.selected ? ' selected' : ''}`);
      const badge = active ? '<span class="badge-tag active">En uso</span>' : own ? '<span class="badge-tag owned">Tuyo</span>' : '';
      card.innerHTML = `
        <img src="${t[spec.id]}" alt="${spec.name}">
        <div class="car-info"><b>${spec.name}</b><small>${spec.kind}</small>
        ${own ? '' : `<span class="tag">${coin()} ${money(spec.price).replace('$', '')}</span>`}</div>${badge}`;
      card.addEventListener('click', () => {
        this.selected = spec.id;
        this.onPreview(own ?? { ...createDefaultState().car, model: spec.id, color: spec.defaultColor });
        this.render();
      });
      this.list.appendChild(card);
    }
    this.list.scrollTop = sc;

    const spec = carSpec(this.selected);
    const own = this.owned(spec.id);
    const active = this.state.car.model === spec.id;
    this.info.innerHTML = own
      ? `<small>${spec.kind}</small><b>${spec.name}</b>`
      : `<small>${spec.name} · ${spec.kind}</small><b class="${spec.price > this.state.money ? 'short' : ''}">${coin()} ${money(spec.price).replace('$', '')}</b>`;
    this.actionBtn.disabled = active;
    this.actionBtn.textContent = active ? 'EN USO' : own ? 'USAR ESTE' : 'COMPRAR';
  }

  private action(): void {
    const spec = carSpec(this.selected);
    let own = this.owned(spec.id);
    if (!own) {
      if (this.state.money < spec.price) return showToast('No tienes suficiente dinero para este carro.');
      this.state.money -= spec.price;
      own = { ...createDefaultState().car, model: spec.id, color: spec.defaultColor };
      this.state.ownedCars.push(own);
      const levels = addXp(this.state, Math.round(spec.price / 200));
      showToast(levels > 0 ? `¡Compraste el ${spec.name}! Subiste a nivel ${this.state.level}.` : `¡Compraste el ${spec.name}!`);
    } else {
      showToast(`El ${spec.name} está ahora en tu elevador.`);
    }
    saveState(this.state); // guarda el carro actual antes de cambiar
    this.state.car = { ...own };
    saveState(this.state);
    this.onChange();
    this.render();
  }

  close(): void {
    this.root.classList.add('closing');
    window.setTimeout(() => this.root.remove(), 200);
    this.onClose();
  }
}
