import { FINISHES, PAINT_PRICE, RIM_COLOR_PRICE, RIM_STYLES, SOUND, SUSPENSION, TINTS } from '../data/catalog';
import { xpToNextLevel } from './GameState';
import type { CarConfig, GameState } from './GameState';

// Costo de pasar de la configuración actual a la nueva
export function upgradeCost(current: CarConfig, next: CarConfig): number {
  let cost = 0;
  if (next.color !== current.color) cost += PAINT_PRICE;
  if (next.rimStyle !== current.rimStyle) cost += RIM_STYLES[next.rimStyle].price;
  if (next.rimColor !== current.rimColor) cost += RIM_COLOR_PRICE;
  if (next.rideHeight !== current.rideHeight) cost += SUSPENSION[next.rideHeight].price;
  if (next.sound !== current.sound) cost += SOUND[next.sound].price;
  if (next.finish !== current.finish) cost += FINISHES[next.finish].price;
  if (next.tint !== current.tint) cost += TINTS[next.tint].price;
  return cost;
}

// XP que da una compra (provisional: 1 XP por cada $20)
export function xpForCost(cost: number): number {
  return Math.round(cost / 20);
}

// Suma XP y sube de nivel si corresponde. Devuelve cuántos niveles subió.
export function addXp(state: GameState, amount: number): number {
  state.xp += amount;
  let levelsGained = 0;
  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level += 1;
    levelsGained += 1;
  }
  return levelsGained;
}
