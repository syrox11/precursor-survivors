import type { MapId } from '../logic/maps';
import { effectiveVolume, type Settings } from '../logic/settings';

/** Every sound the game can ask for. Each game's pack maps them to its own samples. */
export type SfxKey =
  | 'uiMove' | 'uiSelect' | 'uiBack' | 'uiOpen' | 'uiBuy' | 'uiError'
  | 'orb' | 'battery' | 'heal' | 'ecoYellow' | 'ecoRed' | 'ecoBlue' | 'ecoGreen'
  | 'levelUp' | 'hurt' | 'enemyDie' | 'explosion' | 'chest' | 'oracle' | 'bossSpawn' | 'bossDown' | 'victory' | 'defeat'
  | 'shotYellow' | 'shotRed' | 'shotBlue' | 'shotDark' | 'melee' | 'darkOn' | 'lightOn' | 'darkBomb';

/** Which version of a zone's track plays: the normal one, the boss fight, or Dark Jak's. */
export type MusicMood = 'base' | 'boss' | 'dark';

interface ZoneMusic {
  base: string;
  boss?: string;
  dark?: string;
}

/** public/audio-local/manifest.json, written by the local pack builder. Paths are relative to that folder. */
export interface AudioManifest {
  sfx: Partial<Record<MapId, Partial<Record<SfxKey, string[]>>>>;
  music: Partial<Record<MapId, { menu: string; zones: ZoneMusic[] }>>;
}

const PACK_DIR = `${import.meta.env.BASE_URL}audio-local/`;

/** Rapid-fire sounds (guns, kills, orbs) would stack into noise: at most one per this many ms, and quieter. */
const SFX_TUNING: Partial<Record<SfxKey, { gapMs: number; volume: number }>> = {
  orb: { gapMs: 70, volume: 0.45 },
  enemyDie: { gapMs: 60, volume: 0.35 },
  hurt: { gapMs: 450, volume: 0.8 },
  explosion: { gapMs: 110, volume: 0.5 },
  shotYellow: { gapMs: 90, volume: 0.3 },
  shotRed: { gapMs: 90, volume: 0.3 },
  shotBlue: { gapMs: 90, volume: 0.3 },
  shotDark: { gapMs: 120, volume: 0.35 },
  melee: { gapMs: 120, volume: 0.35 },
  uiMove: { gapMs: 40, volume: 0.7 },
};
const DEFAULT_TUNING = { gapMs: 30, volume: 0.9 };
/** Hard cap on sounds playing at once, whatever they are. */
const MAX_VOICES = 24;

const FADE_MS = 900;
/** Music level while the pause screen is up. */
const DUCKED = 0.35;

interface Track {
  url: string;
  element: HTMLAudioElement;
  /** 0-1 crossfade level, multiplied by the music volume. */
  level: number;
  target: number;
}

/**
 * Plays the original-soundtrack pack when one is installed locally and stays silent otherwise (the published
 * game ships without it). Music streams through <audio> elements so whole tracks never sit in memory;
 * sound effects are decoded once into Web Audio buffers.
 */
export class AudioDirector {
  private manifest?: AudioManifest;
  private context?: AudioContext;
  private sfxGain?: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private lastPlayed = new Map<SfxKey, number>();
  private voices = 0;
  private settings?: Settings;
  private tracks: Track[] = [];
  private ducked = false;
  private unlocked = false;
  private fadeTimer?: number;
  /** Game whose menu sounds and menu music are used: the current theme. */
  private uiGame: MapId = 'jak1';
  /** Game whose in-run sounds are used: the map being played. */
  private runGame: MapId = 'jak1';
  private run?: { map: MapId; zone: number; mood: MusicMood };

  get available(): boolean {
    return this.manifest !== undefined;
  }

  /** Url of the track playing now, for the debug snapshot. */
  get nowPlaying(): string | undefined {
    return this.tracks.find((t) => t.target > 0)?.url;
  }

  async init(settings: Settings): Promise<void> {
    this.settings = settings;
    try {
      const response = await fetch(`${PACK_DIR}manifest.json`);
      if (!response.ok) return;
      this.manifest = (await response.json()) as AudioManifest;
    } catch {
      return;
    }
    this.context = new AudioContext();
    this.sfxGain = this.context.createGain();
    this.sfxGain.connect(this.context.destination);
    this.applySettings(settings);
    // Browsers only start audio after the first click or key press
    const unlock = () => {
      this.unlocked = true;
      void this.context?.resume();
      for (const track of this.tracks) if (track.target > 0) this.start(track);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    void this.preloadSfx();
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    if (this.sfxGain) this.sfxGain.gain.value = effectiveVolume(settings, 'sfx');
    this.updateVolumes();
  }

  setUiGame(game: MapId): void {
    this.uiGame = game;
  }

  /** Menu sounds follow the theme. */
  ui(key: SfxKey): void {
    this.play(key, this.uiGame);
  }

  /** In-run sounds follow the map. */
  sfx(key: SfxKey): void {
    this.play(key, this.runGame);
  }

  menuMusic(): void {
    this.run = undefined;
    this.playTrack(this.manifest?.music[this.uiGame]?.menu);
  }

  /** Zone track for the run, switching to its boss or Dark Jak version when the game has one. */
  runMusic(map: MapId, zone: number, mood: MusicMood): void {
    this.runGame = map;
    const current = this.run;
    if (current && current.map === map && current.zone === zone && current.mood === mood) return;
    this.run = { map, zone, mood };
    const music = this.manifest?.music[map]?.zones[zone];
    if (!music) return;
    // Versions of the same track crossfade in step, like the original games
    const sameZone = current?.map === map && current.zone === zone;
    this.playTrack(music[mood] ?? music.base, sameZone);
  }

  stopMusic(): void {
    this.run = undefined;
    this.playTrack(undefined);
  }

  /** Quieter music behind the pause screen. */
  duck(on: boolean): void {
    this.ducked = on;
    this.updateVolumes();
  }

  private play(key: SfxKey, game: MapId): void {
    if (!this.context || !this.sfxGain || this.voices >= MAX_VOICES || this.context.state !== 'running') return;
    const files = this.manifest?.sfx[game]?.[key];
    if (!files || files.length === 0) return;
    const tuning = SFX_TUNING[key] ?? DEFAULT_TUNING;
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? -Infinity) < tuning.gapMs) return;
    const buffer = this.buffers.get(files[Math.floor(Math.random() * files.length)]);
    if (!buffer) return;
    this.lastPlayed.set(key, now);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = tuning.volume;
    source.connect(gain).connect(this.sfxGain);
    this.voices++;
    source.onended = () => {
      this.voices--;
      gain.disconnect();
    };
    source.start();
  }

  private async preloadSfx(): Promise<void> {
    const files = new Set(Object.values(this.manifest?.sfx ?? {}).flatMap((keys) => Object.values(keys ?? {}).flat()));
    await Promise.all([...files].map(async (file) => {
      try {
        const data = await (await fetch(`${PACK_DIR}${file}`)).arrayBuffer();
        this.buffers.set(file, await this.context!.decodeAudioData(data));
      } catch {
        // A missing or broken sample only means that sound stays silent
      }
    }));
  }

  /** Fades the current track out and `url` in. With `inStep`, the new one starts where the old one is. */
  private playTrack(path: string | undefined, inStep = false): void {
    const url = path && `${PACK_DIR}${path}`;
    const playing = this.tracks.find((t) => t.target > 0);
    if (playing?.url === url) return;

    let next = url ? this.tracks.find((t) => t.url === url) : undefined;
    if (url && !next) {
      const element = new Audio(url);
      element.loop = true;
      element.preload = 'auto';
      next = { url, element, level: 0, target: 0 };
      this.tracks.push(next);
    }
    for (const track of this.tracks) track.target = track === next ? 1 : 0;
    if (next) {
      // A zone's versions all have the same length, so the same position lines them up
      if (inStep && playing) {
        next.element.currentTime = playing.element.currentTime;
      } else if (next.level === 0) {
        next.element.currentTime = 0;
      }
      this.start(next);
    }
    this.fade();
  }

  private start(track: Track): void {
    if (!this.unlocked) return;
    track.element.play().catch(() => {
      // Blocked until the first click or key press; unlock() retries
    });
  }

  private fade(): void {
    if (this.fadeTimer !== undefined) return;
    const step = 50 / FADE_MS;
    this.fadeTimer = window.setInterval(() => {
      let moving = false;
      for (const track of this.tracks) {
        if (track.level !== track.target) {
          track.level = track.level < track.target ? Math.min(track.target, track.level + step) : Math.max(track.target, track.level - step);
          moving = true;
        }
      }
      // Faded-out tracks stop and give their memory back
      this.tracks = this.tracks.filter((track) => {
        if (track.level > 0 || track.target > 0) return true;
        track.element.pause();
        track.element.removeAttribute('src');
        track.element.load();
        return false;
      });
      this.updateVolumes();
      if (!moving) {
        window.clearInterval(this.fadeTimer);
        this.fadeTimer = undefined;
      }
    }, 50);
  }

  private updateVolumes(): void {
    if (!this.settings) return;
    const music = effectiveVolume(this.settings, 'music') * (this.ducked ? DUCKED : 1);
    for (const track of this.tracks) track.element.volume = Math.min(1, Math.max(0, music * track.level));
  }
}

/** One director for the whole game: music carries on across scenes. */
export const audio = new AudioDirector();
