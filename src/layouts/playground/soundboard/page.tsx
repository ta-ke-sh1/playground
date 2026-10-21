import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconBell,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconDice5,
  IconKeyboard,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconWaveSine,
  IconX,
} from "@tabler/icons-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { TablerIcon } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import "./soundboard.css";
import { NoteIcon } from "./note-icon";
import {
  applyFxProfile,
  createFxBus,
  playInstrument,
  type FxBus,
  type GenreId,
} from "./soundboard-audio";
import {
  CHORD_ROOTS,
  STEPS,
  generateTrackData,
  normalizeSeed,
  parseSettings,
  randomSeed,
  settingsToSearch,
  type ChordQuality,
  type GenerationSettings,
} from "./soundboard-generator";

gsap.registerPlugin(useGSAP);

const DEFAULT_TRACK_COUNT = 12;
const DEFAULT_VOLUME = 75;

type InstrumentDefinition = {
  id: string;
  name: string;
  shortName: string;
  kanji: string;
  color: string;
  oscillator: OscillatorType;
  voice: "tonal" | "kick" | "clap" | "hat";
  frequencies: number[];
  noteNames: string[];
  icon: TablerIcon;
  noteIcon: 1 | 2 | 3 | 4;
  noteSize: number;
};

type Track = {
  id: number;
  instrumentId: string;
  notes: boolean[];
  chordRoot: string;
  chordQuality: ChordQuality;
};

const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  sus2: [0, 2, 7],
  seventh: [0, 4, 7, 10],
};

const CHORD_QUALITIES = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "sus2", label: "Suspended 2" },
  { value: "seventh", label: "7th" },
] satisfies { value: ChordQuality; label: string }[];

const GENERATION_GENRES = [
  { id: "deep-house", kanji: "深", label: "Deep house" },
  { id: "lo-fi", kanji: "夢", label: "Lo-fi" },
  { id: "breakbeat", kanji: "波", label: "Breakbeat" },
  { id: "ambient", kanji: "空", label: "Ambient" },
] satisfies { id: GenreId; kanji: string; label: string }[];

const INSTRUMENTS: InstrumentDefinition[] = [
  {
    id: "kick",
    name: "Deep kick",
    shortName: "KICK",
    kanji: "鼓",
    color: "#f14729",
    oscillator: "sine",
    voice: "kick",
    frequencies: [55],
    noteNames: ["KICK"],
    icon: IconWaveSine,
    noteIcon: 1,
    noteSize: 0.72,
  },
  {
    id: "clap",
    name: "House clap",
    shortName: "CLAP",
    kanji: "拍",
    color: "#dd8b24",
    oscillator: "triangle",
    voice: "clap",
    frequencies: [180],
    noteNames: ["CLAP"],
    icon: IconWaveSine,
    noteIcon: 2,
    noteSize: 0.58,
  },
  {
    id: "hat",
    name: "Open hat",
    shortName: "HAT",
    kanji: "銅",
    color: "#d0b45b",
    oscillator: "square",
    voice: "hat",
    frequencies: [8000],
    noteNames: ["HAT"],
    icon: IconWaveSine,
    noteIcon: 3,
    noteSize: 0.5,
  },
  {
    id: "bells",
    name: "Glass bells",
    shortName: "BELL",
    kanji: "鐘",
    color: "#f14729",
    oscillator: "sine",
    voice: "tonal",
    frequencies: [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33],
    noteNames: ["C5", "D5", "E5", "G5", "A5", "G5", "E5", "D5"],
    icon: IconBell,
    noteIcon: 4,
    noteSize: 0.82,
  },
  {
    id: "lead",
    name: "Soft lead",
    shortName: "LEAD",
    kanji: "笛",
    color: "#dd8b24",
    oscillator: "triangle",
    voice: "tonal",
    frequencies: [392, 440, 493.88, 587.33, 659.25, 587.33, 493.88, 440],
    noteNames: ["G4", "A4", "B4", "D5", "E5", "D5", "B4", "A4"],
    icon: IconWaveSine,
    noteIcon: 1,
    noteSize: 0.62,
  },
  {
    id: "keys",
    name: "Warm keys",
    shortName: "KEYS",
    kanji: "鍵",
    color: "#348c76",
    oscillator: "sine",
    voice: "tonal",
    frequencies: [261.63, 293.66, 329.63, 392, 440, 392, 329.63, 293.66],
    noteNames: ["C4", "D4", "E4", "G4", "A4", "G4", "E4", "D4"],
    icon: IconKeyboard,
    noteIcon: 3,
    noteSize: 0.72,
  },
  {
    id: "bass",
    name: "Low pulse",
    shortName: "BASS",
    kanji: "低",
    color: "#3878a8",
    oscillator: "square",
    voice: "tonal",
    frequencies: [130.81, 146.83, 164.81, 196, 220, 196, 164.81, 146.83],
    noteNames: ["C3", "D3", "E3", "G3", "A3", "G3", "E3", "D3"],
    icon: IconWaveSine,
    noteIcon: 4,
    noteSize: 0.9,
  },
  {
    id: "pluck",
    name: "Tiny pluck",
    shortName: "PLUCK",
    kanji: "弦",
    color: "#b45b83",
    oscillator: "sawtooth",
    voice: "tonal",
    frequencies: [659.25, 783.99, 880, 1046.5, 880, 783.99, 659.25, 587.33],
    noteNames: ["E5", "G5", "A5", "C6", "A5", "G5", "E5", "D5"],
    icon: IconSparkles,
    noteIcon: 2,
    noteSize: 0.68,
  },
];

const NOTE_COLORS = [
  "#f14729",
  "#dd8b24",
  "#d0b45b",
  "#348c76",
  "#3878a8",
  "#b45b83",
  "#7b6fd0",
  "#68a85d",
];

function getNoteColor(trackId: number, stepIndex: number, fallback: string) {
  const colorIndex = Math.abs(trackId * 13 + stepIndex * 7) % NOTE_COLORS.length;
  return NOTE_COLORS[colorIndex] ?? fallback;
}

function getNoteAccents(trackId: number, stepIndex: number) {
  const colorIndex = Math.abs(trackId * 13 + stepIndex * 7) % NOTE_COLORS.length;
  return {
    "--note-color-2": NOTE_COLORS[(colorIndex + 3) % NOTE_COLORS.length],
    "--note-color-3": NOTE_COLORS[(colorIndex + 5) % NOTE_COLORS.length],
  };
}

const FIREWORK_PARTICLES = 16;

function getParticleValues(trackId: number, stepIndex: number, index: number) {
  const seed = Math.abs(trackId * 97 + stepIndex * 53 + index * 29);
  const angle =
    ((index / FIREWORK_PARTICLES) * 360 + ((seed * 13) % 24) - 12) *
    (Math.PI / 180);
  const distance = 20 + (seed % 22);
  const size = 2 + (seed % 3);

  return {
    angle,
    distance,
    size,
    isDot: seed % 3 !== 0,
    isHot: seed % 4 === 0,
  };
}

function NoteCellContent({
  instrument,
  trackId,
  stepIndex,
}: {
  instrument: InstrumentDefinition;
  trackId: number;
  stepIndex: number;
}) {
  return (
    <>
      <NoteIcon
        variant={instrument.noteIcon}
        size={`${instrument.noteSize * 100}%`}
      />
      <span className="soundboard-note-sparks" aria-hidden="true">
        <span className="soundboard-note-ring" />
        {Array.from({ length: FIREWORK_PARTICLES }, (_, index) => {
          const particle = getParticleValues(trackId, stepIndex, index);
          return (
            <span
              className={`soundboard-note-spark ${particle.isDot ? "is-dot" : "is-streak"} ${particle.isHot ? "is-hot" : ""}`}
              data-angle={particle.angle}
              data-distance={particle.distance}
              key={index}
              style={
                { "--spark-size": `${particle.size}px` } as CSSProperties
              }
            />
          );
        })}
      </span>
    </>
  );
}

// Firework burst for one note cell: the icon pops, a ring expands, and the sparks fly out and fade.
function playNoteCellAnimation(cell: HTMLElement) {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion) {
    gsap.set(cell, { clearProps: "transform" });
    return;
  }

  const icon = cell.querySelector<HTMLElement>(".soundboard-note-icon");
  if (!icon) return;

  const ring = cell.querySelector<HTMLElement>(".soundboard-note-ring");
  const sparks = Array.from(
    cell.querySelectorAll<HTMLElement>(".soundboard-note-spark"),
  );
  // Stop any burst still running on this cell so a re-trigger starts clean.
  gsap.killTweensOf([icon, ...(ring ? [ring] : []), ...sparks]);

  gsap.fromTo(
    icon,
    { scale: 0.82, rotation: -8 },
    {
      scale: 1.16,
      rotation: 4,
      duration: 0.13,
      ease: "back.out(2.4)",
      yoyo: true,
      repeat: 1,
    },
  );

  if (ring) {
    gsap.fromTo(
      ring,
      { autoAlpha: 0.85, scale: 0.3 },
      { autoAlpha: 0, scale: 1.9, duration: 0.45, ease: "power3.out" },
    );
  }

  sparks.forEach((spark) => {
    const angle = Number(spark.dataset.angle);
    const distance =
      Number(spark.dataset.distance) * gsap.utils.random(0.8, 1.2);
    const burstX = Math.cos(angle) * distance;
    const burstY = Math.sin(angle) * distance;
    const isStreak = spark.classList.contains("is-streak");

    gsap
      .timeline({ delay: gsap.utils.random(0, 0.03) })
      .fromTo(
        spark,
        {
          autoAlpha: 1,
          scale: isStreak ? 1 : 0.5,
          scaleX: 1,
          x: 0,
          y: 0,
          rotation: isStreak ? (angle * 180) / Math.PI : 0,
        },
        {
          x: burstX,
          y: burstY,
          scale: 1,
          duration: 0.32,
          ease: "expo.out",
        },
      )
      .to(spark, {
        x: burstX * 1.12,
        y: burstY * 1.12 + gsap.utils.random(10, 20),
        autoAlpha: 0,
        scale: 0.2,
        duration: gsap.utils.random(0.35, 0.55),
        ease: "power1.in",
      });
  });
}

const MOBILE_QUERY = "(max-width: 700px)";

// Span the playhead sweeps: leading edge of the first step to trailing edge of the last.
function getPlayheadSpan(grid: HTMLElement, vertical: boolean) {
  const first = grid.querySelector<HTMLElement>('.soundboard-cell[data-step="0"]');
  const last = grid.querySelector<HTMLElement>(
    `.soundboard-cell[data-step="${STEPS - 1}"]`,
  );
  if (!first || !last) return { start: 0, end: 0 };
  return vertical
    ? { start: first.offsetTop, end: last.offsetTop + last.offsetHeight }
    : { start: first.offsetLeft, end: last.offsetLeft + last.offsetWidth };
}

const findInstrument = (instrumentId: string) =>
  INSTRUMENTS.find(({ id }) => id === instrumentId) ?? INSTRUMENTS[0];

function getTrackFrequencies(
  track: Track,
  instrument: InstrumentDefinition,
  step: number,
) {
  const root =
    CHORD_ROOTS.find(({ value }) => value === track.chordRoot) ?? CHORD_ROOTS[0];
  const rootFrequency =
    instrument.frequencies[step % instrument.frequencies.length] *
    Math.pow(2, root.semitones / 12);

  if (instrument.id === "bass") return [rootFrequency];

  return CHORD_INTERVALS[track.chordQuality].map(
    (interval) => rootFrequency * Math.pow(2, interval / 12),
  );
}

function playTrackNote(
  context: AudioContext,
  bus: FxBus,
  genre: GenreId,
  track: Track,
  step: number,
) {
  const instrument = findInstrument(track.instrumentId);
  if (!instrument) return;

  playInstrument(
    context,
    bus,
    genre,
    instrument.id,
    instrument.voice,
    instrument.voice === "tonal" ? getTrackFrequencies(track, instrument, step) : [],
  );
}

function subscribeToMobileQuery(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useIsMobileLayout() {
  return useSyncExternalStore(
    subscribeToMobileQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

function createTrack(
  id: number,
  instrumentId: string,
  activeSteps: number[] = [],
  chordRoot = "C",
  chordQuality: ChordQuality = "major",
) {
  return {
    id,
    instrumentId,
    notes: Array.from({ length: STEPS }, (_, step) =>
      activeSteps.includes(step),
    ),
    chordRoot,
    chordQuality,
  };
}

const toBlueprint = (instrumentId: string) => {
  const instrument = findInstrument(instrumentId);
  return { voice: instrument.voice, isBass: instrument.id === "bass" };
};

// The band roster is fixed; the seed decides every note and chord on it.
function createSeededTracks(settings: GenerationSettings): Track[] {
  const roster = Array.from(
    { length: DEFAULT_TRACK_COUNT },
    (_, index) => INSTRUMENTS[index % INSTRUMENTS.length].id,
  );
  const generated = generateTrackData(settings, roster.map(toBlueprint));
  return roster.map((instrumentId, index) => ({
    id: index,
    instrumentId,
    ...generated[index],
  }));
}

function applySeededArrangement(tracks: Track[], settings: GenerationSettings) {
  const generated = generateTrackData(
    settings,
    tracks.map(({ instrumentId }) => toBlueprint(instrumentId)),
  );
  return tracks.map((track, index) => ({ ...track, ...generated[index] }));
}

// Keeps the URL shareable: the same link reproduces the same arrangement.
function syncSettingsToUrl(settings: GenerationSettings) {
  const { pathname, hash } = window.location;
  window.history.replaceState(
    window.history.state,
    "",
    `${pathname}?${settingsToSearch(settings)}${hash}`,
  );
}

// Reading the URL back makes this idempotent, so React StrictMode's double call keeps one seed.
function resolveInitialSettings() {
  const settings = parseSettings(window.location.search);
  syncSettingsToUrl(settings);
  return settings;
}

export default function SoundboardLayout() {
  const navigate = useNavigate();
  const [initialSettings] = useState(resolveInitialSettings);
  const [tracks, setTracks] = useState<Track[]>(() =>
    createSeededTracks(initialSettings),
  );
  const [seed, setSeed] = useState(initialSettings.seed);
  const [seedDraft, setSeedDraft] = useState(initialSettings.seed);
  const [tempo, setTempo] = useState(initialSettings.tempo);
  const [swing, setSwing] = useState(-24);
  const [density, setDensity] = useState(initialSettings.density);
  const [variation, setVariation] = useState(initialSettings.variation);
  const [key, setKey] = useState(initialSettings.key);
  const [grain, setGrain] = useState(1);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [genre, setGenre] = useState<GenreId>(initialSettings.genre);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [dragOverCell, setDragOverCell] = useState<{
    trackId: number;
    stepIndex: number;
  } | null>(null);
  const [draggedNote, setDraggedNote] = useState<{
    trackId: number;
    stepIndex: number;
  } | null>(null);
  const [wasDragged, setWasDragged] = useState(false);
  const [noteBurst, setNoteBurst] = useState<{
    trackId: number;
    stepIndex: number;
    id: number;
  } | null>(null);
  const noteBurstIdRef = useRef(0);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState("pluck");
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const fxBusRef = useRef<FxBus | null>(null);
  const genreRef = useRef<GenreId>(initialSettings.genre);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(-1);
  const nextTrackIdRef = useRef(DEFAULT_TRACK_COUNT);
  const soundboardGridRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const playheadAnimationRef = useRef<Animation | null>(null);
  const playheadProgressRef = useRef<number | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const isMobileLayout = useIsMobileLayout();
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

  useGSAP(
    () => {
      if (currentStep < 0) return;

      gsap.utils
        .toArray<HTMLElement>(".soundboard-cell.is-active.is-current")
        .forEach((cell) => playNoteCellAnimation(cell));
    },
    { dependencies: [currentStep], scope: soundboardGridRef, revertOnUpdate: true },
  );

  const beatDuration = useMemo(
    () => (60_000 / tempo / 2) * (1 + swing / 500),
    [swing, tempo],
  );

  // The playhead is one linear animation over the whole loop (left edge of step 1 to right edge
  // of step 32), so it sweeps through each step while its note plays instead of restarting per step.
  useLayoutEffect(() => {
    const playhead = playheadRef.current;
    const grid = soundboardGridRef.current;
    if (!playhead || !grid) return;

    const { start, end } = getPlayheadSpan(grid, isMobileLayout);
    const axis = isMobileLayout ? "translateY" : "translateX";
    playhead.style.transform = `${axis}(${start}px)`;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!isPlaying) {
      const pausedStep = stepRef.current;
      playheadProgressRef.current = pausedStep < 0 ? null : pausedStep / STEPS;
      if (pausedStep >= 0) {
        const offset = start + ((end - start) * pausedStep) / STEPS;
        playhead.style.transform = `${axis}(${offset}px)`;
      }
      return;
    }
    if (reduceMotion) return;

    const total = beatDuration * STEPS;
    const animation = playhead.animate(
      [
        { transform: `${axis}(${start}px)` },
        { transform: `${axis}(${end}px)` },
      ],
      { duration: total, easing: "linear", iterations: Infinity },
    );
    animation.currentTime =
      (playheadProgressRef.current ?? Math.max(stepRef.current, 0) / STEPS) *
      total;
    playheadAnimationRef.current = animation;

    // Rebuilt on tempo or layout changes; carry the loop progress over so it doesn't jump.
    return () => {
      const phase = (Number(animation.currentTime ?? 0) % total + total) % total;
      playheadProgressRef.current = phase / total;
      animation.cancel();
      playheadAnimationRef.current = null;
    };
  }, [beatDuration, isMobileLayout, isPlaying, layoutVersion, tracks.length]);

  // Re-anchor to the step clock only when the timer has drifted noticeably (e.g. after edits).
  useLayoutEffect(() => {
    const playhead = playheadRef.current;
    const grid = soundboardGridRef.current;
    if (!playhead || currentStep < 0) return;

    const animation = playheadAnimationRef.current;
    if (!animation) {
      if (!grid) return;
      const { start, end } = getPlayheadSpan(grid, isMobileLayout);
      const offset = start + ((end - start) * currentStep) / STEPS;
      playhead.style.transform = `${isMobileLayout ? "translateY" : "translateX"}(${offset}px)`;
      return;
    }

    const total = beatDuration * STEPS;
    const expected = currentStep * beatDuration;
    const phase = (Number(animation.currentTime ?? 0) % total + total) % total;
    let drift = phase - expected;
    if (drift > total / 2) drift -= total;
    if (drift < -total / 2) drift += total;
    if (Math.abs(drift) > beatDuration / 2) animation.currentTime = expected;
  }, [beatDuration, currentStep, isMobileLayout]);

  useEffect(() => {
    const grid = soundboardGridRef.current;
    if (!grid) return;

    let isInitialObservation = true;
    const observer = new ResizeObserver(() => {
      if (isInitialObservation) {
        isInitialObservation = false;
        return;
      }
      setLayoutVersion((version) => version + 1);
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [isMobileLayout, tracks.length]);
  const playStep = useCallback(
    (step: number) => {
      const context = audioContextRef.current;
      const bus = fxBusRef.current;
      if (!context || !bus) return;

      tracks.forEach((track) => {
        if (track.notes[step]) {
          playTrackNote(context, bus, genreRef.current, track, step);
        }
      });
    },
    [tracks],
  );

  useEffect(() => {
    genreRef.current = genre;
    const context = audioContextRef.current;
    const bus = fxBusRef.current;
    if (context && bus) applyFxProfile(context, bus, genre, tempo);
  }, [genre, tempo]);

  useEffect(() => {
    const masterGain = masterGainRef.current;
    const context = audioContextRef.current;
    if (!masterGain || !context) return;

    masterGain.gain.setTargetAtTime(volume / 100, context.currentTime, 0.015);
  }, [volume]);

  const advanceStep = useCallback(() => {
    const nextStep = (stepRef.current + 1) % STEPS;
    stepRef.current = nextStep;
    setCurrentStep(nextStep);
    playStep(nextStep);
  }, [playStep]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stepRef.current = -1;
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  // Freezes the playhead on the current column; the next play resumes from the following column.
  const pause = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const ensureAudioContext = () => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (!masterGainRef.current) {
      masterGainRef.current = context.createGain();
      masterGainRef.current.gain.value = volume / 100;
      masterGainRef.current.connect(context.destination);
    }
    if (!fxBusRef.current) {
      fxBusRef.current = createFxBus(context, masterGainRef.current);
    }
    applyFxProfile(context, fxBusRef.current, genreRef.current, tempo);
    return context;
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      pause();
      return;
    }

    const context = ensureAudioContext();
    await context.resume();
    setIsPlaying(true);
    advanceStep();
    timerRef.current = window.setInterval(advanceStep, beatDuration);
  };

  const previewNote = (track: Track, stepIndex: number) => {
    const context = ensureAudioContext();
    const bus = fxBusRef.current;
    if (!bus) return;

    void context.resume();
    playTrackNote(context, bus, genreRef.current, track, stepIndex);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(advanceStep, beatDuration);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [advanceStep, beatDuration, isPlaying]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      void audioContextRef.current?.close();
      masterGainRef.current = null;
      fxBusRef.current = null;
    },
    [],
  );

  const toggleNote = (trackId: number, stepIndex: number) => {
    setTracks((current) =>
      current.map((track) =>
        track.id === trackId
          ? {
              ...track,
              notes: track.notes.map((active, index) =>
                index === stepIndex ? !active : active,
              ),
            }
          : track,
      ),
    );
  };

  const clearNote = (trackId: number, stepIndex: number) => {
    setTracks((current) =>
      current.map((track) =>
        track.id === trackId
          ? {
              ...track,
              notes: track.notes.map((active, index) =>
                index === stepIndex ? false : active,
              ),
            }
          : track,
      ),
    );
  };

  const triggerNoteBurst = (trackId: number, stepIndex: number) => {
    noteBurstIdRef.current += 1;
    setNoteBurst({ trackId, stepIndex, id: noteBurstIdRef.current });
  };

  // Single click plays a note (placing one if the cell is empty). A double click removes it;
  // the second click of that double click is ignored so it does not replay the note.
  const handleNoteCellClick = (
    track: Track,
    stepIndex: number,
    active: boolean,
    clickCount: number,
  ) => {
    if (active && clickCount > 1) return;
    if (!active) toggleNote(track.id, stepIndex);
    previewNote(track, stepIndex);
    triggerNoteBurst(track.id, stepIndex);
  };

  // Runs after the DOM commits, so a cell that was just activated has its sparks mounted.
  useLayoutEffect(() => {
    if (!noteBurst) return;
    const cell = soundboardGridRef.current?.querySelector<HTMLElement>(
      `.soundboard-cell[data-track-id="${noteBurst.trackId}"][data-step="${noteBurst.stepIndex}"].is-active`,
    );
    if (cell) playNoteCellAnimation(cell);
  }, [noteBurst]);

  const moveNote = (
    fromTrackId: number,
    fromStepIndex: number,
    toTrackId: number,
    toStepIndex: number,
  ) => {
    if (fromTrackId === toTrackId && fromStepIndex === toStepIndex) return;

    setTracks((current) =>
      current.map((track) => {
        if (track.id !== fromTrackId && track.id !== toTrackId) return track;

        const notes = [...track.notes];
        if (track.id === fromTrackId) notes[fromStepIndex] = false;
        if (track.id === toTrackId) notes[toStepIndex] = true;
        return { ...track, notes };
      }),
    );
  };

  const addInstrument = () => {
    setTracks((current) => [
      ...current,
      createTrack(nextTrackIdRef.current++, selectedInstrumentId),
    ]);
  };

  const removeInstrument = (trackId: number) => {
    setTracks((current) => current.filter((track) => track.id !== trackId));
  };

  const moveTrack = (trackId: number, direction: -1 | 1) => {
    setTracks((current) => {
      const index = current.findIndex((track) => track.id === trackId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length)
        return current;

      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];
      return reordered;
    });
  };

  const updateTrackChord = (
    trackId: number,
    property: "chordRoot" | "chordQuality",
    value: string,
  ) => {
    setTracks((current) =>
      current.map((track) =>
        track.id === trackId ? { ...track, [property]: value } : track,
      ),
    );
  };

  const clearGrid = () =>
    setTracks((current) =>
      current.map((track) => ({ ...track, notes: Array(STEPS).fill(false) })),
    );

  const getSettings = (nextSeed: string): GenerationSettings => ({
    seed: nextSeed,
    genre,
    key,
    density,
    variation,
    tempo,
  });

  const applySeed = (nextSeed: string) => {
    setSeed(nextSeed);
    setSeedDraft(nextSeed);
    setTracks((current) => applySeededArrangement(current, getSettings(nextSeed)));
  };

  const resetGrid = () => {
    nextTrackIdRef.current = DEFAULT_TRACK_COUNT;
    setTracks(createSeededTracks(getSettings(seed)));
  };

  const generateArrangement = () => applySeed(randomSeed());

  const commitSeedDraft = () => {
    const nextSeed = normalizeSeed(seedDraft);
    if (!nextSeed) {
      setSeedDraft(seed);
      return;
    }
    if (nextSeed !== seed) applySeed(nextSeed);
    else setSeedDraft(nextSeed);
  };

  useEffect(() => {
    syncSettingsToUrl({ seed, genre, key, density, variation, tempo });
  }, [seed, genre, key, density, variation, tempo]);

  const activeTrack =
    tracks.find(({ id }) => id === selectedTrackId) ?? tracks[0];
  const activeInstrument = findInstrument(activeTrack?.instrumentId ?? "");

  return (
    <main className={`soundboard-app soundboard-grain-${grain}`}>
      <Container fluid size="xl" style={{
        marginTop: '15px'
      }}>
        <Stack gap="0">
          <div
            style={{
              cursor: "pointer",
              color: "#e1e4d5",
              fontFamily: "'Libre Baskerville', serif",
              fontSize: "clamp(16px, 2.5vw, 22px)",
              fontStyle: "italic",
              fontWeight: 400,
              letterSpacing: "-0.08em",
              lineHeight: 1.45,
              pointerEvents: "auto",
              textTransform: "none",
              zIndex: 100000,
              
            }}
            onClick={() => navigate("/")}
          >
            Playground No.5: Soundboard
          </div>
          <div className="garden-kicker" style={{
            fontSize: "clamp(8px, 1.5vw, 12px)",
            marginBottom: 10
          }
          }>
            developed with inspirations from{" "}
            <Badge
              color="orange"
              variant="light"
              autoContrast
              size="sm"
              style={{
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                pointerEvents: "auto",
                
                zIndex: 100000,
              }}
              onClick={() =>
                window.open("https://seq.halfof8.com/", "_blank")
              }
            >
              Anton Sokolov
            </Badge>
          </div>
          <Paper withBorder radius={0} p="md" className="soundboard-panel">
            <Stack gap="lg">
              <div className="soundboard-generation-controls">
                <div className="soundboard-reference-controls">
                  <div className="soundboard-level-control">
                    <span>SWING</span>
                    <div
                      className="soundboard-levels"
                      role="group"
                      aria-label="Swing level"
                    >
                      {[-50, -25, 0, 25].map((level) => (
                        <Tooltip key={level} label={`Swing ${level}`}>
                          <button
                            type="button"
                            className={swing === level ? "is-selected" : ""}
                            aria-label={`Swing ${level}`}
                            aria-pressed={swing === level}
                            onClick={() => setSwing(level)}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <div className="soundboard-level-control">
                    <span>DENSITY</span>
                    <div
                      className="soundboard-levels"
                      role="group"
                      aria-label="Density level"
                    >
                      {[8, 16, 24, 32].map((level) => (
                        <Tooltip key={level} label={`Density ${level}`}>
                          <button
                            type="button"
                            className={density === level ? "is-selected" : ""}
                            aria-label={`Density ${level}`}
                            aria-pressed={density === level}
                            onClick={() => setDensity(level)}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <div className="soundboard-level-control">
                    <span>VARIATION</span>
                    <div
                      className="soundboard-levels"
                      role="group"
                      aria-label="Variation level"
                    >
                      {[0, 10, 20, 30].map((level) => (
                        <Tooltip key={level} label={`Variation ${level}`}>
                          <button
                            type="button"
                            className={variation === level ? "is-selected" : ""}
                            aria-label={`Variation ${level}`}
                            aria-pressed={variation === level}
                            onClick={() => setVariation(level)}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <div className="soundboard-key-control">
                    <span>KEY</span>
                    <div
                      className="soundboard-piano"
                      role="group"
                      aria-label="Key"
                    >
                      <div className="soundboard-piano-white-keys">
                        {CHORD_ROOTS.filter(({ value }) => !value.includes("#")).map(
                          ({ value }) => (
                            <button
                              key={value}
                              type="button"
                              className={`soundboard-piano-key soundboard-piano-white-key ${key === value ? "is-selected" : ""}`}
                              aria-label={`Key ${value}`}
                              aria-pressed={key === value}
                              onClick={() => setKey(value)}
                            >
                              {value}
                            </button>
                          ),
                        )}
                      </div>
                      <div className="soundboard-piano-black-keys">
                        {CHORD_ROOTS.filter(({ value }) => value.includes("#")).map(
                          ({ value, semitones }) => (
                            <button
                              key={value}
                              type="button"
                              className={`soundboard-piano-key soundboard-piano-black-key ${key === value ? "is-selected" : ""}`}
                              style={{ left: `${(semitones / 12) * 100}%` }}
                              aria-label={`Key ${value}`}
                              aria-pressed={key === value}
                              onClick={() => setKey(value)}
                            >
                              {value}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="soundboard-level-control">
                    <span>GRAIN</span>
                    <div
                      className="soundboard-levels"
                      role="group"
                      aria-label="Grain level"
                    >
                      {[1, 2, 3, 4].map((level) => (
                        <Tooltip key={level} label={`Grain ${level}`}>
                          <button
                            type="button"
                            className={grain === level ? "is-selected" : ""}
                            aria-label={`Grain ${level}`}
                            aria-pressed={grain === level}
                            onClick={() => setGrain(level)}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <div className="soundboard-level-control">
                    <span>VOLUME</span>
                    <div
                      className="soundboard-levels"
                      role="group"
                      aria-label="Volume"
                    >
                      {[0, 25, 50, 75, 100].map((level) => (
                        <Tooltip key={level} label={`Volume ${level}%`}>
                          <button
                            type="button"
                            className={volume === level ? "is-selected" : ""}
                            aria-label={`Volume ${level}%`}
                            aria-pressed={volume === level}
                            onClick={() => setVolume(level)}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <div
                    className="soundboard-genre-control"
                    role="group"
                    aria-label="Generation genre"
                  >
                    <span>GENRE</span>
                    <div className="soundboard-genre-choices">
                      {GENERATION_GENRES.map(({ id, kanji, label }) => (
                        <Tooltip key={id} label={label}>
                          <button
                            type="button"
                            className={
                              genre === id
                                ? "soundboard-genre-choice is-selected"
                                : "soundboard-genre-choice"
                            }
                            aria-label={`Generate ${label}`}
                            aria-pressed={genre === id}
                            onClick={() => setGenre(id)}
                          >
                            {kanji}
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <div className="soundboard-seed-control">
                    <span>SEED</span>
                    <input
                      className="soundboard-seed-input"
                      value={seedDraft}
                      maxLength={24}
                      spellCheck={false}
                      autoComplete="off"
                      aria-label="Arrangement seed"
                      onChange={(event) => setSeedDraft(event.target.value)}
                      onBlur={commitSeedDraft}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        } else if (event.key === "Escape") {
                          setSeedDraft(seed);
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                  <Tooltip label="Generate arrangement with a new random seed">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-xs"
                      leftSection={<IconDice5 size={14} />}
                      onClick={generateArrangement}
                    >
                      Generate
                    </Button>
                  </Tooltip>
                </div>

                <Group>
                  <Text size="xs" fw={700}>
                    BPM
                  </Text>
                  <div
                    className="soundboard-levels soundboard-tempo-levels"
                    role="group"
                    aria-label="Tempo"
                  >
                    {[60, 80, 100, 120, 140].map((level) => (
                      <Tooltip key={level} label={`${level} BPM`}>
                        <button
                          type="button"
                          className={tempo === level ? "is-selected" : ""}
                          aria-label={`${level} BPM`}
                          aria-pressed={tempo === level}
                          onClick={() => setTempo(level)}
                        />
                      </Tooltip>
                    ))}
                  </div>
                  <Text size="xs" aria-label={`${tempo} BPM`}>
                    {tempo} BPM
                  </Text>
                  <Tooltip label={isPlaying ? "Pause loop" : "Play loop"}>
                    <Button
                      variant={isPlaying ? "filled" : "light"}
                      color="orange"
                      size="compact-xs"
                      className={
                        isPlaying
                          ? "soundboard-play-button is-playing"
                          : "soundboard-play-button"
                      }
                      leftSection={
                        isPlaying ? (
                          <IconPlayerPause size={14} />
                        ) : (
                          <IconPlayerPlay size={14} />
                        )
                      }
                      onClick={togglePlayback}
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                  </Tooltip>
                  <Tooltip label="Stop and return to first column">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-xs"
                      disabled={currentStep < 0}
                      leftSection={<IconPlayerStop size={14} />}
                      onClick={stop}
                    >
                      Stop
                    </Button>
                  </Tooltip>
                  <Tooltip label="Reset band">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-xs"
                      leftSection={<IconRefresh size={14} />}
                      onClick={resetGrid}
                    >
                      Reset
                    </Button>
                  </Tooltip>
                  <Tooltip label="Clear all notes">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={clearGrid}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                </Group>
              </div>
              <Group
                align="center"
                gap="sm"
                className="soundboard-add-control"
              >
                <Group align="center" gap="md">
                  <div
                    className="soundboard-genre-control"
                    role="group"
                    aria-label="Instrument to add"
                  >
                    <span>ADD AN INSTRUMENT</span>
                    <div className="soundboard-genre-choices">
                      {INSTRUMENTS.map(({ id, name, kanji }) => (
                        <Tooltip key={id} label={name}>
                          <button
                            type="button"
                            className={
                              selectedInstrumentId === id
                                ? "soundboard-genre-choice is-selected"
                                : "soundboard-genre-choice"
                            }
                            aria-label={`Select ${name}`}
                            aria-pressed={selectedInstrumentId === id}
                            onClick={() => setSelectedInstrumentId(id)}
                          >
                            {kanji}
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                  <Tooltip label="Add track">
                    <Button
                      variant="subtle"
                      color="gray"
                      size="compact-xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={addInstrument}
                    >
                      Add track
                    </Button>
                  </Tooltip>
                </Group>

                <Text size="xs" c="dimmed" className="soundboard-hint">
                  {isMobileLayout
                    ? "Tap an empty cell to place and play a note, tap a note to play it, double-tap a note to delete it, tap an instrument header to edit its chord"
                    : "Click an empty cell to place and play a note, click a note to play it, double-click a note to delete it, or drag a note into an empty cell"}
                </Text>
              </Group>

              {tracks.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  Your band is empty. Add an instrument to start arranging.
                </Text>
              ) : isMobileLayout ? (
                <div className="soundboard-vertical">
                  {activeTrack && (
                    <div className="soundboard-track-editor">
                      <span
                        className="soundboard-track-editor-name"
                        style={{ color: activeInstrument.color }}
                      >
                        {activeInstrument.kanji} {activeInstrument.shortName}
                      </span>
                      <select
                        className="soundboard-chord-select"
                        aria-label={`${activeInstrument.name} chord root`}
                        value={activeTrack.chordRoot}
                        onChange={(event) =>
                          updateTrackChord(
                            activeTrack.id,
                            "chordRoot",
                            event.target.value,
                          )
                        }
                      >
                        {CHORD_ROOTS.map(({ value }) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                      <select
                        className="soundboard-chord-select"
                        aria-label={`${activeInstrument.name} chord quality`}
                        value={activeTrack.chordQuality}
                        onChange={(event) =>
                          updateTrackChord(
                            activeTrack.id,
                            "chordQuality",
                            event.target.value,
                          )
                        }
                      >
                        {CHORD_QUALITIES.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <span className="soundboard-track-editor-actions">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          disabled={tracks[0]?.id === activeTrack.id}
                          onClick={() => moveTrack(activeTrack.id, -1)}
                          aria-label={`Move ${activeInstrument.name} left`}
                        >
                          <IconChevronLeft size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          disabled={tracks.at(-1)?.id === activeTrack.id}
                          onClick={() => moveTrack(activeTrack.id, 1)}
                          aria-label={`Move ${activeInstrument.name} right`}
                        >
                          <IconChevronRight size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          onClick={() => removeInstrument(activeTrack.id)}
                          aria-label={`Remove ${activeInstrument.name}`}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </span>
                    </div>
                  )}
                  <div
                    className="soundboard-vgrid"
                    ref={soundboardGridRef}
                    role="grid"
                    aria-label="Song arrangement grid"
                    style={{
                      gridTemplateColumns: `22px repeat(${tracks.length}, minmax(0, 1fr))`,
                    }}
                  >
                    <div className="soundboard-grid-corner" />
                    {tracks.map((track) => {
                      const instrument = findInstrument(track.instrumentId);
                      return (
                        <button
                          type="button"
                          key={track.id}
                          className={`soundboard-vtrack-head ${activeTrack?.id === track.id ? "is-selected" : ""}`}
                          style={{ color: instrument.color }}
                          aria-label={`Edit ${instrument.name}`}
                          aria-pressed={activeTrack?.id === track.id}
                          onClick={() => setSelectedTrackId(track.id)}
                        >
                          {instrument.kanji}
                        </button>
                      );
                    })}
                    <div
                      className="soundboard-playhead is-vertical"
                      aria-hidden="true"
                      ref={playheadRef}
                      style={currentStep < 0 ? { opacity: 0 } : undefined}
                    />
                    {Array.from({ length: STEPS }, (_, stepIndex) => (
                      <Fragment key={stepIndex}>
                        <div
                          className={`soundboard-step-label ${stepIndex % 4 === 0 ? "is-beat" : ""}`}
                        >
                          {stepIndex + 1}
                        </div>
                        {tracks.map((track) => {
                          const instrument = findInstrument(track.instrumentId);
                          const active = track.notes[stepIndex];
                          const label = `${instrument.name}, ${instrument.noteNames[stepIndex % instrument.noteNames.length]}, step ${stepIndex + 1}${active ? ", active" : ""}`;
                          return (
                            <button
                              type="button"
                              role="gridcell"
                              key={`${track.id}-${stepIndex}`}
                              aria-label={label}
                              aria-pressed={active}
                              data-step={stepIndex}
                              data-track-id={track.id}
                              className={`soundboard-cell ${active ? "is-active" : ""} ${currentStep === stepIndex ? "is-current" : ""} ${stepIndex % 4 === 0 ? "is-beat" : ""}`}
                              style={
                                active
                                  ? ({
                                      "--note-color": getNoteColor(
                                        track.id,
                                        stepIndex,
                                        instrument.color,
                                      ),
                                      ...getNoteAccents(track.id, stepIndex),
                                    } as CSSProperties)
                                  : undefined
                              }
                              onClick={(event) =>
                                handleNoteCellClick(
                                  track,
                                  stepIndex,
                                  active,
                                  event.detail,
                                )
                              }
                              onDoubleClick={() => clearNote(track.id, stepIndex)}
                            >
                              {active && (
                                <NoteCellContent
                                  instrument={instrument}
                                  trackId={track.id}
                                  stepIndex={stepIndex}
                                />
                              )}
                            </button>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="soundboard-grid-wrap">
                  <div
                    className="soundboard-grid"
                    ref={soundboardGridRef}
                    role="grid"
                    aria-label="Song arrangement grid"
                  >
                    <div className="soundboard-grid-corner" />
                    <div
                      className="soundboard-playhead"
                      aria-hidden="true"
                      ref={playheadRef}
                      style={currentStep < 0 ? { opacity: 0 } : undefined}
                    />
                    {Array.from({ length: STEPS }, (_, stepIndex) => (
                      <div
                        key={stepIndex}
                        className={`soundboard-step-label ${stepIndex % 4 === 0 ? "is-beat" : ""}`}
                      >
                        {stepIndex + 1}
                      </div>
                    ))}
                    {tracks.map((track) => {
                      const instrument =
                        INSTRUMENTS.find(
                          ({ id }) => id === track.instrumentId,
                        ) ?? INSTRUMENTS[0];
                      const InstrumentIcon = instrument.icon;
                      return (
                        <div
                          className="soundboard-row"
                          key={track.id}
                          role="row"
                        >
                          <Group
                            className="soundboard-row-label"
                            align="flex-end"
                          >
                            <InstrumentIcon
                              className="soundboard-instrument-icon"
                              style={{ color: instrument.color }}
                              size={14}
                              stroke={1.8}
                              aria-hidden="true"
                            />
                            <span title={instrument.name}>
                              {instrument.shortName}
                            </span>
                            <select
                              className="soundboard-chord-select"
                              aria-label={`${instrument.name} chord root`}
                              value={track.chordRoot}
                              onChange={(event) =>
                                updateTrackChord(
                                  track.id,
                                  "chordRoot",
                                  event.target.value,
                                )
                              }
                            >
                              {CHORD_ROOTS.map(({ value }) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                            <select
                              className="soundboard-chord-select"
                              aria-label={`${instrument.name} chord quality`}
                              value={track.chordQuality}
                              onChange={(event) =>
                                updateTrackChord(
                                  track.id,
                                  "chordQuality",
                                  event.target.value,
                                )
                              }
                            >
                              {CHORD_QUALITIES.map(({ value, label }) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <span className="soundboard-row-actions">
                              <Divider
                                c="dark"
                                mr="sm"
                                orientation="vertical"
                              />
                              <Tooltip label={`Move ${instrument.name} up`}>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  disabled={
                                    tracks.findIndex(
                                      ({ id }) => id === track.id,
                                    ) === 0
                                  }
                                  onClick={() => moveTrack(track.id, -1)}
                                  aria-label={`Move ${instrument.name} up`}
                                >
                                  <IconChevronUp size={13} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={`Move ${instrument.name} down`}>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  disabled={
                                    tracks.findIndex(
                                      ({ id }) => id === track.id,
                                    ) ===
                                    tracks.length - 1
                                  }
                                  onClick={() => moveTrack(track.id, 1)}
                                  aria-label={`Move ${instrument.name} down`}
                                >
                                  <IconChevronDown size={13} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={`Remove ${instrument.name}`}>
                                <ActionIcon
                                  mr="sm"
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  onClick={() => removeInstrument(track.id)}
                                  aria-label={`Remove ${instrument.name}`}
                                >
                                  <IconX size={13} />
                                </ActionIcon>
                              </Tooltip>
                            </span>
                          </Group>
                          {track.notes.map((active, stepIndex) => {
                              const isDragOver =
                                dragOverCell?.trackId === track.id &&
                                dragOverCell.stepIndex === stepIndex;
                              const noteColor = getNoteColor(
                                track.id,
                                stepIndex,
                                instrument.color,
                              );
                              return (
                            <Tooltip
                              key={`${track.id}-${stepIndex}`}
                              label={`${instrument.name}, ${instrument.noteNames[stepIndex % instrument.noteNames.length]}, step ${stepIndex + 1}${active ? ", active" : ""}`}
                            >
                              <button
                                type="button"
                                role="gridcell"
                                aria-label={`${instrument.name}, ${instrument.noteNames[stepIndex % instrument.noteNames.length]}, step ${stepIndex + 1}${active ? ", active" : ""}`}
                                aria-pressed={active}
                                data-step={stepIndex}
                                data-track-id={track.id}
                                className={`soundboard-cell ${active ? "is-active" : ""} ${currentStep === stepIndex ? "is-current" : ""} ${stepIndex % 4 === 0 ? "is-beat" : ""} ${isDragOver ? "is-drag-over" : ""}`}
                                style={
                                  active
                                    ? ({
                                        "--note-color": noteColor,
                                        ...getNoteAccents(track.id, stepIndex),
                                      } as CSSProperties)
                                    : undefined
                                }
                                draggable={active}
                                onClick={(event) => {
                                  if (wasDragged) {
                                    setWasDragged(false);
                                    return;
                                  }
                                  handleNoteCellClick(
                                    track,
                                    stepIndex,
                                    active,
                                    event.detail,
                                  );
                                }}
                                onDoubleClick={() => clearNote(track.id, stepIndex)}
                                onDragStart={(event) => {
                                  if (!active) {
                                    event.preventDefault();
                                    return;
                                  }
                                  setDraggedNote({
                                    trackId: track.id,
                                    stepIndex,
                                  });
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    `${track.id}:${stepIndex}`,
                                  );
                                }}
                                onDragOver={(event) => {
                                  if (!draggedNote || active) return;
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                  setDragOverCell({
                                    trackId: track.id,
                                    stepIndex,
                                  });
                                }}
                                onDragLeave={() => {
                                  if (
                                    dragOverCell?.trackId === track.id &&
                                    dragOverCell.stepIndex === stepIndex
                                  ) {
                                    setDragOverCell(null);
                                  }
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (!draggedNote || active) return;
                                  moveNote(
                                    draggedNote.trackId,
                                    draggedNote.stepIndex,
                                    track.id,
                                    stepIndex,
                                  );
                                  previewNote(track, stepIndex);
                                  triggerNoteBurst(track.id, stepIndex);
                                  setWasDragged(true);
                                  setDraggedNote(null);
                                  setDragOverCell(null);
                                }}
                                onDragEnd={() => {
                                  setDraggedNote(null);
                                  setDragOverCell(null);
                                }}
                              >
                                {active && (
                                  <NoteCellContent
                                    instrument={instrument}
                                    trackId={track.id}
                                    stepIndex={stepIndex}
                                  />
                                )}
                              </button>
                            </Tooltip>
                              );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </main>
  );
}
