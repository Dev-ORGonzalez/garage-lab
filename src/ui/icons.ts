import {
  createElement, Armchair, ArrowDownUp, Car, ClipboardList, Disc3, Hammer, Lightbulb, Lock, Map as MapIcon, Paintbrush,
  PanelTop, PartyPopper, Plus, Settings, Speaker, Star, Store, Target, TrendingUp, Trophy, Users, Volume2, X,
} from 'lucide';

// Íconos (Lucide, licencia ISC) usados en la interfaz
const ICONS = {
  armchair: Armchair, arrows: ArrowDownUp, car: Car, clipboard: ClipboardList, disc: Disc3, hammer: Hammer,
  bulb: Lightbulb, lock: Lock, map: MapIcon, brush: Paintbrush, window: PanelTop, party: PartyPopper, plus: Plus,
  settings: Settings, speaker: Speaker, star: Star, store: Store, target: Target, trend: TrendingUp,
  trophy: Trophy, users: Users, volume: Volume2, x: X,
};

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 24, strokeWidth = 2.4): SVGElement {
  return createElement(ICONS[name], { width: size, height: size, 'stroke-width': strokeWidth }) as SVGElement;
}

// Moneda dorada (HTML) para precios
export function coin(): string {
  return '<span class="coin">$</span>';
}

// Vista previa SVG de cada diseño de aro
export function rimPreview(style: number, color: string): string {
  const spokes = (n: number, r: number, w: number, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + offset;
      return `<line x1="50" y1="50" x2="${50 + Math.cos(a) * r}" y2="${50 + Math.sin(a) * r}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
    }).join('');
  let inner = '';
  if (style === 1) {
    inner = `<circle cx="50" cy="50" r="30" fill="#15161c"/>${spokes(6, 29, 5, 0.3)}<circle cx="50" cy="50" r="30" fill="none" stroke="${color}" stroke-width="4"/>`;
  } else if (style === 2) {
    inner = `<circle cx="50" cy="50" r="33" fill="${color}"/><circle cx="50" cy="50" r="23" fill="#2a2d36"/>${spokes(5, 22, 5, 0.3)}`;
  } else {
    inner = `<circle cx="50" cy="50" r="28" fill="${color}"/>` +
      Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return `<circle cx="${50 + Math.cos(a) * 16}" cy="${50 + Math.sin(a) * 16}" r="5" fill="#2a2d36"/>`;
      }).join('');
  }
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#1c1d22"/><circle cx="50" cy="50" r="40" fill="#2a2c33"/>${inner}<circle cx="50" cy="50" r="6" fill="#1a1a2e"/></svg>`;
}
