// Estado del jugador y guardado local (localStorage)

export interface CarConfig {
  model: string; // id en data/cars.ts
  color: number;
  rimColor: number;
  rimStyle: number; // índice en RIM_STYLES
  rideHeight: number; // índice en SUSPENSION (0 = original)
  sound: number; // índice en SOUND (0 = original)
  finish: number; // índice en FINISHES (0 = brillante)
  tint: number; // índice en TINTS (0 = sin tinte)
}

export interface GameState {
  garageName: string;
  level: number;
  xp: number;
  money: number;
  respect: number;
  reputation: number; // 0 a 100
  car: CarConfig; // carro activo (en el elevador)
  ownedCars: CarConfig[]; // todos los carros del jugador (incluye el activo)
}

const SAVE_KEY = 'garage-lab-save-v1';

// SOLO PARA PRUEBAS: mientras corres "npm run dev", el dinero se rellena hasta esta cantidad
// cada vez que entras al taller. En la versión publicada (npm run build) no se aplica.
// Ponlo en 0 para desactivarlo.
export const DEV_TEST_MONEY = 587000;

export function createDefaultState(): GameState {
  return {
    garageName: 'Mi Taller',
    level: 1,
    xp: 0,
    money: 5000,
    respect: 0,
    reputation: 50,
    ownedCars: [],
    car: { model: 'nova', color: 0xe63946, rimColor: 0xd9dde3, rimStyle: 0, rideHeight: 0, sound: 0, finish: 0, tint: 0 },
  };
}

export function loadState(): GameState {
  const state = readSave();
  if (import.meta.env.DEV && state.money < DEV_TEST_MONEY) state.money = DEV_TEST_MONEY;
  return state;
}

function readSave(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const base = createDefaultState();
      // Mezclamos con los valores por defecto por si la partida es de una versión anterior
      const car = { ...base.car, ...(saved.car ?? {}) };
      const owned: CarConfig[] = (saved.ownedCars ?? [car]).map((c: CarConfig) => ({ ...base.car, ...c }));
      if (!owned.some((c) => c.model === car.model)) owned.push(car);
      return { ...base, ...saved, car, ownedCars: owned };
    }
  } catch {
    // Si el navegador bloquea el guardado, empezamos con una partida nueva
  }
  return createDefaultState();
}

export function saveState(state: GameState): void {
  // El carro activo se copia a la lista de carros del jugador
  const i = state.ownedCars.findIndex((c) => c.model === state.car.model);
  if (i >= 0) state.ownedCars[i] = { ...state.car };
  else state.ownedCars.push({ ...state.car });
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Ignorar: el juego sigue funcionando aunque no se pueda guardar
  }
}

// XP necesaria para pasar al siguiente nivel (valor provisional, se balanceará)
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 75;
}
