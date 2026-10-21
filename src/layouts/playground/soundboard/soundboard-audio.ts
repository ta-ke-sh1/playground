export type GenreId = "deep-house" | "lo-fi" | "breakbeat" | "ambient";

type SoundProfile = {
  brightness: number;
  attack: number;
  decay: number;
  detune: number;
  reverb: number;
  delay: number;
  kickPitch: number;
  kickDecay: number;
  hatDecay: number;
};

// Genre acts as the "theme": it reshapes every instrument's filter, envelope, drift and space.
export const SOUND_PROFILES: Record<GenreId, SoundProfile> = {
  "deep-house": {
    brightness: 1,
    attack: 1,
    decay: 1,
    detune: 4,
    reverb: 0.18,
    delay: 0.14,
    kickPitch: 1,
    kickDecay: 1,
    hatDecay: 1,
  },
  "lo-fi": {
    brightness: 0.42,
    attack: 1.3,
    decay: 1.2,
    detune: 20,
    reverb: 0.22,
    delay: 0.1,
    kickPitch: 0.85,
    kickDecay: 1.15,
    hatDecay: 0.8,
  },
  breakbeat: {
    brightness: 1.5,
    attack: 0.6,
    decay: 0.65,
    detune: 2,
    reverb: 0.06,
    delay: 0.2,
    kickPitch: 1.15,
    kickDecay: 0.8,
    hatDecay: 0.7,
  },
  ambient: {
    brightness: 0.8,
    attack: 3,
    decay: 2.8,
    detune: 9,
    reverb: 0.55,
    delay: 0.35,
    kickPitch: 0.7,
    kickDecay: 1.6,
    hatDecay: 1.8,
  },
};

// How much of each instrument is sent to the shared reverb/delay.
const SPACE: Record<string, number> = {
  kick: 0,
  clap: 0.35,
  hat: 0.15,
  bells: 0.9,
  lead: 0.6,
  keys: 0.5,
  bass: 0,
  pluck: 0.7,
};

export type FxBus = {
  output: AudioNode;
  reverbSend: GainNode;
  reverbReturn: GainNode;
  delaySend: GainNode;
  delayReturn: GainNode;
  delay: DelayNode;
};

function createImpulse(context: AudioContext, seconds: number, curve: number) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, curve);
    }
  }
  return impulse;
}

export function createFxBus(context: AudioContext, output: AudioNode): FxBus {
  const reverbSend = context.createGain();
  const convolver = context.createConvolver();
  const reverbReturn = context.createGain();
  convolver.buffer = createImpulse(context, 2.6, 2.6);
  reverbReturn.gain.value = 0;
  reverbSend.connect(convolver).connect(reverbReturn).connect(output);

  const delaySend = context.createGain();
  const delay = context.createDelay(2);
  const feedback = context.createGain();
  const feedbackFilter = context.createBiquadFilter();
  const delayReturn = context.createGain();
  feedback.gain.value = 0.4;
  feedbackFilter.type = "lowpass";
  feedbackFilter.frequency.value = 2400;
  delayReturn.gain.value = 0;
  delaySend.connect(delay);
  delay.connect(feedbackFilter).connect(feedback).connect(delay);
  delay.connect(delayReturn).connect(output);

  return { output, reverbSend, reverbReturn, delaySend, delayReturn, delay };
}

export function applyFxProfile(
  context: AudioContext,
  bus: FxBus,
  genre: GenreId,
  tempo: number,
) {
  const profile = SOUND_PROFILES[genre];
  const now = context.currentTime;
  bus.reverbReturn.gain.setTargetAtTime(profile.reverb, now, 0.08);
  bus.delayReturn.gain.setTargetAtTime(profile.delay, now, 0.08);
  bus.delay.delayTime.setTargetAtTime((60 / tempo) * 0.75, now, 0.05);
}

function route(
  context: AudioContext,
  bus: FxBus,
  node: AudioNode,
  instrumentId: string,
) {
  node.connect(bus.output);
  const amount = SPACE[instrumentId] ?? 0;
  if (amount <= 0) return;
  const send = context.createGain();
  send.gain.value = amount;
  node.connect(send);
  send.connect(bus.reverbSend);
  send.connect(bus.delaySend);
}

function envelope(
  gain: GainNode,
  start: number,
  peak: number,
  attack: number,
  end: number,
) {
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + end);
}

function drift(oscillator: OscillatorNode, profile: SoundProfile, extra = 0) {
  oscillator.detune.value = extra + (Math.random() * 2 - 1) * profile.detune;
}

function playKick(context: AudioContext, bus: FxBus, profile: SoundProfile) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const decay = 0.25 * profile.kickDecay;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(105 * profile.kickPitch, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    42 * profile.kickPitch,
    now + 0.16 * profile.kickDecay,
  );
  envelope(gain, now, 0.8, 0.004, decay);
  oscillator.connect(gain);
  route(context, bus, gain, "kick");
  oscillator.start(now);
  oscillator.stop(now + decay + 0.02);
}

function playNoise(
  context: AudioContext,
  bus: FxBus,
  profile: SoundProfile,
  kind: "clap" | "hat",
) {
  const now = context.currentTime;
  const duration = kind === "clap" ? 0.18 : 0.07 * profile.hatDecay;
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const noise = buffer.getChannelData(0);
  for (let index = 0; index < noise.length; index += 1) {
    noise[index] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = kind === "clap" ? "bandpass" : "highpass";
  filter.frequency.value = Math.min(
    (kind === "clap" ? 1500 : 7000) * profile.brightness,
    12000,
  );

  if (kind === "clap") {
    // Three fast re-triggers followed by a tail read as a hand clap rather than a noise burst.
    gain.gain.setValueAtTime(0.0001, now);
    [0, 0.012, 0.026].forEach((offset) => {
      gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.04, now + offset + 0.01);
    });
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  } else {
    envelope(gain, now, 0.08, 0.002, duration);
  }

  source.connect(filter).connect(gain);
  route(context, bus, gain, kind);
  source.start(now);
  source.stop(now + duration);
}

type VoiceArgs = {
  context: AudioContext;
  bus: FxBus;
  profile: SoundProfile;
  frequency: number;
  start: number;
};

function playBell({ context, bus, profile, frequency, start }: VoiceArgs) {
  // Inharmonic partials with different decay times give the glassy bell timbre.
  const partials = [
    { ratio: 1, level: 1, decay: 1.6 },
    { ratio: 2.76, level: 0.35, decay: 0.9 },
    { ratio: 5.4, level: 0.12, decay: 0.45 },
  ];
  partials.forEach(({ ratio, level, decay }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const length = decay * profile.decay;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency * ratio;
    drift(oscillator, profile);
    envelope(gain, start, 0.05 * level, 0.004 * profile.attack, length);
    oscillator.connect(gain);
    route(context, bus, gain, "bells");
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
  });
}

function playLead({ context, bus, profile, frequency, start }: VoiceArgs) {
  const length = 0.55 * profile.decay;
  const attack = 0.05 * profile.attack;
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const lfo = context.createOscillator();
  const lfoDepth = context.createGain();
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(900 * profile.brightness, start);
  filter.frequency.exponentialRampToValueAtTime(
    Math.min(2600 * profile.brightness, 12000),
    start + attack + 0.1,
  );
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.04, start + attack);
  gain.gain.setTargetAtTime(0.026, start + attack, 0.08);
  gain.gain.setTargetAtTime(0.0001, start + length * 0.6, length * 0.12);
  lfo.frequency.value = 5.5;
  lfoDepth.gain.value = 7;
  lfo.connect(lfoDepth);

  [-9, 9].forEach((cents) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;
    drift(oscillator, profile, cents);
    lfoDepth.connect(oscillator.detune);
    oscillator.connect(filter);
    oscillator.start(start);
    oscillator.stop(start + length + 0.1);
  });
  filter.connect(gain);
  route(context, bus, gain, "lead");
  lfo.start(start);
  lfo.stop(start + length + 0.1);
}

function playKeys({ context, bus, profile, frequency, start }: VoiceArgs) {
  const length = 0.9 * profile.decay;
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(3200 * profile.brightness, 12000);
  envelope(gain, start, 0.075, 0.006 * profile.attack, length);
  [
    { type: "triangle" as const, ratio: 1, level: 1 },
    { type: "sine" as const, ratio: 2, level: 0.35 },
    { type: "sine" as const, ratio: 4, level: 0.08 },
  ].forEach(({ type, ratio, level }) => {
    const oscillator = context.createOscillator();
    const partial = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * ratio;
    partial.gain.value = level;
    drift(oscillator, profile);
    oscillator.connect(partial).connect(filter);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
  });
  filter.connect(gain);
  route(context, bus, gain, "keys");
}

function playBass({ context, bus, profile, frequency, start }: VoiceArgs) {
  const length = 0.32 * profile.decay;
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  filter.Q.value = 5;
  filter.frequency.setValueAtTime(Math.min(1100 * profile.brightness, 8000), start);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(160 * profile.brightness, 80),
    start + 0.16,
  );
  envelope(gain, start, 0.16, 0.01 * profile.attack, length);
  [
    { type: "square" as const, ratio: 1, level: 0.6 },
    { type: "sine" as const, ratio: 0.5, level: 1 },
  ].forEach(({ type, ratio, level }) => {
    const oscillator = context.createOscillator();
    const partial = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * ratio;
    partial.gain.value = level;
    drift(oscillator, profile);
    oscillator.connect(partial).connect(filter);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
  });
  filter.connect(gain);
  route(context, bus, gain, "bass");
}

function playPluck({ context, bus, profile, frequency, start }: VoiceArgs) {
  const length = 0.4 * profile.decay;
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = frequency;
  drift(oscillator, profile);
  filter.type = "lowpass";
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(Math.min(4800 * profile.brightness, 12000), start);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(420 * profile.brightness, 120),
    start + 0.22 * profile.decay,
  );
  envelope(gain, start, 0.07, 0.003 * profile.attack, length);
  oscillator.connect(filter).connect(gain);
  route(context, bus, gain, "pluck");
  oscillator.start(start);
  oscillator.stop(start + length + 0.05);
}

const TONAL_VOICES: Record<string, (args: VoiceArgs) => void> = {
  bells: playBell,
  lead: playLead,
  keys: playKeys,
  bass: playBass,
  pluck: playPluck,
};

// Per-instrument delay between chord notes (a strum), in seconds.
const STRUM: Record<string, number> = {
  bells: 0.035,
  pluck: 0.02,
  keys: 0.008,
  lead: 0,
  bass: 0,
};

export function playInstrument(
  context: AudioContext,
  bus: FxBus,
  genre: GenreId,
  instrumentId: string,
  voice: "tonal" | "kick" | "clap" | "hat",
  frequencies: number[],
) {
  const profile = SOUND_PROFILES[genre];

  if (voice === "kick") return playKick(context, bus, profile);
  if (voice === "clap" || voice === "hat") {
    return playNoise(context, bus, profile, voice);
  }

  const play = TONAL_VOICES[instrumentId];
  if (!play) return;
  const now = context.currentTime;
  const strum = STRUM[instrumentId] ?? 0;
  frequencies.forEach((frequency, index) => {
    play({ context, bus, profile, frequency, start: now + index * strum });
  });
}
