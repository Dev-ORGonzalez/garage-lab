// Catálogo de vehículos FICTICIOS de Garage LAB.
// Cada modelo es original: solo comparte el "tipo" y la silueta general con
// autos populares (sedán compacto, mediano, SUV, lujo). Sin marcas ni logotipos.

export type GrilleStyle = 'slim' | 'big' | 'wide' | 'tiger' | 'luxury';

export interface CarSpec {
  id: string;
  name: string;
  kind: string; // descripción corta para la tienda
  price: number;
  defaultColor: number;
  L: number; // medio largo
  W: number; // ancho total
  wb: number; // media distancia entre ejes
  wheelR: number;
  y0: number; // altura del borde inferior de la carrocería
  beltF: number; // altura del frente del capó
  belt: number; // línea de cintura (base de ventanas)
  beltR: number; // altura de la cola
  roof: number; // altura del techo
  ws: number; // x de la base del parabrisas
  rf: number; // x del inicio del techo
  rr: number; // x del final del techo
  rw: number; // x de la base del vidrio trasero
  cabinW: number; // ancho de la cabina (fracción)
  grille: GrilleStyle;
  lights: 'slim' | 'swept';
  tail: 'bar' | 'split';
  suv?: boolean;
  chrome?: boolean;
  sunroof?: boolean;
  spoiler?: boolean;
  police?: boolean;
}

export const CARS: CarSpec[] = [
  {
    id: 'nova', name: 'Nova', kind: 'Sedán compacto', price: 16500, defaultColor: 0xe63946,
    L: 2.05, W: 1.8, wb: 1.3, wheelR: 0.42, y0: 0.37, beltF: 0.8, belt: 0.98, beltR: 0.96, roof: 1.47,
    ws: 0.84, rf: -0.02, rr: -0.8, rw: -1.45, cabinW: 0.82, grille: 'big', lights: 'swept', tail: 'split',
  },
  {
    id: 'metro', name: 'Metro S', kind: 'Compacto deportivo', price: 18900, defaultColor: 0x9aa3ad,
    L: 2.1, W: 1.84, wb: 1.33, wheelR: 0.44, y0: 0.37, beltF: 0.76, belt: 0.96, beltR: 0.95, roof: 1.42,
    ws: 0.8, rf: -0.12, rr: -0.85, rw: -1.7, cabinW: 0.8, grille: 'slim', lights: 'slim', tail: 'split', spoiler: true,
  },
  {
    id: 'grandtour', name: 'Grand Tour', kind: 'Sedán mediano fastback', price: 27500, defaultColor: 0x1f3d8a,
    L: 2.3, W: 1.88, wb: 1.45, wheelR: 0.45, y0: 0.38, beltF: 0.8, belt: 1.0, beltR: 0.97, roof: 1.46,
    ws: 0.92, rf: -0.05, rr: -0.95, rw: -1.88, cabinW: 0.82, grille: 'wide', lights: 'slim', tail: 'bar',
  },
  {
    id: 'regal', name: 'Regal', kind: 'Sedán mediano', price: 26000, defaultColor: 0xf4f6fa,
    L: 2.28, W: 1.88, wb: 1.43, wheelR: 0.45, y0: 0.38, beltF: 0.82, belt: 1.0, beltR: 0.99, roof: 1.48,
    ws: 0.92, rf: 0.02, rr: -0.95, rw: -1.66, cabinW: 0.82, grille: 'big', lights: 'swept', tail: 'split',
  },
  {
    id: 'vento', name: 'Vento GT', kind: 'Sedán deportivo fastback', price: 25500, defaultColor: 0x8b1e2d,
    L: 2.3, W: 1.88, wb: 1.44, wheelR: 0.46, y0: 0.38, beltF: 0.76, belt: 0.97, beltR: 0.95, roof: 1.42,
    ws: 0.88, rf: -0.12, rr: -0.95, rw: -1.95, cabinW: 0.8, grille: 'tiger', lights: 'slim', tail: 'bar', spoiler: true,
  },
  {
    id: 'trailx', name: 'Trail X', kind: 'SUV compacta', price: 31000, defaultColor: 0x2b5c8a,
    L: 2.2, W: 1.94, wb: 1.38, wheelR: 0.52, y0: 0.52, beltF: 1.08, belt: 1.24, beltR: 1.22, roof: 1.9,
    ws: 1.02, rf: 0.22, rr: -1.75, rw: -2.05, cabinW: 0.88, grille: 'wide', lights: 'swept', tail: 'split', suv: true,
  },
  {
    id: 'luxe', name: 'Lux E', kind: 'Sedán de lujo', price: 52000, defaultColor: 0x23252d,
    L: 2.42, W: 1.9, wb: 1.5, wheelR: 0.46, y0: 0.39, beltF: 0.86, belt: 1.02, beltR: 1.0, roof: 1.5,
    ws: 0.84, rf: -0.08, rr: -1.05, rw: -1.72, cabinW: 0.82, grille: 'luxury', lights: 'slim', tail: 'split', chrome: true, sunroof: true,
  },
];

// Vehículos especiales que no se venden (aparecen en la ciudad)
export const SPECIAL_CARS: CarSpec[] = [
  {
    id: 'patrol', name: 'Patrulla', kind: 'Policía', price: 0, defaultColor: 0x16181e,
    L: 2.3, W: 1.9, wb: 1.44, wheelR: 0.45, y0: 0.38, beltF: 0.84, belt: 1.0, beltR: 0.99, roof: 1.48,
    ws: 0.9, rf: 0.02, rr: -0.95, rw: -1.66, cabinW: 0.82, grille: 'wide', lights: 'slim', tail: 'split', police: true,
  },
];

// Estilo "chibi" de juego social: carro corto y alto, ruedas grandes en las
// esquinas, cabina tipo burbuja. Se aplica a todas las fichas.
export function toonify(s: CarSpec): CarSpec {
  const kx = 0.78;
  const R = s.wheelR * 1.3;
  const L = s.L * kx;
  const y0 = R - 0.02;
  const ky = 0.95;
  const belt = y0 + (s.belt - s.y0) * ky;
  return {
    ...s,
    L,
    wheelR: R,
    wb: L - R - 0.16,
    y0,
    beltF: y0 + (s.beltF - s.y0) * ky,
    belt,
    beltR: y0 + (s.beltR - s.y0) * ky,
    roof: belt + (s.roof - s.belt) * 1.3,
    ws: s.ws * kx,
    rf: s.rf * kx,
    rr: s.rr * kx,
    rw: s.rw * kx,
    cabinW: Math.min(0.9, s.cabinW + 0.04),
  };
}

export function carSpec(id: string | undefined): CarSpec {
  const base = [...CARS, ...SPECIAL_CARS].find((c) => c.id === id) ?? CARS[0];
  return toonify(base);
}
