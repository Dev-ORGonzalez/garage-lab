import { xpToNextLevel } from '../core/GameState';
import type { GameState } from '../core/GameState';
import { el, money, showToast } from './dom';
import { coin, icon } from './icons';
import type { IconName } from './icons';

// Barra superior: perfil (avatar, taller, nivel) y monedas
export class Hud {
  readonly root: HTMLElement;
  private avatar: HTMLImageElement;
  private name: HTMLElement;
  private levelLabel: HTMLElement;
  private xpFill: HTMLElement;
  private xpText: HTMLElement;
  private moneyText: HTMLElement;
  private respectText: HTMLElement;
  private repText: HTMLElement;

  constructor(onExit: () => void) {
    this.root = el('div', 'topbar');

    const profile = el('div', 'profile');
    this.avatar = el('img', 'avatar');
    this.avatar.alt = 'Avatar';
    const info = el('div', 'profile-info');
    this.name = el('div', 'garage-name');
    const pill = el('div', 'level-pill');
    this.levelLabel = el('span', 'level-label');
    const bar = el('div', 'level-bar');
    this.xpFill = el('div', 'level-fill');
    this.xpText = el('span', 'level-xp');
    bar.append(this.xpFill, this.xpText);
    pill.append(this.levelLabel, bar);
    info.append(this.name, pill);
    profile.append(this.avatar, info);

    const right = el('div', 'currencies');
    const moneyPill = el('div', 'currency', coin());
    this.moneyText = el('span');
    const add = el('button', 'plus');
    add.appendChild(icon('plus', 16, 3.5));
    add.addEventListener('click', () => showToast('Tienda de monedas: próximamente.'));
    moneyPill.append(this.moneyText, add);

    const stat = (iconName: IconName, cls: string, title: string) => {
      const p = el('div', `currency ${cls}`);
      p.title = title;
      const i = el('span', 'stat-icon');
      i.appendChild(icon(iconName, 18, 3));
      const t = el('span');
      p.append(i, t);
      right.appendChild(p);
      return t;
    };
    right.appendChild(moneyPill);
    this.respectText = stat('star', 'respect', 'Respeto');
    this.repText = stat('trend', 'rep', 'Reputación');

    // Configuración
    const gear = el('button', 'icon-btn');
    gear.appendChild(icon('settings', 24, 2.6));
    const dropdown = el('div', 'dropdown');
    const exit = el('button', '', 'Salir al menú principal');
    exit.addEventListener('click', onExit);
    dropdown.appendChild(exit);
    gear.addEventListener('click', () => dropdown.classList.toggle('open'));
    const gearWrap = el('div', 'gear-wrap');
    gearWrap.append(gear, dropdown);
    right.appendChild(gearWrap);

    this.root.append(profile, right);
  }

  setAvatar(url: string): void {
    this.avatar.src = url;
  }

  update(state: GameState): void {
    const needed = xpToNextLevel(state.level);
    this.name.textContent = state.garageName;
    this.levelLabel.textContent = `Nivel ${state.level}`;
    this.xpFill.style.width = `${Math.min(100, (state.xp / needed) * 100)}%`;
    this.xpText.textContent = `${state.xp} / ${needed}`;
    this.moneyText.textContent = money(state.money).replace('$', '');
    this.respectText.textContent = String(state.respect);
    this.repText.textContent = `${state.reputation}%`;
  }
}

export interface MenuItem {
  label: string;
  icon: IconName;
  color: string;
  onClick: () => void;
}

// Fila o columna de botones con ícono (menú lateral y barra inferior)
export function iconMenu(className: string, items: MenuItem[]): HTMLElement {
  const wrap = el('nav', className);
  for (const item of items) {
    const b = el('button', 'tile');
    b.style.setProperty('--tile', item.color);
    const ic = el('span', 'tile-icon');
    ic.appendChild(icon(item.icon, 30, 2.4));
    b.append(ic, el('span', 'tile-label', item.label));
    b.addEventListener('click', item.onClick);
    wrap.appendChild(b);
  }
  return wrap;
}
