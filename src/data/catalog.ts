// Catálogo inicial de modificaciones (precios provisionales, se balancearán)

export interface ColorOption {
  name: string;
  value: number;
}

export interface TierOption {
  name: string;
  description: string;
  price: number;
}

export const PAINT_PRICE = 400;
export const PAINT_COLORS: ColorOption[] = [
  { name: 'Blanco', value: 0xf4f6fa },
  { name: 'Gris Plata', value: 0x9aa3ad },
  { name: 'Negro', value: 0x23252d },
  { name: 'Rojo Fuego', value: 0xe63946 },
  { name: 'Vino', value: 0x8b1e2d },
  { name: 'Naranja', value: 0xff8a00 },
  { name: 'Amarillo Racing', value: 0xffc21a },
  { name: 'Verde Neón', value: 0x2ecc71 },
  { name: 'Celeste', value: 0x4fc3ff },
  { name: 'Azul LAB', value: 0x1f6fff },
  { name: 'Morado', value: 0x8e44ad },
  { name: 'Rosa', value: 0xff6fae },
];

// Tipo de acabado de la pintura
export const FINISHES: TierOption[] = [
  { name: 'Brillante', description: 'Laca clásica', price: 0 },
  { name: 'Mate', description: 'Sin brillo', price: 300 },
  { name: 'Metálico', description: 'Destellos', price: 450 },
  { name: 'Perlado', description: 'Tornasol', price: 650 },
];

// Tintado de cristales
export const TINTS: TierOption[] = [
  { name: 'Sin tinte', description: 'Cristal de fábrica', price: 0 },
  { name: 'Claro', description: '35%', price: 150 },
  { name: 'Medio', description: '20%', price: 250 },
  { name: 'Oscuro', description: '5%', price: 350 },
];

export const RIM_STYLES: TierOption[] = [
  { name: 'Original', description: 'De fábrica', price: 0 },
  { name: 'Deportivo', description: '6 rayos', price: 900 },
  { name: 'Deep Dish', description: 'Labio ancho', price: 1200 },
];

export const RIM_COLOR_PRICE = 250;
export const RIM_COLORS: ColorOption[] = [
  { name: 'Plata', value: 0xd9dde3 },
  { name: 'Negro', value: 0x3a3d48 },
  { name: 'Dorado', value: 0xf2c14e },
  { name: 'Bronce', value: 0xc07a3a },
  { name: 'Blanco', value: 0xffffff },
];

export const SUSPENSION: TierOption[] = [
  { name: 'Original', description: 'Altura normal', price: 0 },
  { name: 'Deportiva', description: 'Un poco más baja', price: 500 },
  { name: 'Coilovers', description: 'Bien abajo', price: 900 },
];

export const SOUND: TierOption[] = [
  { name: 'Original', description: 'Radio de fábrica', price: 0 },
  { name: 'Básico', description: 'Bocinas + sub', price: 700 },
  { name: 'Pro', description: 'Amplificador + 2 subs', price: 1500 },
];
