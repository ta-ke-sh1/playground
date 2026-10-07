export const PALETTES = [
  ["Lagoon Ember", "#001219", "#EE9B00", "#0A9396", "#E9D8A6", "#E9D8A6"],
  ["Pink Sorbet", "#FFE5EC", "#FB6F92", "#FF8FAB", "#FFB3C6", "#51202F"],
  ["Sunset", "#577590", "#F94144", "#43AA8B", "#F9C74F", "#FFF8EB"],
  ["Electric Orchid", "#160A2A", "#D000FF", "#00E5A8", "#FF5CC8", "#FFF0FF"],
  ["Arctic Flame", "#102A43", "#FF4D6D", "#00C2A8", "#FFD166", "#F1FAFF"],
  ["Deep Current", "#005F73", "#CA6702", "#0A9396", "#94D2BD", "#FFF3D6"],
  ["Berry Bloom", "#FFC2D1", "#FB6F92", "#FF8FAB", "#FFE5EC", "#51202F"],
  ["Golden Hour", "#F9C74F", "#F94144", "#43AA8B", "#F3722C", "#263746"],
  ["Solar Flare", "#21130A", "#FFB000", "#D1495B", "#FFE08A", "#FFF7E8"],
  ["Sky Wash", "#E3F2FD", "#1565C0", "#E9D8A6", "#90CAF9", "#0D47A1"],
] as const;

export type Palette = (typeof PALETTES)[number];
export type Flower = "rose" | "lily" | "lotus";
export type FlowerMode = "all" | Flower;
type Point = [number, number];
type GardenColors = {
  bg: string;
  flower: string;
  stem: string;
  detail: string;
  text: string;
};
type Branch = {
  at: number;
  side: -1 | 1;
  length: number;
  curve: number;
};
type Sprout = {
  seed: number;
  born: number;
  x: number;
  y: number;
  flower: Flower;
  tilt: number;
  direction: -1 | 1;
  length: number;
  petals: number;
  bloomScale: number;
  curve: number;
  sway: number;
  branches: Branch[];
  dead?: number;
};
type GardenLetter = {
  char: string;
  id: number;
  born: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  sprouts: Sprout[];
  dead?: number;
  cut?: number;
};
type Butterfly = {
  id: number;
  phase: number;
  size: number;
  state: "entering" | "perched" | "leaving";
  born: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  curveX: number;
  curveY: number;
  flightDuration: number;
};
type GardenBloom = {
  x: number;
  y: number;
  radius: number;
  flower: Flower;
  seed: number;
  born: number;
};

const clamp = (value: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, value));
const ease = (value: number) => {
  const t = clamp(value);
  return 1 - Math.pow(1 - t, 3);
};
const MOTION_RATE = 0.72;

// Stems and flowers animate on a stepped clock for a slightly choppy, hand-animated feel.
// Text, caret and butterflies stay smooth.
export const FPS = 10;
const FRAME_MS = 1000 / FPS;
const MAX_BUTTERFLIES = 5;
const MAX_DOUBLE_CLICK_FLOWERS = 6;

export class GardenEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  palette: Palette = PALETTES[0];
  flowerMode: FlowerMode = "all";
  letters: GardenLetter[] = [];
  width = 0;
  height = 0;
  dpr = 1;
  scale = 0;
  targetScale = 0;
  caretX = 0;
  caretY = 0;
  targetCaretX = 0;
  targetCaretY = 0;
  nextId = 1;
  previousFrame = 0;
  butterflies: Butterfly[] = [];
  departingButterflies: Butterfly[] = [];
  flowerBursts: GardenBloom[] = [];
  metrics: Record<string, number> = {};
  lastKey = 0;
  startedAt = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported in this browser.");
    this.ctx = context;
    this.resize();
  }

  get colors(): GardenColors {
    return {
      bg: this.palette[1],
      flower: this.palette[2],
      stem: this.palette[3],
      detail: this.palette[4],
      text: this.palette[5],
    };
  }

  random(seed: number) {
    let state = seed | 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  measure(char: string) {
    if (this.metrics[char] != null) return this.metrics[char];
    this.ctx.font = 'italic 400 100px "Libre Baskerville", serif';
    let width = (this.ctx.measureText(char).width / 100) * 0.9;
    if (char === " ") width *= 1.4;
    this.metrics[char] = width;
    return width;
  }

  resize = () => {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.width = bounds.width;
    this.height = bounds.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.layout(true);
  };

  layout(snap = false) {
    if (!this.width) return;
    const active = this.letters.filter((letter) => letter.dead == null);
    const horizontalPadding = Math.min(48, this.width * 0.08);
    const verticalPadding = Math.min(72, this.height * 0.1);
    const maxWidth = Math.max(1, this.width - horizontalPadding * 2);
    const maxHeight = Math.max(1, this.height - verticalPadding * 2);
    const size0 = Math.min(this.height * 0.28, maxWidth * 0.19);
    const widths = active.map((letter) => this.measure(letter.char));
    const runs: { indices: number[]; isWord: boolean }[] = [];
    for (let index = 0; index < active.length; ) {
      const isWord = active[index].char !== " ";
      const indices: number[] = [];
      while (index < active.length && (active[index].char !== " ") === isWord)
        indices.push(index++);
      if (isWord) {
        while (index < active.length && active[index].char === " ")
          indices.push(index++);
      }
      runs.push({ indices, isWord });
    }

    const makeLines = (fontSize: number) => {
      const result: number[][] = [[]];
      let lineWidth = 0;
      const nextLine = () => {
        result.push([]);
        lineWidth = 0;
      };
      runs.forEach((run) => {
        const wordIndices = run.isWord
          ? run.indices.filter((index) => active[index].char !== " ")
          : [];
        const spaceIndices = run.isWord
          ? run.indices.filter((index) => active[index].char === " ")
          : run.indices;
        const wordWidth = wordIndices.reduce(
          (sum, index) => sum + widths[index] * fontSize,
          0,
        );

        if (wordIndices.length) {
          if (
            wordWidth <= maxWidth &&
            lineWidth > 0 &&
            lineWidth + wordWidth > maxWidth
          )
            nextLine();

          wordIndices.forEach((index) => {
            const charWidth = widths[index] * fontSize;
            if (lineWidth > 0 && lineWidth + charWidth > maxWidth) nextLine();
            result[result.length - 1].push(index);
            lineWidth += charWidth;
          });
        }

        spaceIndices.forEach((index) => {
          const spaceWidth = widths[index] * fontSize;
          if (lineWidth > 0 && lineWidth + spaceWidth > maxWidth) nextLine();
          result[result.length - 1].push(index);
          lineWidth += spaceWidth;
        });
      });
      return result.filter((line) => line.length > 0);
    };

    let size = size0;
    let lines = makeLines(size);
    for (let attempt = 0; attempt < 16; attempt++) {
      const heightLimitedSize = maxHeight / (Math.max(1, lines.length) * 2.1);
      if (heightLimitedSize >= size) break;
      size = Math.max(8, Math.min(size, heightLimitedSize));
      lines = makeLines(size);
    }
    lines.forEach((line, lineIndex) => {
      const width = line.reduce((sum, index) => sum + widths[index] * size, 0);
      let x = this.width / 2 - width / 2;
      const y =
        this.height / 2 +
        (lineIndex - (lines.length - 1) / 2) * 2.1 * size +
        0.33 * size;
      line.forEach((index) => {
        const letter = active[index];
        letter.targetX = x + (widths[index] * size) / 2;
        letter.targetY = y;
        letter.width = widths[index] * size;
        x += letter.width;
      });
    });
    this.targetScale = size;
    const last = active[active.length - 1];
    this.targetCaretX = last
      ? last.targetX + last.width / 2 + 0.07 * size
      : this.width / 2;
    this.targetCaretY = last ? last.targetY - 0.33 * size : this.height / 2;
    active.forEach((letter) => {
      if (!letter.x) letter.x = letter.targetX;
      if (!letter.y) letter.y = letter.targetY;
    });
    if (snap || !this.scale) {
      this.scale = size;
      this.caretX = this.targetCaretX;
      this.caretY = this.targetCaretY;
      active.forEach((letter) => {
        letter.x = letter.targetX;
        letter.y = letter.targetY;
      });
    }
  }

  createFlower(
    char: string,
    letter: GardenLetter,
    born: number,
    wordSeed: number,
  ) {
    if (char === " ") return;
    const rand = this.random(
      wordSeed ^
        Math.floor(Math.random() * 0x7fffffff) ^
        Math.imul(letter.id + 1, 2654435761),
    );
    if (rand() < 0.2) return;
    const chosen =
      this.flowerMode === "all"
        ? (["rose", "lily", "lotus"] as const)[Math.floor(rand() * 3)]
        : this.flowerMode;
    const count = 1 + (rand() < 0.16 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const branches = Array.from({ length: Math.floor(rand() * 3) }, () => ({
        at: 0.3 + rand() * 0.5,
        side: rand() < 0.5 ? (-1 as const) : (1 as const),
        length: 0.16 + rand() * 0.2,
        curve: (rand() - 0.5) * 0.22,
      }));
      letter.sprouts.push({
        seed: Math.floor(rand() * 1e9),
        born: born + i * (90 + rand() * 130),
        x: (rand() - 0.5) * 0.72,
        y: -rand() * 0.34,
        flower: chosen,
        tilt: (rand() - 0.5) * 0.95,
        direction: rand() < 0.1 ? -1 : 1,
        length: 0.48 + rand() * 0.4,
        petals: 5 + Math.floor(rand() * 5),
        bloomScale: 0.2 + rand() * 0.1,
        curve: (rand() - 0.5) * 0.48,
        sway: 0.012 + rand() * 0.035,
        branches,
      });
    }
  }

  add(char: string, now = performance.now()) {
    if (char === "\n" || char === "\r") {
      this.clear(now);
      return;
    }
    if (char === "\t") return;
    const active = this.letters.filter((letter) => letter.dead == null);
    const previous = active[active.length - 1];
    if (char === " " && previous) previous.cut = now;
    const id = this.nextId++;
    const letter: GardenLetter = {
      char,
      id,
      born: now,
      x: this.width / 2,
      y: this.height / 2,
      targetX: 0,
      targetY: 0,
      width: 0,
      sprouts: [],
    };
    const wordStart =
      char === " " || !previous || previous.char === " "
        ? id
        : previous.id - (previous.id % 17);
    this.createFlower(char, letter, now, wordStart * 17);
    this.letters.push(letter);
    this.layout();
  }

  backspace(now = performance.now()) {
    const active = this.letters.filter((letter) => letter.dead == null);
    const last = active[active.length - 1];
    if (!last) return;
    last.dead = now;
    const previous = active[active.length - 2];
    if (previous) previous.cut = undefined;
    this.layout();
  }

  clear(now = performance.now()) {
    this.letters.forEach((letter) => {
      if (letter.dead == null) letter.dead = now;
    });
    this.layout();
  }

  setPalette(palette: Palette) {
    this.palette = palette;
  }

  setFlowerMode(flowerMode: FlowerMode) {
    if (this.flowerMode === flowerMode) return;
    const text = this.letters
      .filter((letter) => letter.dead == null)
      .map((letter) => letter.char)
      .join("");
    this.flowerMode = flowerMode;
    this.letters = [];
    this.layout(true);
    const now = performance.now();
    [...text].forEach((char, index) => this.add(char, now + index * 85));
  }

  getFlowerTarget(
    letter: GardenLetter | null | undefined,
    bloom: Sprout | undefined,
    now = performance.now(),
  ) {
    if (!letter || letter.char === " " || !bloom) return null;
    const age = Math.max(0, (now - bloom.born) * MOTION_RATE);
    const progress = ease(age / (900 * MOTION_RATE));
    const length = bloom.length * this.scale * progress;
    const phase = bloom.seed * 0.001;
    const sway = Math.sin(phase + age * 0.0022) * this.scale * bloom.sway;
    const bend =
      Math.sin(phase * 1.7 + age * 0.0013) * this.scale * 0.035 + sway;
    const startX = letter.x + bloom.x * letter.width;
    const startY = letter.y + bloom.y * this.scale;
    return {
      x:
        startX +
        Math.sin(bloom.tilt) * length +
        bend +
        bloom.curve * this.scale * progress,
      y:
        bloom.direction === -1
          ? startY + length * 0.12
          : startY - Math.cos(bloom.tilt) * length,
    };
  }

  findFlowerAt(x: number, y: number, now = performance.now()) {
    for (const letter of [...this.letters].reverse()) {
      if (letter.dead != null || letter.char === " ") continue;
      for (const sprout of [...letter.sprouts].reverse()) {
        const flowerTarget = this.getFlowerTarget(letter, sprout, now);
        if (!flowerTarget) continue;
        const dx = x - flowerTarget.x;
        const dy = y - flowerTarget.y;
        const hitRadius = Math.max(18, this.scale * sprout.bloomScale * 1.6);
        if (Math.hypot(dx, dy) <= hitRadius)
          return { letter, target: flowerTarget };
      }
    }
    return null;
  }

  spawnButterflyAtTarget(
    target: { x: number; y: number },
    now = performance.now(),
  ) {
    if (this.butterflies.length >= MAX_BUTTERFLIES) {
      const oldest = this.butterflies.shift();
      if (oldest) this.sendButterflyAway(oldest, now);
    }

    const edge = Math.floor(Math.random() * 4);
    const edgePosition = Math.random();
    const outsideMargin = 30 + Math.random() * 70;
    const startX =
      edge === 0
        ? -outsideMargin
        : edge === 1
          ? this.width + outsideMargin
          : edgePosition * this.width;
    const startY =
      edge === 2
        ? -outsideMargin
        : edge === 3
          ? this.height + outsideMargin
          : edgePosition * this.height;
    const dx = target.x - startX;
    const dy = target.y - startY;
    const curve = (Math.random() < 0.5 ? -1 : 1) * (24 + Math.random() * 42);

    this.butterflies.push({
      id: this.nextId++,
      phase: Math.random() * Math.PI * 2,
      size: Math.max(15, Math.min(18, this.scale * 0.12)),
      state: "entering",
      born: now,
      startX,
      startY,
      targetX: target.x,
      targetY: target.y,
      curveX:
        (startX + target.x) / 2 - (dy / (Math.hypot(dx, dy) || 1)) * curve,
      curveY:
        (startY + target.y) / 2 + (dx / (Math.hypot(dx, dy) || 1)) * curve,
      flightDuration: 6200 + Math.random() * 1200,
    });
  }

  butterflyPosition(butterfly: Butterfly, now: number) {
    if (butterfly.state === "perched") {
      const age = now - butterfly.born;
      return {
        x: butterfly.targetX + Math.sin(age * 0.002 + butterfly.phase) * 2,
        y: butterfly.targetY + Math.cos(age * 0.0024 + butterfly.phase) * 2,
        angle: Math.sin(age * 0.0018 + butterfly.phase) * 0.08,
      };
    }

    const progress = ease((now - butterfly.born) / butterfly.flightDuration);
    const inverse = 1 - progress;
    const x =
      inverse * inverse * butterfly.startX +
      2 * inverse * progress * butterfly.curveX +
      progress * progress * butterfly.targetX;
    const y =
      inverse * inverse * butterfly.startY +
      2 * inverse * progress * butterfly.curveY +
      progress * progress * butterfly.targetY;
    const tangentX =
      2 * inverse * (butterfly.curveX - butterfly.startX) +
      2 * progress * (butterfly.targetX - butterfly.curveX);
    const tangentY =
      2 * inverse * (butterfly.curveY - butterfly.startY) +
      2 * progress * (butterfly.targetY - butterfly.curveY);
    const pathLength = Math.hypot(
      butterfly.targetX - butterfly.startX,
      butterfly.targetY - butterfly.startY,
    );
    const wobbleAmplitude = Math.min(18, Math.max(7, pathLength * 0.018));
    const wobble =
      Math.sin(progress * Math.PI * 8 + butterfly.phase) *
      wobbleAmplitude *
      Math.sin(progress * Math.PI);
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    return {
      x: x - (tangentY / tangentLength) * wobble,
      y: y + (tangentX / tangentLength) * wobble,
      angle: Math.atan2(tangentY, tangentX) * 0.32,
    };
  }

  sendButterflyAway(butterfly: Butterfly, now: number) {
    const position = this.butterflyPosition(butterfly, now);
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.width, this.height) * 0.72 + 140;
    butterfly.state = "leaving";
    butterfly.born = now;
    butterfly.startX = position.x;
    butterfly.startY = position.y;
    butterfly.targetX = position.x + Math.cos(angle) * distance;
    butterfly.targetY = position.y + Math.sin(angle) * distance;
    const dx = butterfly.targetX - position.x;
    const dy = butterfly.targetY - position.y;
    const curve = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 70);
    const length = Math.hypot(dx, dy) || 1;
    butterfly.curveX =
      (position.x + butterfly.targetX) / 2 - (dy / length) * curve;
    butterfly.curveY =
      (position.y + butterfly.targetY) / 2 + (dx / length) * curve;
    butterfly.flightDuration = 9916 + Math.random() * 1666;
    if (this.departingButterflies.length >= MAX_BUTTERFLIES)
      this.departingButterflies.shift();
    this.departingButterflies.push(butterfly);
  }

  click = (event: MouseEvent) => {
    if (event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(".garden-controls, .garden-brand, [role='listbox']")
    )
      return;
    const bounds = this.canvas.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      return;
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const now = performance.now();
    this.spawnButterflyAtTarget({ x, y }, now);
  };

  doubleClick = (event: MouseEvent) => {
    const bounds = this.canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const now = performance.now();
    const flower = (
      this.flowerMode === "all"
        ? (["rose", "lily", "lotus"] as const)[Math.floor(Math.random() * 3)]
        : this.flowerMode
    ) as Flower;
    if (this.flowerBursts.length >= MAX_DOUBLE_CLICK_FLOWERS)
      this.flowerBursts.shift();
    this.flowerBursts.push({
      x,
      y,
      radius: this.scale * (0.2 + Math.random() * 0.1),
      flower,
      seed: Math.floor(Math.random() * 1e9),
      born: now,
    });
  };

  stroke(points: Point[], color: string, width: number) {
    if (points.length < 2) return;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const next = points[i + 1],
        point = points[i];
      ctx.quadraticCurveTo(
        point[0],
        point[1],
        (point[0] + next[0]) / 2,
        (point[1] + next[1]) / 2,
      );
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  drawStem(
    letter: GardenLetter,
    sprout: Sprout,
    age: number,
    colors: GardenColors,
    fade: number,
  ) {
    const progress = ease(age / (900 * MOTION_RATE));
    if (progress <= 0) return;
    const scale = this.scale,
      startX = letter.x + sprout.x * letter.width;
    const startY = letter.y + sprout.y * scale,
      length = sprout.length * scale * progress;
    const phase = sprout.seed * 0.001;
    const sway = Math.sin(phase + age * 0.0022) * scale * sprout.sway;
    const bend = Math.sin(phase * 1.7 + age * 0.0013) * scale * 0.035 + sway;
    const endX =
      startX +
      Math.sin(sprout.tilt) * length +
      bend +
      sprout.curve * scale * progress;
    const endY =
      sprout.direction === -1
        ? startY + length * 0.12
        : startY - Math.cos(sprout.tilt) * length;
    const stemWidth = Math.max(1.5, scale * 0.02);
    const dx = endX - startX;
    const dy = endY - startY;
    const stemLength = Math.hypot(dx, dy) || 1;
    const normalX = -dy / stemLength;
    const normalY = dx / stemLength;
    const curveRandom = this.random(sprout.seed ^ 0x5f356495);
    const anchors: Point[] = Array.from({ length: 7 }, (_, index) => {
      const t = index / 6;
      if (index === 0) return [startX, startY];
      if (index === 6) return [endX, endY];
      const envelope = Math.sin(Math.PI * t);
      const organicBend =
        sprout.curve * scale * progress + (curveRandom() - 0.5) * length * 0.22;
      const movingBend =
        Math.sin(t * Math.PI * 2 + phase + age * 0.0013) * sway;
      const offset = envelope * organicBend + movingBend;
      return [
        startX + dx * t + normalX * offset,
        startY + dy * t + normalY * offset,
      ];
    });
    const segmentControls = (index: number) => {
      const start = anchors[index];
      const end = anchors[index + 1];
      const previous = anchors[Math.max(0, index - 1)];
      const next = anchors[Math.min(anchors.length - 1, index + 2)];
      return {
        start,
        end,
        control1: [
          start[0] + (end[0] - previous[0]) / 6,
          start[1] + (end[1] - previous[1]) / 6,
        ] as Point,
        control2: [
          end[0] - (next[0] - start[0]) / 6,
          end[1] - (next[1] - start[1]) / 6,
        ] as Point,
      };
    };
    const pointAt = (t: number): Point => {
      const scaledT = clamp(t) * (anchors.length - 1);
      const segmentIndex = Math.min(Math.floor(scaledT), anchors.length - 2);
      const localT = scaledT - segmentIndex;
      const inverseT = 1 - localT;
      const { start, end, control1, control2 } = segmentControls(segmentIndex);
      return [
        inverseT ** 3 * start[0] +
          3 * inverseT ** 2 * localT * control1[0] +
          3 * inverseT * localT ** 2 * control2[0] +
          localT ** 3 * end[0],
        inverseT ** 3 * start[1] +
          3 * inverseT ** 2 * localT * control1[1] +
          3 * inverseT * localT ** 2 * control2[1] +
          localT ** 3 * end[1],
      ];
    };
    const previousAlpha = this.ctx.globalAlpha;
    const ctx = this.ctx;
    ctx.globalAlpha = previousAlpha * fade;
    ctx.beginPath();
    ctx.moveTo(anchors[0][0], anchors[0][1]);
    for (let i = 0; i < anchors.length - 1; i++) {
      const { end, control1, control2 } = segmentControls(i);
      ctx.bezierCurveTo(
        control1[0],
        control1[1],
        control2[0],
        control2[1],
        end[0],
        end[1],
      );
    }
    ctx.strokeStyle = colors.stem;
    ctx.lineWidth = stemWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    sprout.branches.forEach((branch, index) => {
      const branchProgress = ease((progress - branch.at) * 5);
      if (branchProgress <= 0.01) return;
      const [baseX, baseY] = pointAt(branch.at);
      const side = branch.side * branch.length * scale * branchProgress;
      const branchTip: Point = [
        baseX + side * 0.78,
        baseY -
          sprout.direction * branch.length * scale * 0.62 * branchProgress,
      ];
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(
        baseX + side * (0.34 + branch.curve),
        baseY - sprout.direction * branch.length * scale * 0.2 * branchProgress,
        branchTip[0],
        branchTip[1],
      );
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth = stemWidth * 0.82;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      const leafSize = scale * (0.11 + (index % 3) * 0.024) * branchProgress;
      this.drawSmallLeaf(
        baseX + side * 0.3,
        baseY -
          sprout.direction * branch.length * scale * 0.24 * branchProgress,
        branch.side,
        leafSize,
        colors,
        sprout.direction,
      );
      if (index % 2 === 0)
        this.drawSmallLeaf(
          branchTip[0],
          branchTip[1],
          -branch.side,
          leafSize * 0.9,
          colors,
          sprout.direction,
        );
    });
    const leavesAt = [0.28, 0.52, 0.75];
    leavesAt.forEach((at, index) => {
      const leafProgress = ease((progress - at) * 6);
      if (leafProgress <= 0.01) return;
      const [leafX, leafY] = pointAt(at);
      const side = (index % 2 ? -1 : 1) * (sprout.seed % 3 === 0 ? -1 : 1);
      const leafSize = scale * (0.13 + index * 0.018) * leafProgress;
      const growsPairedLeaf =
        this.random(sprout.seed ^ Math.imul(index + 1, 0x2c1b3c6d))() < 0.22;
      this.drawSmallLeaf(
        leafX,
        leafY,
        side,
        leafSize,
        colors,
        sprout.direction,
      );
      if (growsPairedLeaf) {
        this.drawSmallLeaf(
          leafX,
          leafY,
          -side,
          leafSize * 0.78,
          colors,
          sprout.direction,
        );
      }
    });
    const bloomAge = Math.max(0, age - 900 * MOTION_RATE);
    if (bloomAge > 0)
      this.drawBloom(
        endX,
        endY,
        scale * sprout.bloomScale,
        bloomAge,
        sprout,
        colors,
      );
    this.ctx.globalAlpha = previousAlpha;
  }

  drawSmallLeaf(
    x: number,
    y: number,
    side: number,
    size: number,
    colors: GardenColors,
    direction: -1 | 1,
  ) {
    if (size < 1) return;
    const dx = side * size * 1.55;
    const dy = -direction * size * 0.95;
    const length = Math.hypot(dx, dy);
    const normalX = -dy / length;
    const normalY = dx / length;
    const tipX = x + dx;
    const tipY = y + dy;
    const halfWidth = size * 0.24;
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + dx * 0.24 + normalX * halfWidth,
      y + dy * 0.24 + normalY * halfWidth,
      x + dx * 0.66 + normalX * halfWidth * 0.72,
      y + dy * 0.66 + normalY * halfWidth * 0.72,
    );
    ctx.quadraticCurveTo(
      tipX,
      tipY,
      x + dx * 0.66 - normalX * halfWidth * 0.72,
      y + dy * 0.66 - normalY * halfWidth * 0.72,
    );
    ctx.quadraticCurveTo(
      x + dx * 0.24 - normalX * halfWidth,
      y + dy * 0.24 - normalY * halfWidth,
      x,
      y,
    );
    ctx.closePath();
    ctx.fillStyle = colors.stem;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + dx * 0.12, y + dy * 0.12);
    ctx.lineTo(x + dx * 0.91, y + dy * 0.91);
    ctx.strokeStyle = colors.bg;
    ctx.lineWidth = Math.max(0.55, size * 0.045);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // ---------------------------------------------------------------------
  // Flower helpers: flat, graphic silhouettes with hand-drawn line scribbles
  // ---------------------------------------------------------------------

  /** A slightly shaky line from (x1,y1) to (x2,y2), used for the hand-drawn detail marks. */
  wobbleLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    amp: number,
    waves: number,
    steps = 18,
  ): Point[] {
    const dx = x2 - x1,
      dy = y2 - y1,
      len = Math.hypot(dx, dy) || 1,
      nx = -dy / len,
      ny = dx / len;
    const points: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        w = Math.sin(t * Math.PI * 2 * waves) * amp;
      points.push([x1 + dx * t + nx * w, y1 + dy * t + ny * w]);
    }
    return points;
  }

  /** Lumpy, scalloped flat blob (the rose silhouette). Shape is deterministic per seed. */
  fillBlob(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rot: number,
    seed: number,
    count: number,
    color: string,
  ) {
    if (rx < 0.5 || ry < 0.5) return;
    const ctx = this.ctx,
      rand = this.random(seed);
    const cos = Math.cos(rot),
      sin = Math.sin(rot);
    const pts: Point[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const k = (i % 2 ? 0.88 : 1.05) + (rand() - 0.5) * 0.2;
      const lx = Math.cos(a) * rx * k,
        ly = Math.sin(a) * ry * k;
      pts.push([x + lx * cos - ly * sin, y + lx * sin + ly * cos]);
    }
    ctx.beginPath();
    ctx.moveTo(
      (pts[count - 1][0] + pts[0][0]) / 2,
      (pts[count - 1][1] + pts[0][1]) / 2,
    );
    for (let i = 0; i < count; i++) {
      const p = pts[i],
        n = pts[(i + 1) % count];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** Pointed, slightly recurved lily tepal. */
  lilyTepalPath(
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    bend: number,
  ) {
    const ctx = this.ctx,
      dx = Math.cos(angle),
      dy = Math.sin(angle),
      px = -dy,
      py = dx;
    const b = bend * length * 0.22;
    const tipX = x + dx * length + px * b,
      tipY = y + dy * length + py * b;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + dx * length * 0.2 - px * width * 0.9,
      y + dy * length * 0.2 - py * width * 0.9,
      x + dx * length * 0.62 - px * width * 1.15 + px * b * 0.5,
      y + dy * length * 0.62 - py * width * 1.15 + py * b * 0.5,
      tipX,
      tipY,
    );
    ctx.bezierCurveTo(
      x + dx * length * 0.62 + px * width * 0.95 + px * b * 0.5,
      y + dy * length * 0.62 + py * width * 0.95 + py * b * 0.5,
      x + dx * length * 0.2 + px * width * 0.9,
      y + dy * length * 0.2 + py * width * 0.9,
      x,
      y,
    );
    ctx.closePath();
  }

  /** Broad ovate lotus petal with a soft point. */
  lotusPetalPath(
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
  ) {
    const ctx = this.ctx,
      dx = Math.cos(angle),
      dy = Math.sin(angle),
      px = -dy,
      py = dx;
    const tipX = x + dx * length,
      tipY = y + dy * length;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + dx * length * 0.1 - px * width * 1.25,
      y + dy * length * 0.1 - py * width * 1.25,
      x + dx * length * 0.78 - px * width,
      y + dy * length * 0.78 - py * width,
      tipX,
      tipY,
    );
    ctx.bezierCurveTo(
      x + dx * length * 0.78 + px * width,
      y + dy * length * 0.78 + py * width,
      x + dx * length * 0.1 + px * width * 1.25,
      y + dy * length * 0.1 + py * width * 1.25,
      x,
      y,
    );
    ctx.closePath();
  }

  // ---------------------------------------------------------------------
  // Blooms
  // ---------------------------------------------------------------------

  drawBloom(
    x: number,
    y: number,
    radius: number,
    age: number,
    sprout: Sprout,
    colors: GardenColors,
  ) {
    const open = ease(age / 620);
    if (!open) return;
    const phase =
      sprout.seed * 0.00001 +
      sprout.tilt +
      Math.sin(age * 0.002 + sprout.seed) * 0.035;
    if (sprout.flower === "rose")
      this.drawRose(x, y, radius, age, open, phase, sprout, colors);
    else if (sprout.flower === "lily")
      this.drawLily(x, y, radius, age, open, phase, sprout, colors);
    else this.drawLotus(x, y, radius, age, open, phase, sprout, colors);
  }

  /** Rose: one lumpy flat red silhouette with a wobbly pink spiral and a few wavy scribbles. */
  drawRose(
    x: number,
    y: number,
    radius: number,
    _age: number,
    open: number,
    phase: number,
    sprout: Sprout,
    colors: GardenColors,
  ) {
    const r = radius * 1.05 * open;
    const rand = this.random(sprout.seed + 11);
    const line = Math.max(0.8, r * 0.05);
    // Silhouette: a main blob plus two overlapping lumps so the outline stays organic.
    this.fillBlob(x, y, r, r * 0.86, phase, sprout.seed, 9, colors.flower);
    for (let k = 0; k < 2; k++) {
      const angle = phase + k * 2.5 + rand();
      this.fillBlob(
        x + Math.cos(angle) * r * 0.58,
        y + Math.sin(angle) * r * 0.5,
        r * 0.55,
        r * 0.5,
        angle,
        sprout.seed + k + 1,
        7,
        colors.flower,
      );
    }
    // Wobbly hand-drawn spiral.
    const cx = x - r * 0.04,
      cy = y - r * 0.08;
    const spiral: Point[] = [];
    for (let i = 0; i <= 44; i++) {
      const t = i / 44,
        angle = phase * 0.5 + t * Math.PI * 4.6;
      const rr =
        r * (0.05 + t * 0.52) * (1 + 0.1 * Math.sin(t * 26 + sprout.seed));
      spiral.push([cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr * 0.9]);
    }
    this.stroke(spiral, colors.detail, line);
    // Wavy marks near the rim, like petal edges sketched in.
    this.stroke(
      this.wobbleLine(
        x - r * 0.58,
        y + r * 0.42,
        x + r * 0.38,
        y + r * 0.46,
        r * 0.05,
        3.5,
      ),
      colors.detail,
      line,
    );
    this.stroke(
      this.wobbleLine(
        x - r * 0.3,
        y - r * 0.62,
        x + r * 0.5,
        y - r * 0.4,
        r * 0.045,
        2.5,
      ),
      colors.detail,
      line,
    );
    const arc: Point[] = [];
    for (let i = 0; i <= 14; i++) {
      const angle = Math.PI * 0.55 + (i / 14) * Math.PI * 0.8;
      arc.push([
        cx + Math.cos(angle) * r * 0.68 * (1 + 0.05 * Math.sin(i * 1.7)),
        cy + Math.sin(angle) * r * 0.62,
      ]);
    }
    this.stroke(arc, colors.detail, line);
  }

  /** Lily: flat six-pointed star silhouette with sketched veins, a center scribble and stamen ticks. */
  drawLily(
    x: number,
    y: number,
    radius: number,
    age: number,
    open: number,
    phase: number,
    sprout: Sprout,
    colors: GardenColors,
  ) {
    const ctx = this.ctx;
    const line = Math.max(0.8, radius * 0.045);
    const tepals: { angle: number; length: number; width: number }[] = [];
    for (let pass = 0; pass < 2; pass++) {
      for (let i = pass; i < 6; i += 2) {
        const variance = this.random(sprout.seed ^ ((i + 3) * 8191))();
        const petalOpen = ease((age - i * 28) / 620);
        const angle = phase + (i * Math.PI) / 3 + (variance - 0.5) * 0.14;
        const length = radius * 1.15 * (0.88 + variance * 0.24) * petalOpen;
        const width = radius * 0.26 * (0.92 + variance * 0.16) * petalOpen;
        this.lilyTepalPath(x, y, angle, length, width, (variance - 0.5) * 1.1);
        ctx.fillStyle = colors.flower;
        ctx.fill();
        tepals.push({ angle, length, width });
      }
    }
    this.fillBlob(
      x,
      y,
      radius * 0.22 * open,
      radius * 0.22 * open,
      phase,
      sprout.seed + 5,
      6,
      colors.flower,
    );
    // Sketched center vein on every tepal.
    tepals.forEach(({ angle, length, width }) => {
      const dx = Math.cos(angle),
        dy = Math.sin(angle);
      this.stroke(
        this.wobbleLine(
          x + dx * length * 0.14,
          y + dy * length * 0.14,
          x + dx * length * 0.78,
          y + dy * length * 0.78,
          width * 0.12,
          2,
          12,
        ),
        colors.detail,
        line,
      );
    });
    // Small scribbled heart and three stamen ticks.
    const heart: Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16,
        angle = phase + t * Math.PI * 3;
      heart.push([
        x + Math.cos(angle) * radius * 0.11 * t * open,
        y + Math.sin(angle) * radius * 0.11 * t * open,
      ]);
    }
    this.stroke(heart, colors.detail, line);
    for (let i = 0; i < 3; i++) {
      const angle = phase + Math.PI / 6 + (i * Math.PI * 2) / 3;
      const endX = x + Math.cos(angle) * radius * 0.4 * open,
        endY = y + Math.sin(angle) * radius * 0.4 * open;
      this.stroke(
        [
          [
            x + Math.cos(angle) * radius * 0.12 * open,
            y + Math.sin(angle) * radius * 0.12 * open,
          ],
          [endX, endY],
        ],
        colors.detail,
        line,
      );
      ctx.beginPath();
      ctx.arc(endX, endY, Math.max(0.9, radius * 0.045), 0, Math.PI * 2);
      ctx.fillStyle = colors.detail;
      ctx.fill();
    }
  }

  /** Lotus: flat tiers of rounded, pointed petals; inner tiers are picked out with pink outlines. */
  drawLotus(
    x: number,
    y: number,
    radius: number,
    age: number,
    open: number,
    phase: number,
    sprout: Sprout,
    colors: GardenColors,
  ) {
    const ctx = this.ctx;
    const line = Math.max(0.8, radius * 0.045);
    const tiers = [
      { count: 8, length: 1.08, width: 0.3, twist: 0, outline: false },
      {
        count: 6,
        length: 0.76,
        width: 0.28,
        twist: Math.PI / 6,
        outline: true,
      },
      { count: 5, length: 0.46, width: 0.24, twist: 0.3, outline: true },
    ];
    tiers.forEach((tier, tierIndex) => {
      for (let i = 0; i < tier.count; i++) {
        const variance = this.random(
          sprout.seed + tierIndex * 1877 + i * 3571,
        )();
        const petalOpen = ease((age - tierIndex * 60 - i * 10) / 640);
        const angle =
          phase +
          tier.twist +
          (i * Math.PI * 2) / tier.count +
          (variance - 0.5) * 0.12;
        const length =
          radius * tier.length * (0.9 + variance * 0.2) * petalOpen;
        const width =
          radius * tier.width * (0.92 + variance * 0.16) * petalOpen;
        if (length < 0.5) continue;
        this.lotusPetalPath(x, y, angle, length, width);
        ctx.fillStyle = colors.flower;
        ctx.fill();
        if (tier.outline) {
          ctx.strokeStyle = colors.detail;
          ctx.lineWidth = line;
          ctx.lineJoin = "round";
          ctx.stroke();
        } else {
          const dx = Math.cos(angle),
            dy = Math.sin(angle);
          this.stroke(
            this.wobbleLine(
              x + dx * length * 0.5,
              y + dy * length * 0.5,
              x + dx * length * 0.88,
              y + dy * length * 0.88,
              width * 0.08,
              1.5,
              10,
            ),
            colors.detail,
            line,
          );
        }
      }
    });
    // Scribbled seed head.
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.1 * open, 0, Math.PI * 2);
    ctx.fillStyle = colors.detail;
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const angle = phase + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * radius * 0.2 * open,
        y + Math.sin(angle) * radius * 0.2 * open,
        Math.max(0.7, radius * 0.03),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = colors.detail;
      ctx.fill();
    }
  }

  updateButterflies(now: number) {
    this.butterflies.forEach((butterfly) => {
      if (
        butterfly.state === "entering" &&
        now - butterfly.born >= butterfly.flightDuration
      ) {
        butterfly.state = "perched";
      }
    });
    this.departingButterflies = this.departingButterflies.filter(
      (butterfly) => now - butterfly.born < butterfly.flightDuration,
    );
  }

  drawButterfly(butterfly: Butterfly, now: number, colors: GardenColors) {
    const age = now - butterfly.born;
    const position = this.butterflyPosition(butterfly, now);
    const progress = clamp(age / butterfly.flightDuration);
    const opacity = butterfly.state === "leaving" ? 1 - ease(progress) : 1;
    const flap =
      0.28 + Math.abs(Math.sin(age * 0.016 + butterfly.phase)) * 0.72;
    const size = butterfly.size;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(position.angle);
    ctx.globalAlpha *= opacity;
    const wing = (side: -1 | 1) => {
      ctx.save();
      ctx.scale(flap, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        side * size * 0.16,
        -size * 0.7,
        side * size * 0.76,
        -size * 1.08,
        side * size * 0.98,
        -size * 0.56,
      );
      ctx.bezierCurveTo(
        side * size * 1.1,
        -size * 0.18,
        side * size * 0.55,
        -size * 0.06,
        0,
        size * 0.12,
      );
      ctx.closePath();
      ctx.fillStyle = colors.text;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        side * size * 0.58,
        -size * 0.56,
        size * 0.12,
        size * 0.17,
        side * 0.25,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = colors.flower;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        side * size * 0.58,
        -size * 0.56,
        size * 0.045,
        size * 0.08,
        side * 0.25,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = colors.bg;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, size * 0.1);
      ctx.bezierCurveTo(
        side * size * 0.2,
        size * 0.35,
        side * size * 0.72,
        size * 0.42,
        side * size * 0.72,
        size * 0.75,
      );
      ctx.bezierCurveTo(
        side * size * 0.32,
        size * 0.78,
        side * size * 0.12,
        size * 0.52,
        0,
        size * 0.28,
      );
      ctx.closePath();
      ctx.fillStyle = colors.text;
      ctx.fill();
      ctx.restore();
    };
    wing(-1);
    wing(1);

    ctx.fillStyle = colors.flower;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.1, size * 0.43, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.43, size * 0.13, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render one frame (call from requestAnimationFrame). Layout, text and butterflies
   * update every frame, while stem/flower growth and sway use a clock quantized to
   * FPS steps, so only they look choppy.
   */
  draw(now: number) {
    const dt = Math.min(64, now - (this.previousFrame || now));
    this.previousFrame = now;
    const interpolation = 1 - Math.exp(-dt / 80);
    this.scale += (this.targetScale - this.scale) * interpolation;
    this.caretX += (this.targetCaretX - this.caretX) * interpolation;
    this.caretY += (this.targetCaretY - this.caretY) * interpolation;
    this.letters.forEach((letter) => {
      if (letter.dead == null) {
        letter.x += (letter.targetX - letter.x) * interpolation;
        letter.y += (letter.targetY - letter.y) * interpolation;
      }
    });
    this.letters = this.letters.filter(
      (letter) => letter.dead == null || now - letter.dead < 300,
    );
    const ctx = this.ctx,
      colors = this.colors;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const scale = this.scale;
    const stepNow = Math.floor(now / FRAME_MS) * FRAME_MS;
    this.flowerBursts.forEach((bloom) => {
      const age = (now - bloom.born) / 1000;
      const open = ease(age / 0.65);
      if (open <= 0) return;
      const sprout: Sprout = {
        seed: bloom.seed,
        born: bloom.born,
        x: 0,
        y: 0,
        flower: bloom.flower,
        tilt: 0,
        direction: 1,
        length: 1,
        petals: 6,
        bloomScale: 1,
        curve: 0,
        sway: 0,
        branches: [],
      };
      this.drawBloom(
        bloom.x,
        bloom.y,
        bloom.radius * open,
        age * 1000,
        sprout,
        colors,
      );
    });
    for (let layer = 0; layer <= 1; layer++) {
      this.letters.forEach((letter) => {
        if (letter.char === " ") return;
        const fade =
          letter.dead == null
            ? 1
            : 1 - ease(((now - letter.dead) * MOTION_RATE) / 260);
        const stepFade =
          letter.dead == null
            ? 1
            : 1 - ease(((stepNow - letter.dead) * MOTION_RATE) / 260);
        const age = (stepNow - letter.born) * MOTION_RATE;
        letter.sprouts.forEach((sprout, index) => {
          if (index % 2 !== layer) return;
          const ageForSprout = age + (letter.born - sprout.born) * MOTION_RATE;
          this.drawStem(letter, sprout, ageForSprout, colors, stepFade);
        });
        if (layer === 0) {
          ctx.globalAlpha = Math.max(0, fade);
          ctx.font = `italic 400 ${scale}px "Libre Baskerville", serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = colors.text;
          ctx.fillText(letter.char, letter.x, letter.y);
          ctx.globalAlpha = 1;
        }
      });
    }
    this.updateButterflies(now);
    this.butterflies.forEach((butterfly) =>
      this.drawButterfly(butterfly, now, colors),
    );
    this.departingButterflies.forEach((butterfly) =>
      this.drawButterfly(butterfly, now, colors),
    );
    const caretVisible =
      now - this.lastKey < 500 || Math.floor(now / 530) % 2 === 0;
    if (caretVisible && scale) {
      ctx.globalAlpha = ease((now - this.startedAt) / 600);
      ctx.fillStyle = colors.text;
      ctx.fillRect(
        this.caretX - Math.max(2, scale * 0.015) / 2,
        this.caretY - scale * 0.4,
        Math.max(2, scale * 0.03),
        scale * 0.8,
      );
      ctx.globalAlpha = 1;
    }
  }

  exportPng() {
    this.draw(performance.now());
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "type-garden.png";
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
