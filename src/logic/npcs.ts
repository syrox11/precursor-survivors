import type { MapId } from './maps';
import { type Rng, shuffle } from './rng';

export type NpcId =
  | 'samos' | 'blueSage' | 'redSage' | 'yellowSage' | 'keira' | 'mayor' | 'gambler' | 'miners'
  | 'torn' | 'sig' | 'ashelin' | 'brutter' | 'tess' | 'vin'
  | 'kleiver' | 'damas' | 'precursors';

export type AllyStyle = 'rifle' | 'blaster' | 'peacemaker';

/** What a character gives you when you reach them. */
export type Gift =
  | { kind: 'heal'; maxHp: number }
  | { kind: 'blueEco'; seconds: number }
  | { kind: 'damageBuff'; multiplier: number; seconds: number }
  | { kind: 'screenClear' }
  | { kind: 'weaponUp' }
  | { kind: 'batteries'; amount: number }
  | { kind: 'levels'; amount: number; heal?: boolean }
  | { kind: 'pick' }
  | { kind: 'ally'; style: AllyStyle; seconds: number }
  | { kind: 'shield'; seconds: number }
  | { kind: 'random' };

export interface NpcDef {
  id: NpcId;
  name: string;
  texture: string;
  line: string;
  gift: Gift;
}

const npc = (id: NpcId, name: string, line: string, gift: Gift): NpcDef => ({ id, name, texture: `npc-${id}`, line, gift });

export const NPCS: Record<NpcId, NpcDef> = {
  samos: npc('samos', 'Samos', 'Use this wisely, boy!', { kind: 'heal', maxHp: 20 }),
  blueSage: npc('blueSage', 'Blue Sage', 'Fascinating! Here, some blue eco.', { kind: 'blueEco', seconds: 12 }),
  redSage: npc('redSage', 'Red Sage', 'Red eco! Hit them harder!', { kind: 'damageBuff', multiplier: 1.5, seconds: 30 }),
  yellowSage: npc('yellowSage', 'Yellow Sage', 'Stand back!', { kind: 'screenClear' }),
  keira: npc('keira', 'Keira', 'Let me tune that up for you.', { kind: 'weaponUp' }),
  mayor: npc('mayor', 'The Mayor', 'A donation... for my re-election, of course.', { kind: 'batteries', amount: 10 }),
  gambler: npc('gambler', 'The Gambler', 'Feeling lucky?', { kind: 'random' }),
  miners: npc('miners', 'The Miners', 'Take some of our Precursor orbs.', { kind: 'levels', amount: 2 }),
  torn: npc('torn', 'Torn', "Move it, Jak. I've got your back.", { kind: 'ally', style: 'rifle', seconds: 30 }),
  sig: npc('sig', 'Sig', 'Time to make some noise, chili pepper!', { kind: 'ally', style: 'peacemaker', seconds: 30 }),
  ashelin: npc('ashelin', 'Ashelin', 'Try to keep up.', { kind: 'ally', style: 'blaster', seconds: 30 }),
  brutter: npc('brutter', 'Brutter', 'Brutter give gift! Friend Jak!', { kind: 'pick' }),
  tess: npc('tess', 'Tess', 'For the cause!', { kind: 'batteries', amount: 15 }),
  vin: npc('vin', 'Vin', "Eco shield's up! Don't touch anything!", { kind: 'shield', seconds: 10 }),
  kleiver: npc('kleiver', 'Kleiver', "Go on then, show 'em what you've got!", { kind: 'damageBuff', multiplier: 1.6, seconds: 30 }),
  damas: npc('damas', 'Damas', 'Fight well, son of Spargus.', { kind: 'ally', style: 'peacemaker', seconds: 30 }),
  precursors: npc('precursors', 'The Precursors', 'We are the Precursors. Take this gift.', { kind: 'levels', amount: 2, heal: true }),
};

export const MAP_NPCS: Record<MapId, NpcId[]> = {
  jak1: ['samos', 'blueSage', 'redSage', 'yellowSage', 'keira', 'mayor', 'gambler', 'miners'],
  jak2: ['torn', 'keira', 'sig', 'ashelin', 'brutter', 'tess', 'samos', 'vin'],
  jak3: ['kleiver', 'damas', 'torn', 'ashelin', 'keira', 'samos', 'tess', 'precursors'],
};

/** One distinct character per zone, drawn from the map's cast. */
export function pickNpcs(map: MapId, rng: Rng, count: number): NpcId[] {
  return shuffle(rng, MAP_NPCS[map]).slice(0, count);
}

/** The Gambler's prize: any other gift from the same map's cast. */
export function gambleGift(map: MapId, rng: Rng): Gift {
  const options = MAP_NPCS[map].map((id) => NPCS[id].gift).filter((gift) => gift.kind !== 'random');
  return options[Math.floor(rng() * options.length)];
}

/** Short label for the banner, e.g. "+2 levels". */
export function describeGift(gift: Gift): string {
  switch (gift.kind) {
    case 'heal': return `Full heal, +${gift.maxHp} max health`;
    case 'blueEco': return 'Blue eco: all orbs and a burst of speed';
    case 'damageBuff': return `+${Math.round((gift.multiplier - 1) * 100)}% damage for ${gift.seconds}s`;
    case 'screenClear': return 'Yellow eco storm!';
    case 'weaponUp': return 'Weapon upgraded';
    case 'batteries': return `+${gift.amount} Precursor batteries`;
    case 'levels': return `+${gift.amount} levels${gift.heal ? ' and a full heal' : ''}`;
    case 'pick': return 'Pick an upgrade';
    case 'ally': return `Fights with you for ${gift.seconds}s`;
    case 'shield': return `Invulnerable for ${gift.seconds}s`;
    case 'random': return 'A random gift';
  }
}
