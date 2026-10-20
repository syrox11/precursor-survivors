import type { Rng } from './rng';

/** Light Jak and Dark Jak: two separate eco meters, each fills on its own and powers its own form. */

export type EcoMode = 'light' | 'dark';
export type AbilityId =
  | 'heal' | 'timeStop' | 'shield' | 'wings'
  | 'darkBomb' | 'darkBlast' | 'invisibility' | 'darkStrike';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  /** Meter spent. The Dark Bomb spends whatever is left, but needs at least this much. */
  cost: number;
  description: string;
  /** Spends the rest of the meter and leaves the form. */
  endsForm?: boolean;
}

export const METER_MAX = 100;
/** A full meter lasts this long once the form is active, before abilities eat into it. */
export const FORM_SECONDS = 20;
export const WISP_VALUE = 6;
export const CHEST_ECO = 40;

/** Chance per regular kill to drop an eco wisp of each colour. Bosses always drop BOSS_WISPS of each. */
export const WISP_CHANCE: Record<EcoMode, number> = { light: 0.04, dark: 0.05 };
export const BOSS_WISPS = 4;

/** Abilities in key order: index 0 is key 1. */
export const ABILITIES: Record<EcoMode, AbilityDef[]> = {
  light: [
    { id: 'heal', name: 'Heal', cost: 25, description: 'Restore half your health' },
    { id: 'timeStop', name: 'Flash Freeze', cost: 30, description: 'Freeze every enemy for 4s' },
    { id: 'shield', name: 'Light Shield', cost: 30, description: 'Take no damage for 5s' },
    { id: 'wings', name: 'Light Flight', cost: 20, description: '+80% speed for 6s' },
  ],
  dark: [
    { id: 'darkBomb', name: 'Dark Bomb', cost: 40, description: 'Huge blast around you; ends Dark Jak', endsForm: true },
    { id: 'darkBlast', name: 'Dark Blast', cost: 30, description: 'Dark lightning jumps between enemies for 6s' },
    { id: 'invisibility', name: 'Invisibility', cost: 25, description: 'Enemies lose you for 6s' },
    { id: 'darkStrike', name: 'Dark Strike', cost: 33, description: 'Charge and fire a wave straight ahead' },
  ],
};

export const LIGHT_DAMAGE_TAKEN = 0.5;
export const DARK_DAMAGE_BONUS = 1.3;

export const ABILITY_TUNING = {
  healShare: 0.5,
  timeStopSeconds: 4,
  shieldSeconds: 5,
  wingsSeconds: 6,
  wingsSpeed: 1.8,
  darkBlastSeconds: 6,
  invisibilitySeconds: 6,
  darkStrikeCharge: 0.5,
};

export interface EcoState {
  light: number;
  dark: number;
  /** The form Jak is in, if any. Only one at a time. */
  active: EcoMode | null;
}

export const EMPTY_ECO: EcoState = { light: 0, dark: 0, active: null };

export function abilityOf(mode: EcoMode, id: AbilityId): AbilityDef | undefined {
  return ABILITIES[mode].find((a) => a.id === id);
}

export function addEco(state: EcoState, mode: EcoMode, amount: number): EcoState {
  return { ...state, [mode]: Math.min(METER_MAX, state[mode] + amount) };
}

export function canTransform(state: EcoState, mode: EcoMode): boolean {
  return state.active === null && state[mode] >= METER_MAX;
}

export function transform(state: EcoState, mode: EcoMode): EcoState {
  return canTransform(state, mode) ? { ...state, active: mode } : state;
}

/** Drains the active meter; the form ends when it runs dry. */
export function drain(state: EcoState, dt: number): EcoState {
  if (!state.active) return state;
  const left = Math.max(0, state[state.active] - (METER_MAX / FORM_SECONDS) * dt);
  return { ...state, [state.active]: left, active: left > 0 ? state.active : null };
}

export function canUse(state: EcoState, slot: number): boolean {
  if (!state.active) return false;
  const ability = ABILITIES[state.active][slot];
  return !!ability && state[state.active] >= ability.cost;
}

/** Spends the ability in `slot` (0-3) of the active form. Returns the ability used, or null if it can't be used. */
export function useAbility(state: EcoState, slot: number): { state: EcoState; ability: AbilityDef | null } {
  if (!state.active || !canUse(state, slot)) return { state, ability: null };
  const mode = state.active;
  const ability = ABILITIES[mode][slot];
  if (ability.endsForm) return { state: { ...state, [mode]: 0, active: null }, ability };
  const left = state[mode] - ability.cost;
  return { state: { ...state, [mode]: left, active: left > 0 ? mode : null }, ability };
}

/** Which wisp, if any, a regular kill drops. */
export function rollWisp(rng: Rng): EcoMode | null {
  const roll = rng();
  if (roll < WISP_CHANCE.dark) return 'dark';
  if (roll < WISP_CHANCE.dark + WISP_CHANCE.light) return 'light';
  return null;
}
