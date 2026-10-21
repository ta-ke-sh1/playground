import type { GenreId } from "./soundboard-audio";

export const STEPS = 32;

export type ChordQuality = "major" | "minor" | "sus2" | "seventh";

export const CHORD_ROOTS = [
  { value: "C", semitones: 0 },
  { value: "C#", semitones: 1 },
  { value: "D", semitones: 2 },
  { value: "D#", semitones: 3 },
  { value: "E", semitones: 4 },
  { value: "F", semitones: 5 },
  { value: "F#", semitones: 6 },
  { value: "G", semitones: 7 },
  { value: "G#", semitones: 8 },
  { value: "A", semitones: 9 },
  { value: "A#", semitones: 10 },
  { value: "B", semitones: 11 },
] as const;

export const GENRE_IDS: GenreId[] = ["deep-house", "lo-fi", "breakbeat", "ambient"];
export const DENSITY_LEVELS = [8, 16, 24, 32];
export const VARIATION_LEVELS = [0, 10, 20, 30];

const GENRE_TEMPOS: Record<GenreId, number[]> = {
  "deep-house": [100, 120, 120, 140],
  "lo-fi": [60, 80, 80, 100],
  breakbeat: [120, 140, 140, 140],
  ambient: [60, 60, 80, 100],
};

export type GenerationSettings = {
  seed: string;
  genre: GenreId;
  key: string;
  density: number;
  variation: number;
  tempo: number;
};

const SEED_LENGTH = 6;
const MAX_SEED_LENGTH = 24;

// Common chord loops; the seed picks one, so every seed has its own harmony.
const PROGRESSIONS: { degree: number; quality: ChordQuality }[][] = [
  [
    { degree: 0, quality: "major" },
    { degree: 7, quality: "major" },
    { degree: 9, quality: "minor" },
    { degree: 5, quality: "major" },
  ],
  [
    { degree: 0, quality: "minor" },
    { degree: 8, quality: "major" },
    { degree: 3, quality: "major" },
    { degree: 10, quality: "major" },
  ],
  [
    { degree: 0, quality: "major" },
    { degree: 9, quality: "minor" },
    { degree: 5, quality: "major" },
    { degree: 7, quality: "seventh" },
  ],
  [
    { degree: 0, quality: "minor" },
    { degree: 5, quality: "minor" },
    { degree: 7, quality: "seventh" },
    { degree: 0, quality: "minor" },
  ],
  [
    { degree: 0, quality: "sus2" },
    { degree: 5, quality: "major" },
    { degree: 7, quality: "sus2" },
    { degree: 9, quality: "minor" },
  ],
  [
    { degree: 2, quality: "minor" },
    { degree: 7, quality: "seventh" },
    { degree: 0, quality: "major" },
    { degree: 9, quality: "minor" },
  ],
];

const MOTIFS = [
  [0, 2, 4, 6],
  [0, 3, 5, 7],
  [0, 2, 5],
  [0, 4],
];

const BREAKBEAT_KICKS = [
  [0, 3, 8, 10, 16, 19, 24, 26],
  [0, 5, 8, 11, 16, 21, 24, 27],
  [0, 3, 6, 10, 16, 19, 22, 26],
];

function hashString(value: string) {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function mix(a: number, b: number) {
  let hash = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  hash = Math.imul(hash, 0x297a2d39);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

const unit = (a: number, b: number) => mix(a, b) / 4294967296;

export function normalizeSeed(value: string) {
  return value.trim().toLowerCase().slice(0, MAX_SEED_LENGTH);
}

export function randomSeed() {
  const bytes = crypto.getRandomValues(new Uint8Array(SEED_LENGTH));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("");
}

// Everything a seed implies by default; URL params or the controls can override each field.
export function deriveSettings(seed: string): GenerationSettings {
  const base = hashString(seed);
  const genre = GENRE_IDS[mix(base, 1) % GENRE_IDS.length];
  const tempos = GENRE_TEMPOS[genre];
  return {
    seed,
    genre,
    key: CHORD_ROOTS[mix(base, 2) % CHORD_ROOTS.length].value,
    density: DENSITY_LEVELS[mix(base, 3) % DENSITY_LEVELS.length],
    variation: VARIATION_LEVELS[mix(base, 4) % VARIATION_LEVELS.length],
    tempo: tempos[mix(base, 5) % tempos.length],
  };
}

export function parseSettings(search: string): GenerationSettings {
  const params = new URLSearchParams(search);
  const seed = normalizeSeed(params.get("seed") ?? "") || randomSeed();
  const derived = deriveSettings(seed);

  const genre = params.get("genre") as GenreId | null;
  const key = params.get("key");
  const density = Number(params.get("density"));
  const variation = Number(params.get("variation"));
  const tempo = Number(params.get("bpm"));

  return {
    seed,
    genre: genre && GENRE_IDS.includes(genre) ? genre : derived.genre,
    key: CHORD_ROOTS.some(({ value }) => value === key) ? (key as string) : derived.key,
    density: params.has("density") && density >= 0 && density <= 64 ? density : derived.density,
    variation:
      params.has("variation") && variation >= 0 && variation <= 64 ? variation : derived.variation,
    tempo: params.has("bpm") && tempo >= 40 && tempo <= 200 ? tempo : derived.tempo,
  };
}

export function settingsToSearch({
  seed,
  genre,
  key,
  density,
  variation,
  tempo,
}: GenerationSettings) {
  return new URLSearchParams({
    seed,
    genre,
    key,
    bpm: String(tempo),
    density: String(density),
    variation: String(variation),
  }).toString();
}

export type TrackBlueprint = {
  voice: "tonal" | "kick" | "clap" | "hat";
  isBass: boolean;
};

export type GeneratedTrack = {
  chordRoot: string;
  chordQuality: ChordQuality;
  notes: boolean[];
};

// Pure function of (settings, track list): the same seed and settings always give the same song.
export function generateTrackData(
  { seed, genre, key, density, variation }: GenerationSettings,
  blueprints: TrackBlueprint[],
): GeneratedTrack[] {
  const base = hashString(seed);
  const rootSemitones = CHORD_ROOTS.find(({ value }) => value === key)?.semitones ?? 0;
  const progression = PROGRESSIONS[mix(base, 10) % PROGRESSIONS.length].map(
    ({ degree, quality }) => ({
      root: CHORD_ROOTS[(rootSemitones + degree) % 12].value as string,
      quality,
    }),
  );
  const chordOffset = mix(base, 11) % progression.length;
  const motifOffset = mix(base, 12) % MOTIFS.length;
  const breakbeatKick = BREAKBEAT_KICKS[mix(base, 13) % BREAKBEAT_KICKS.length];
  const lofiClap = mix(base, 14) % 2 === 0 ? [6, 14, 22, 30] : [4, 12, 20, 28];
  const seedBias = ((mix(base, 15) % 9) - 4) * 0.01;

  return blueprints.map(({ voice, isBass }, trackIndex) => {
    const chord = progression[(trackIndex + chordOffset) % progression.length];
    const trackSeed = mix(base, 100 + trackIndex);
    const phraseShift = trackSeed % 3;
    const motif = MOTIFS[(trackIndex + variation + motifOffset) % MOTIFS.length];

    const notes = Array.from({ length: STEPS }, (_, stepIndex) => {
      const phrasePosition = stepIndex % 8;
      const randomValue = unit(trackSeed, stepIndex);
      const ghostValue = unit(trackSeed, stepIndex + 500);

      if (genre === "ambient") {
        if (voice === "kick" || voice === "clap") return false;
        if (voice === "hat") return stepIndex % 8 === 6 && randomValue < 0.35;
      }

      if (genre === "breakbeat") {
        if (voice === "kick") return breakbeatKick.includes(stepIndex);
        if (voice === "clap") return [4, 12, 20, 28].includes(stepIndex);
        if (voice === "hat") return stepIndex % 2 === 0 && randomValue < 0.8;
      } else if (genre === "lo-fi") {
        if (voice === "kick") return [0, 8, 16, 24].includes(stepIndex);
        if (voice === "clap") return lofiClap.includes(stepIndex);
        if (voice === "hat") return stepIndex % 4 === 2 && randomValue < 0.7;
      } else {
        if (voice === "kick") {
          const ghost = stepIndex % 8 === 7 && ghostValue < 0.06 + variation / 200;
          return stepIndex % 4 === 0 || ghost;
        }
        if (voice === "clap") return stepIndex % 8 === 4;
        if (voice === "hat") {
          return (
            (stepIndex % 4 === 2 || stepIndex % 8 === 6) &&
            randomValue < 0.75 + density / 400
          );
        }
      }

      const rhythmicMotif = isBass
        ? genre === "lo-fi"
          ? [0, 5, 8, 13].includes(stepIndex % 16)
          : genre === "ambient"
            ? [0, 8].includes(stepIndex % 16)
            : [0, 3, 6, 8, 11, 14].includes(stepIndex % 16)
        : motif.includes((phrasePosition + Math.floor(trackIndex / 4) + phraseShift) % 8);
      const chordAccent =
        !isBass &&
        (genre === "ambient"
          ? stepIndex % 16 === 0
          : stepIndex % 8 === 3 || stepIndex % 8 === 7)
          ? 0.18
          : 0;
      const beatAccent = stepIndex % 4 === 0 ? 0.08 : 0;
      const variationOffset = ((trackIndex + variation) % 5) * 0.02;
      const motifBias = rhythmicMotif ? 0.2 : -0.08;

      return (
        randomValue <
        density / 220 + beatAccent + chordAccent + variationOffset + motifBias + seedBias
      );
    });

    return { chordRoot: chord.root, chordQuality: chord.quality, notes };
  });
}
