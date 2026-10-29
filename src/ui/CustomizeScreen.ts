import type { CarConfig, GameState } from '../core/GameState';
import { saveState } from '../core/GameState';
import { addXp, upgradeCost, xpForCost } from '../core/Economy';
import { playBassHit } from '../core/audio';
import {
  FINISHES, PAINT_COLORS, PAINT_PRICE, RIM_COLORS, RIM_COLOR_PRICE, RIM_STYLES, SOUND, SUSPENSION, TINTS,
} from '../data/catalog';
import type { ColorOption } from '../data/catalog';
import type { CarModel } from '../three/CarModel';
import { el, money, showToast } from './dom';
import { coin, icon, rimPreview } from './icons';
import type { IconName } from './icons';

type Category = 'paint' | 'rims' | 'suspension' | 'glass' | 'sound' | 'body' | 'lights' | 'interior';

const CATEGORIES: { id: Category; label: string; icon: IconName; locked?: boolean }[] = [
  { id: 'paint', label: 'Pintura', icon: 'brush' },
  { id: 'rims', label: 'Aros', icon: 'disc' },
  { id: 'suspension', label: 'Suspensión', icon: 'arrows' },
  { id: 'glass', label: 'Cristales', icon: 'window' },
  { id: 'sound', label: 'Sonido', icon: 'volume' },
  { id: 'body', label: 'Carrocería', icon: 'car', locked: true },
  { id: 'lights', label: 'Luces', icon: 'bulb', locked: true },
  { id: 'interior', label: 'Interior', icon: 'armchair', locked: true },
];

const GLASS_PREVIEW = ['#8fb0d3', '#4d6a8f', '#26354f', '#0b0f18'];
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

// Pantalla de personalización: categorías a la izquierda, opciones a la derecha
export class CustomizeScreen {
  private root: HTMLElement;
  private catMenu: HTMLElement;
  private panelTitle: HTMLElement;
  private content: HTMLElement;
  private costEl: HTMLElement;
  private applyBtn: HTMLButtonElement;
  private category: Category = 'paint';
  private draft: CarConfig;
  private state: GameState;
  private car: CarModel;
  private onPurchase: () => void;
  private onClose: () => void;
  private onCategory: (area: 'wheel' | 'rear' | 'body') => void;

  constructor(
    state: GameState,
    car: CarModel,
    onPurchase: () => void,
    onClose: () => void,
    onCategory: (area: 'wheel' | 'rear' | 'body') => void = () => undefined,
  ) {
    this.onCategory = onCategory;
    this.state = state;
    this.car = car;
    this.onPurchase = onPurchase;
    this.onClose = onClose;
    this.draft = { ...state.car };

    this.root = el('div', 'customize');
    this.catMenu = el('nav', 'cat-menu');

    const panel = el('aside', 'opt-panel');
    const header = el('header');
    this.panelTitle = el('h2');
    const close = el('button', 'close-btn');
    close.appendChild(icon('x', 26, 3.5));
    close.addEventListener('click', () => this.close());
    header.append(this.panelTitle, close);
    this.content = el('div', 'opt-content');
    const footer = el('footer');
    this.costEl = el('div', 'cost');
    this.applyBtn = el('button', 'btn green', 'APLICAR');
    this.applyBtn.addEventListener('click', () => this.apply());
    footer.append(this.costEl, this.applyBtn);
    panel.append(header, this.content, footer);

    const hint = el('div', 'drag-hint', 'Arrastra para girar el carro');
    this.root.append(this.catMenu, panel, hint);
    document.getElementById('app')!.appendChild(this.root);
    this.render();
  }

  private render(): void {
    // Categorías
    this.catMenu.innerHTML = '';
    for (const c of CATEGORIES) {
      const b = el('button', `cat${c.id === this.category ? ' active' : ''}${c.locked ? ' locked' : ''}`);
      b.appendChild(icon(c.icon, 22, 2.6));
      b.appendChild(el('span', '', c.label));
      if (c.locked) b.appendChild(icon('lock', 16, 2.6));
      b.addEventListener('click', () => {
        if (c.locked) return showToast(`${c.label}: se desbloquea en una próxima versión.`);
        this.category = c.id;
        // La cámara se acerca a la zona que se está modificando
        this.onCategory(c.id === 'rims' || c.id === 'suspension' ? 'wheel' : c.id === 'sound' ? 'rear' : 'body');
        this.render();
      });
      this.catMenu.appendChild(b);
    }

    // Opciones
    const sc = this.content.scrollTop;
    this.content.innerHTML = '';
    if (this.category === 'paint') this.renderPaint();
    if (this.category === 'rims') this.renderRims();
    if (this.category === 'suspension') this.renderSuspension();
    if (this.category === 'glass') this.renderGlass();
    if (this.category === 'sound') this.renderSound();
    this.content.scrollTop = sc;

    this.car.setConfig(this.draft);
    const cost = upgradeCost(this.state.car, this.draft);
    this.costEl.innerHTML = cost > 0
      ? `<small>Costo total</small><b class="${cost > this.state.money ? 'short' : ''}">${coin()} ${money(cost).replace('$', '')}</b>`
      : '<small>Costo total</small><b class="muted">Sin cambios</b>';
    this.applyBtn.disabled = cost === 0;
  }

  private section(title: string, right = ''): HTMLElement {
    const s = el('section');
    s.appendChild(el('div', 'sec-title', `<span>${title}</span>${right ? `<span class="sec-price">${right}</span>` : ''}`));
    this.content.appendChild(s);
    return s;
  }

  private colorGrid(parent: HTMLElement, colors: ColorOption[], selected: number, cols: number, onPick: (v: number) => void): void {
    const grid = el('div', 'color-grid');
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    for (const c of colors) {
      const b = el('button', `color${c.value === selected ? ' selected' : ''}`);
      b.style.setProperty('--c', hex(c.value));
      b.title = c.name;
      b.addEventListener('click', () => {
        onPick(c.value);
        this.render();
      });
      grid.appendChild(b);
    }
    parent.appendChild(grid);
  }

  private priceTag(price: number, installed: boolean): string {
    if (installed) return '<span class="tag installed">Instalado</span>';
    if (price === 0) return '<span class="tag">Gratis</span>';
    return `<span class="tag">${coin()} ${money(price).replace('$', '')}</span>`;
  }

  private renderPaint(): void {
    this.panelTitle.textContent = 'Pintura';
    const name = PAINT_COLORS.find((c) => c.value === this.draft.color)?.name ?? '';
    const s1 = this.section(`Color de pintura · ${name}`, `${coin()} ${PAINT_PRICE}`);
    this.colorGrid(s1, PAINT_COLORS, this.draft.color, 4, (v) => (this.draft.color = v));
    const s2 = this.section('Tipo de acabado');
    const grid = el('div', 'choice-grid two');
    FINISHES.forEach((f, i) => {
      const b = el('button', `choice${i === this.draft.finish ? ' selected' : ''}`, `<b>${f.name}</b>${this.priceTag(f.price, i === this.state.car.finish)}`);
      b.addEventListener('click', () => {
        this.draft.finish = i;
        this.render();
      });
      grid.appendChild(b);
    });
    s2.appendChild(grid);
  }

  private renderRims(): void {
    this.panelTitle.textContent = 'Aros';
    const s1 = this.section('Diseño');
    const grid = el('div', 'choice-grid three');
    RIM_STYLES.forEach((r, i) => {
      const b = el(
        'button',
        `choice rim${i === this.draft.rimStyle ? ' selected' : ''}`,
        `${rimPreview(i, hex(this.draft.rimColor))}<b>${r.name}</b>${this.priceTag(r.price, i === this.state.car.rimStyle)}`,
      );
      b.addEventListener('click', () => {
        this.draft.rimStyle = i;
        this.render();
      });
      grid.appendChild(b);
    });
    s1.appendChild(grid);
    const name = RIM_COLORS.find((c) => c.value === this.draft.rimColor)?.name ?? '';
    const s2 = this.section(`Color · ${name}`, `${coin()} ${RIM_COLOR_PRICE}`);
    this.colorGrid(s2, RIM_COLORS, this.draft.rimColor, 5, (v) => (this.draft.rimColor = v));
  }

  private renderSuspension(): void {
    this.panelTitle.textContent = 'Suspensión';
    const s = this.section('Altura de suspensión');
    const wrap = el('div', 'slider-wrap');
    const input = el('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(SUSPENSION.length - 1);
    input.step = '1';
    input.value = String(this.draft.rideHeight);
    input.addEventListener('input', () => {
      this.draft.rideHeight = Number(input.value);
      this.render();
    });
    const labels = el('div', 'slider-labels', '<span>Alta</span><span>Normal</span><span>Baja</span>');
    wrap.append(input, labels);
    s.appendChild(wrap);
    const s2 = this.section('Estilo');
    const grid = el('div', 'choice-grid three');
    SUSPENSION.forEach((o, i) => {
      const b = el('button', `choice${i === this.draft.rideHeight ? ' selected' : ''}`, `<b>${o.name}</b><small>${o.description}</small>${this.priceTag(o.price, i === this.state.car.rideHeight)}`);
      b.addEventListener('click', () => {
        this.draft.rideHeight = i;
        this.render();
      });
      grid.appendChild(b);
    });
    s2.appendChild(grid);
  }

  private renderGlass(): void {
    this.panelTitle.textContent = 'Cristales';
    const s = this.section('Nivel de tintado');
    const grid = el('div', 'choice-grid two');
    TINTS.forEach((t, i) => {
      const b = el(
        'button',
        `choice${i === this.draft.tint ? ' selected' : ''}`,
        `<span class="glass-swatch" style="--g:${GLASS_PREVIEW[i]}"></span><b>${t.name}</b><small>${t.description}</small>${this.priceTag(t.price, i === this.state.car.tint)}`,
      );
      b.addEventListener('click', () => {
        this.draft.tint = i;
        this.render();
      });
      grid.appendChild(b);
    });
    s.appendChild(grid);
    this.content.appendChild(el('p', 'note', 'Opción del juego: no representa normas reales de tintado.'));
  }

  private renderSound(): void {
    this.panelTitle.textContent = 'Sonido';
    const s = this.section('Equipo de sonido');
    SOUND.forEach((o, i) => {
      const row = el('button', `row${i === this.draft.sound ? ' selected' : ''}`);
      const ic = el('span', 'row-icon');
      ic.appendChild(icon(i === 0 ? 'volume' : 'speaker', 26, 2.4));
      row.append(ic, el('span', 'row-text', `<b>${o.name}</b><small>${o.description}</small>`));
      row.insertAdjacentHTML('beforeend', this.priceTag(o.price, i === this.state.car.sound));
      row.addEventListener('click', () => {
        this.draft.sound = i;
        this.render();
      });
      s.appendChild(row);
    });
    const test = el('button', 'btn blue wide', 'PROBAR SONIDO');
    test.addEventListener('click', () => this.testSound());
    this.content.appendChild(test);
  }

  private testSound(): void {
    const power = this.draft.sound;
    if (power === 0) return showToast('El radio de fábrica casi no suena… prueba Básico o Pro.');
    for (const t of [0, 0.45, 0.9, 1.125, 1.35]) {
      playBassHit(power, t);
      window.setTimeout(() => this.car.bassPulse(power), t * 1000);
    }
  }

  private apply(): void {
    const cost = upgradeCost(this.state.car, this.draft);
    if (cost === 0) return;
    if (cost > this.state.money) return showToast('No tienes suficiente dinero para esta modificación.');
    this.state.money -= cost;
    this.state.car = { ...this.draft };
    const xp = xpForCost(cost);
    const levels = addXp(this.state, xp);
    saveState(this.state);
    this.onPurchase();
    this.render();
    this.car.bounce();
    showToast(levels > 0 ? `¡Subiste a nivel ${this.state.level}! (+${xp} XP)` : `¡Modificación instalada! +${xp} XP`);
  }

  close(): void {
    this.car.setConfig(this.state.car);
    this.root.classList.add('closing');
    window.setTimeout(() => this.root.remove(), 200);
    this.onClose();
  }
}
