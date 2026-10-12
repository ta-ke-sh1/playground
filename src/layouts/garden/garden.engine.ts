export const PALETTES = [
    ["Rose noir", "#000000", "#FF1400", "#3257FF", "#FFB4A8", "#FFFFFF"],
    ["Paper", "#F3EEE4", "#FF3B1F", "#1C2B8F", "#FFD2C4", "#111111"],
    ["Midnight", "#0D1B4C", "#FF5A4E", "#9FB4FF", "#FFD6CF", "#FFFFFF"],
    ["Citrus", "#0E1A12", "#FF8A00", "#1FA463", "#FFE2B8", "#FFF6E8"],
    ["Orchid", "#140A1F", "#E63CFF", "#2FB8A6", "#F9D1FF", "#FFFFFF"],
    ["Moss", "#133A2A", "#FFB7C5", "#7FD18B", "#FFFFFF", "#F6F1E7"],
    ["Tomato", "#FF1400", "#FFF1E0", "#0B0B0B", "#FF1400", "#000000"],
    ["Butter", "#FFE9A8", "#E4002B", "#0F5132", "#FFC2C2", "#1A1A1A"],
    ["Blush", "#FAD4D8", "#C8102E", "#274690", "#FFE3E6", "#1A1A1A"],
    ["Mono", "#000000", "#F2F2F2", "#6E6E6E", "#000000", "#FFFFFF"],
] as const;

export type Palette = (typeof PALETTES)[number];
export type Flower = "rose" | "lily" | "lotus";
export type FlowerMode = "all" | Flower;
type Point = [number, number];
type GardenColors = { bg: string; flower: string; stem: string; detail: string; text: string };
type Branch = { at: number; side: -1 | 1; length: number; curve: number; curl: boolean };
type Sprout = { seed: number; born: number; x: number; y: number; flower: Flower; tilt: number; direction: -1 | 1; length: number; petals: number; bloomScale: number; curve: number; sway: number; branches: Branch[]; dead?: number };
type GardenLetter = { char: string; id: number; born: number; x: number; y: number; targetX: number; targetY: number; width: number; sprouts: Sprout[]; dead?: number; cut?: number };
type Butterfly = { id: number; phase: number; orbit: number; speed: number; size: number; born: number; expiresAt: number | null };

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const ease = (value: number) => { const t = clamp(value); return 1 - Math.pow(1 - t, 3); };
const MOTION_RATE = 0.72;

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
    mouseX: number | null = null;
    mouseY = 0;
    hoveredLetterId: number | null = null;
    butterflies: Butterfly[] = [];
    butterflyTarget: { x: number; y: number } | null = null;
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
        return { bg: this.palette[1], flower: this.palette[2], stem: this.palette[3], detail: this.palette[4], text: this.palette[5] };
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
        this.ctx.font = '700 100px "Playfair Display", Georgia, serif';
        let width = this.ctx.measureText(char).width / 100;
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
        const active = this.letters.filter(letter => letter.dead == null);
        const maxWidth = this.width * 0.8;
        const size0 = this.height * 0.28;
        const widths = active.map(letter => this.measure(letter.char));
        const runs: { indices: number[]; isWord: boolean }[] = [];
        for (let index = 0; index < active.length;) {
            const isWord = active[index].char !== " ";
            const indices: number[] = [];
            while (index < active.length && (active[index].char !== " ") === isWord) indices.push(index++);
            if (isWord) {
                while (index < active.length && active[index].char === " ") indices.push(index++);
            }
            runs.push({ indices, isWord });
        }

        const makeLines = (fontSize: number) => {
            const result: number[][] = [[]];
            let lineWidth = 0;
            let wordsInLine = 0;
            runs.forEach(run => {
                const runWidth = run.indices.reduce((sum, index) => sum + widths[index] * fontSize, 0);
                const startNewLine = run.isWord && result[result.length - 1].length > 0 &&
                    (wordsInLine >= 4 || lineWidth + runWidth > maxWidth);
                if (startNewLine) {
                    result.push([]);
                    lineWidth = 0;
                    wordsInLine = 0;
                }
                result[result.length - 1].push(...run.indices);
                lineWidth += runWidth;
                if (run.isWord) wordsInLine++;
            });
            return result;
        };

        let size = size0;
        let lines = makeLines(size);
        for (let attempt = 0; attempt < 4; attempt++) {
            const heightLimitedSize = this.height * 0.82 / Math.max(1, lines.length * 2.1);
            if (heightLimitedSize >= size) break;
            size = heightLimitedSize;
            lines = makeLines(size);
        }
        lines.forEach((line, lineIndex) => {
            const width = line.reduce((sum, index) => sum + widths[index] * size, 0);
            let x = this.width / 2 - width / 2;
            const y = this.height / 2 + (lineIndex - (lines.length - 1) / 2) * 2.1 * size + 0.33 * size;
            line.forEach(index => {
                const letter = active[index];
                letter.targetX = x + widths[index] * size / 2;
                letter.targetY = y;
                letter.width = widths[index] * size;
                x += letter.width;
            });
        });
        this.targetScale = size;
        const last = active[active.length - 1];
        this.targetCaretX = last ? last.targetX + last.width / 2 + 0.07 * size : this.width / 2;
        this.targetCaretY = last ? last.targetY - 0.33 * size : this.height / 2;
        active.forEach(letter => {
            if (!letter.x) letter.x = letter.targetX;
            if (!letter.y) letter.y = letter.targetY;
        });
        if (snap || !this.scale) {
            this.scale = size;
            this.caretX = this.targetCaretX;
            this.caretY = this.targetCaretY;
            active.forEach(letter => { letter.x = letter.targetX; letter.y = letter.targetY; });
        }
    }

    createFlower(char: string, letter: GardenLetter, born: number, wordSeed: number) {
        if (char === " ") return;
        const rand = this.random(wordSeed ^ Math.floor(Math.random() * 0x7fffffff) ^ Math.imul(letter.id + 1, 2654435761));
        const chosen = this.flowerMode === "all"
            ? (["rose", "lily", "lotus"] as const)[Math.floor(rand() * 3)]
            : this.flowerMode;
        const count = 1 + (rand() < 0.7 ? 1 : 0) + (rand() < 0.2 ? 1 : 0);
        for (let i = 0; i < count; i++) {
            const branches = Array.from({ length: Math.floor(rand() * 4) }, () => ({
                at: 0.2 + rand() * 0.62,
                side: rand() < 0.5 ? -1 as const : 1 as const,
                length: 0.18 + rand() * 0.28,
                curve: (rand() - 0.5) * 0.7,
                curl: rand() < 0.48,
            }));
            letter.sprouts.push({
                seed: Math.floor(rand() * 1e9), born: born + i * (90 + rand() * 130),
                x: (rand() - 0.5) * 0.72, y: -rand() * 0.34, flower: chosen,
                tilt: (rand() - 0.5) * 0.95, direction: rand() < 0.1 ? -1 : 1,
                length: 0.52 + rand() * 0.58,
                petals: 5 + Math.floor(rand() * 5), bloomScale: 0.2 + rand() * 0.1,
                curve: (rand() - 0.5) * 0.36, sway: 0.018 + rand() * 0.065, branches,
            });
        }
    }

    add(char: string, now = performance.now()) {
        if (char === "\n" || char === "\r") { this.clear(now); return; }
        if (char === "\t") return;
        const active = this.letters.filter(letter => letter.dead == null);
        const previous = active[active.length - 1];
        if (char === " " && previous) previous.cut = now;
        const id = this.nextId++;
        const letter: GardenLetter = { char, id, born: now, x: this.width / 2, y: this.height / 2, targetX: 0, targetY: 0, width: 0, sprouts: [] };
        const wordStart = char === " " || !previous || previous.char === " " ? id : previous.id - (previous.id % 17);
        this.createFlower(char, letter, now, wordStart * 17);
        this.letters.push(letter);
        this.layout();
    }

    backspace(now = performance.now()) {
        const active = this.letters.filter(letter => letter.dead == null);
        const last = active[active.length - 1];
        if (!last) return;
        last.dead = now;
        const previous = active[active.length - 2];
        if (previous) previous.cut = undefined;
        this.layout();
    }

    clear(now = performance.now()) {
        this.letters.forEach(letter => { if (letter.dead == null) letter.dead = now; });
        this.layout();
    }

    setPalette(palette: Palette) { this.palette = palette; }

    setFlowerMode(flowerMode: FlowerMode) {
        if (this.flowerMode === flowerMode) return;
        const text = this.letters.filter(letter => letter.dead == null).map(letter => letter.char).join("");
        this.flowerMode = flowerMode;
        this.letters = [];
        this.layout(true);
        const now = performance.now();
        [...text].forEach((char, index) => this.add(char, now + index * 85));
    }

    pointerMove = (event: PointerEvent) => {
        const bounds = this.canvas.getBoundingClientRect();
        this.mouseX = event.clientX - bounds.left;
        this.mouseY = event.clientY - bounds.top;
    };
    pointerLeave = () => {
        this.mouseX = null;
        this.hoveredLetterId = null;
        this.butterflyTarget = null;
        const now = performance.now();
        this.butterflies.forEach(butterfly => { butterfly.expiresAt ??= now; });
    };

    stroke(points: Point[], color: string, width: number) {
        if (points.length < 2) return;
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length - 1; i++) {
            const next = points[i + 1], point = points[i];
            ctx.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
        }
        ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }

    drawStem(letter: GardenLetter, sprout: Sprout, age: number, colors: GardenColors, fade: number) {
        const progress = ease(age / (900 * MOTION_RATE));
        if (progress <= 0) return;
        const scale = this.scale, startX = letter.x + sprout.x * letter.width;
        const startY = letter.y + sprout.y * scale, length = sprout.length * scale * progress;
        const phase = sprout.seed * 0.001;
        const sway = Math.sin(phase + age * 0.0022) * scale * sprout.sway;
        const bend = Math.sin(phase * 1.7 + age * 0.0013) * scale * 0.035 + sway;
        const endX = startX + Math.sin(sprout.tilt) * length + bend + sprout.curve * scale * progress;
        const endY = sprout.direction === -1
            ? startY + length * 0.12
            : startY - Math.cos(sprout.tilt) * length;
        const cut = letter.cut == null ? 1 : 1 - ease((performance.now() - letter.cut) * MOTION_RATE / 150) * 0.85;
        const control1: Point = [startX + sprout.curve * scale * 0.3 + sway * 0.25, sprout.direction === -1 ? startY + length * 0.35 : startY - length * 0.34];
        const control2: Point = [endX - sprout.curve * scale * 0.65 - sway * 0.35, sprout.direction === -1 ? endY + length * 0.35 : endY + length * 0.3];
        const pointAt = (t: number): Point => {
            const u = 1 - t;
            return [u ** 3 * startX + 3 * u * u * t * control1[0] + 3 * u * t * t * control2[0] + t ** 3 * endX,
                u ** 3 * startY + 3 * u * u * t * control1[1] + 3 * u * t * t * control2[1] + t ** 3 * endY];
        };
        const previousAlpha = this.ctx.globalAlpha;
        this.ctx.globalAlpha = previousAlpha * fade;
        this.stroke([ [startX, startY], control1, control2, [endX, endY] ], colors.stem, Math.max(1.2, scale * 0.022) * cut);
        sprout.branches.forEach((branch, index) => {
            const branchProgress = ease((progress - branch.at) * 5);
            if (branchProgress <= 0.01) return;
            const [baseX, baseY] = pointAt(branch.at);
            const side = branch.side * branch.length * scale * branchProgress;
            const branchTip: Point = [baseX + side * 0.72, baseY - sprout.direction * branch.length * scale * 0.52 * branchProgress];
            this.stroke([[baseX, baseY], [baseX + side * (0.32 + branch.curve), baseY - sprout.direction * branch.length * scale * 0.18 * branchProgress], branchTip], colors.stem, Math.max(0.9, scale * 0.014) * cut);
            if (branch.curl && branchProgress > 0.35) {
                const curlRadius = scale * (0.035 + (sprout.seed % 7) * 0.004) * branchProgress;
                const curl: Point[] = [];
                const curlPhase = sprout.seed * 0.00003 + branch.side;
                for (let step = 0; step <= 16; step++) {
                    const t = step / 16, angle = curlPhase + t * Math.PI * 1.6;
                    const r = curlRadius * (1 - t * 0.72);
                    curl.push([branchTip[0] + Math.cos(angle) * r, branchTip[1] + Math.sin(angle) * r]);
                }
                this.stroke(curl, colors.stem, Math.max(0.8, scale * 0.012) * cut);
            }
            const leafSize = scale * (0.045 + (index % 3) * 0.012) * branchProgress;
                this.drawSmallLeaf(baseX + side * 0.3, baseY - sprout.direction * branch.length * scale * 0.24 * branchProgress, branch.side, leafSize, colors, sprout.direction);
            if (index % 2 === 0) this.drawSmallLeaf(branchTip[0], branchTip[1], -branch.side, leafSize * 0.9, colors, sprout.direction);
        });
        const leavesAt = [0.28, 0.52, 0.75];
        leavesAt.forEach((at, index) => {
            const leafProgress = ease((progress - at) * 6);
            if (leafProgress <= 0.01) return;
            const [leafX, leafY] = pointAt(at);
            const side = (index % 2 ? -1 : 1) * (sprout.seed % 3 === 0 ? -1 : 1);
            this.drawSmallLeaf(leafX, leafY, side, scale * (0.055 + index * 0.008) * leafProgress, colors, sprout.direction);
        });
        const bloomAge = Math.max(0, age - 900 * MOTION_RATE);
        if (bloomAge > 0) this.drawBloom(endX, endY, scale * sprout.bloomScale, bloomAge, sprout, colors);
        this.ctx.globalAlpha = previousAlpha;
    }

    drawSmallLeaf(x: number, y: number, side: number, size: number, colors: GardenColors, direction: -1 | 1) {
        if (size < 1) return;
        const leafWidth = side * size;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.bezierCurveTo(x + leafWidth * 0.2, y - direction * size * 0.85, x + leafWidth * 0.95, y - direction * size * 1.15, x + leafWidth, y - direction * size * 0.28);
        this.ctx.bezierCurveTo(x + leafWidth * 0.76, y + direction * size * 0.04, x + leafWidth * 0.25, y + direction * size * 0.08, x, y);
        this.ctx.fillStyle = colors.stem;
        this.ctx.fill();
        this.stroke([[x, y], [x + leafWidth * 0.48, y - direction * size * 0.42], [x + leafWidth, y - direction * size * 0.28]], colors.bg, Math.max(0.55, size * 0.07));
    }

    drawPetal(x: number, y: number, angle: number, length: number, width: number, color: string, roundness = 0.45) {
        const ctx = this.ctx, dx = Math.cos(angle), dy = Math.sin(angle), px = -dy, py = dx;
        const tipX = x + dx * length, tipY = y + dy * length;
        ctx.beginPath();
        ctx.moveTo(x - px * width * 0.36, y - py * width * 0.36);
        ctx.bezierCurveTo(x - dx * length * 0.12 - px * width, y - dy * length * 0.12 - py * width, tipX - px * width * roundness, tipY - py * width * roundness, tipX, tipY);
        ctx.bezierCurveTo(tipX + px * width * roundness, tipY + py * width * roundness, x - dx * length * 0.12 + px * width, y - dy * length * 0.12 + py * width, x + px * width * 0.36, y + py * width * 0.36);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(0.6, width * 0.07);
        ctx.stroke();
        this.stroke([[x, y], [x + dx * length * 0.44 + px * width * 0.08, y + dy * length * 0.44 + py * width * 0.08], [tipX, tipY]], this.colors.detail, Math.max(0.7, width * 0.045));
    }

    drawRosePetal(x: number, y: number, angle: number, length: number, width: number, colors: GardenColors) {
        const ctx = this.ctx, dx = Math.cos(angle), dy = Math.sin(angle), px = -dy, py = dx;
        const tipX = x + dx * length, tipY = y + dy * length;
        ctx.beginPath();
        ctx.moveTo(x - px * width * 0.32, y - py * width * 0.32);
        ctx.bezierCurveTo(x + dx * length * 0.18 - px * width * 1.15, y + dy * length * 0.18 - py * width * 1.15, tipX - px * width * 0.95, tipY - py * width * 0.95, tipX + px * width * 0.08, tipY + py * width * 0.08);
        ctx.bezierCurveTo(tipX + px * width * 0.95, tipY + py * width * 0.95, x + dx * length * 0.18 + px * width * 1.15, y + dy * length * 0.18 + py * width * 1.15, x + px * width * 0.32, y + py * width * 0.32);
        ctx.closePath();
        ctx.fillStyle = colors.flower;
        ctx.fill();
        ctx.strokeStyle = colors.flower;
        ctx.lineWidth = Math.max(0.6, width * 0.07);
        ctx.stroke();
        this.stroke([[x, y], [x + dx * length * 0.35 + px * width * 0.12, y + dy * length * 0.35 + py * width * 0.12], [tipX, tipY]], colors.detail, Math.max(0.7, width * 0.05));
    }

    drawBloom(x: number, y: number, radius: number, age: number, sprout: Sprout, colors: GardenColors) {
        const ctx = this.ctx;
        const open = ease(age / 620);
        if (!open) return;
        const phase = sprout.seed * 0.00001 + sprout.tilt + Math.sin(age * 0.002 + sprout.seed) * 0.035;
        if (sprout.flower === "rose") {
            // Rose: layered, curled petals around a tight spiral center.
            for (let ring = 0; ring < 3; ring++) {
                const count = ring === 0 ? Math.max(4, sprout.petals - 2) : ring === 1 ? sprout.petals : Math.max(4, sprout.petals - 3);
                for (let i = 0; i < count; i++) {
                    const variance = this.random(sprout.seed + ring * 977 + i * 7919)();
                    const petalOpen = ease((age - ring * 44 - i * 13) / 620);
                    const angle = phase + i * Math.PI * 2 / count + ring * 0.42 + (variance - 0.5) * 0.13;
                    const r = radius * (ring === 0 ? 0.12 : ring === 1 ? 0.34 : 0.59) * petalOpen;
                    const petalX = x + Math.cos(angle) * r, petalY = y + Math.sin(angle) * r;
                    this.drawRosePetal(petalX, petalY, angle, radius * (ring === 2 ? 0.62 : 0.52) * (0.84 + variance * 0.3) * petalOpen, radius * (ring === 2 ? 0.26 : 0.24) * (0.88 + variance * 0.24) * petalOpen, colors);
                }
            }
            const spiral: Point[] = [];
            for (let i = 0; i <= 24; i++) {
                const t = i / 24, angle = phase + t * Math.PI * 3.2, r = radius * (0.02 + t * 0.2) * open;
                spiral.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
            }
            this.stroke(spiral, colors.detail, Math.max(0.7, radius * 0.045));
        } else if (sprout.flower === "lily") {
            // Lily: six long, pointed tepals with prominent central veins and stamens.
            for (let i = 0; i < 6; i++) {
                const variance = this.random(sprout.seed ^ (i + 3) * 8191)();
                const petalOpen = ease((age - i * 28) / 620);
                const angle = phase + i * Math.PI / 3 + (variance - 0.5) * 0.12;
                const length = radius * (i % 2 ? 0.96 : 0.83) * (0.82 + variance * 0.34) * petalOpen;
                this.drawPetal(x, y, angle, length, radius * (0.19 + variance * 0.07) * petalOpen, colors.flower, 0.12);
                if (radius > 8) {
                    const bx = x + Math.cos(angle) * length * 0.68, by = y + Math.sin(angle) * length * 0.68;
                    ctx.beginPath(); ctx.arc(bx, by, Math.max(0.8, radius * 0.035), 0, Math.PI * 2);
                    ctx.fillStyle = colors.detail; ctx.fill();
                }
            }
            for (let i = 0; i < 3; i++) {
                const angle = phase + i * Math.PI * 2 / 3 + 0.2, endX = x + Math.cos(angle) * radius * 0.34 * open, endY = y + Math.sin(angle) * radius * 0.34 * open;
                this.stroke([[x, y], [x + Math.cos(angle) * radius * 0.22 * open, y + Math.sin(angle) * radius * 0.22 * open], [endX, endY]], colors.detail, Math.max(0.7, radius * 0.035));
                ctx.beginPath(); ctx.ellipse(endX, endY, Math.max(1, radius * 0.065), Math.max(1, radius * 0.035), angle, 0, Math.PI * 2);
                ctx.fillStyle = colors.detail; ctx.fill();
            }
        } else {
            // Lotus: broad, rounded petals in two concentric tiers and a dotted seed head.
            for (let ring = 0; ring < 2; ring++) {
                const count = ring === 0 ? sprout.petals + 3 : sprout.petals;
                for (let i = 0; i < count; i++) {
                    const variance = this.random(sprout.seed + ring * 1877 + i * 3571)();
                    const petalOpen = ease((age - ring * 52 - i * 10) / 640);
                    const angle = phase + i * Math.PI * 2 / count + ring * 0.24 + (variance - 0.5) * 0.1;
                    const offset = radius * (ring === 0 ? 0.2 : 0.02) * petalOpen;
                    this.drawPetal(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset, angle, radius * (ring === 0 ? 0.76 : 0.56) * (0.86 + variance * 0.3) * petalOpen, radius * (ring === 0 ? 0.27 : 0.32) * (0.9 + variance * 0.2) * petalOpen, colors.flower, 0.62);
                }
            }
            const centerRadius = radius * 0.17 * open;
            ctx.beginPath(); ctx.arc(x, y, centerRadius, 0, Math.PI * 2); ctx.fillStyle = colors.detail; ctx.fill();
            for (let i = 0; i < 7; i++) {
                const angle = phase + i * Math.PI * 2 / 7, dot = centerRadius * 0.58;
                ctx.beginPath(); ctx.arc(x + Math.cos(angle) * dot, y + Math.sin(angle) * dot, Math.max(0.55, radius * 0.018), 0, Math.PI * 2); ctx.fillStyle = colors.bg; ctx.fill();
            }
        }
    }

    updateHoverButterflies(now: number) {
        let hovered: GardenLetter | undefined;
        if (this.mouseX != null) {
            hovered = [...this.letters].reverse().find(letter => letter.dead == null && letter.char !== " " &&
                Math.abs(this.mouseX! - letter.x) <= letter.width * 0.55 &&
                this.mouseY >= letter.y - this.scale * 0.82 && this.mouseY <= letter.y + this.scale * 0.12);
        }

        if (hovered) {
            if (hovered.id !== this.hoveredLetterId) {
                this.butterflies.forEach(butterfly => { butterfly.expiresAt ??= now; });
                const count = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i++) {
                    this.butterflies.push({
                        id: this.nextId++, phase: Math.random() * Math.PI * 2,
                        orbit: 14 + Math.random() * Math.min(38, this.scale * 0.24),
                        speed: 0.0015 + Math.random() * 0.0025,
                        size: 7 + Math.random() * 7, born: now, expiresAt: null,
                    });
                }
                this.hoveredLetterId = hovered.id;
            }
            this.butterflyTarget = { x: hovered.x, y: hovered.y - this.scale * 0.32 };
        } else {
            this.hoveredLetterId = null;
            this.butterflyTarget = null;
            this.butterflies.forEach(butterfly => { butterfly.expiresAt ??= now; });
        }
        this.butterflies = this.butterflies.filter(butterfly => butterfly.expiresAt == null || now - butterfly.expiresAt < 450);
    }

    drawButterfly(butterfly: Butterfly, now: number, colors: GardenColors) {
        const target = this.butterflyTarget;
        if (!target) return;
        const age = now - butterfly.born;
        const angle = age * butterfly.speed + butterfly.phase;
        const driftX = Math.cos(angle) * butterfly.orbit;
        const driftY = Math.sin(angle * 1.17) * butterfly.orbit * 0.62 - Math.sin(angle * 0.48) * 7;
        const x = target.x + driftX, y = target.y + driftY;
        const fadeIn = ease(age / 180);
        const fadeOut = butterfly.expiresAt == null ? 1 : 1 - ease((now - butterfly.expiresAt) / 360);
        const flap = 0.2 + Math.abs(Math.sin(age * 0.018 + butterfly.phase)) * 0.8;
        const size = butterfly.size;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(angle * 0.7) * 0.48);
        ctx.globalAlpha *= fadeIn * fadeOut;
        const wing = (side: -1 | 1, width: number, height: number, color: string) => {
            ctx.save();
            ctx.scale(side * flap, 1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(width * 0.08, -height * 0.55, width * 0.7, -height * 1.05, width, -height * 0.52);
            ctx.bezierCurveTo(width * 1.12, -height * 0.06, width * 0.45, height * 0.08, 0, 0);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = colors.text;
            ctx.lineWidth = 0.65;
            ctx.stroke();
            ctx.restore();
        };
        wing(-1, size * 0.72, size * 0.68, colors.flower);
        wing(1, size * 0.72, size * 0.68, colors.detail);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.18);
        ctx.quadraticCurveTo(size * 0.12, 0, 0, size * 0.28);
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 0.02, -size * 0.12);
        ctx.quadraticCurveTo(-size * 0.3, -size * 0.48, -size * 0.42, -size * 0.38);
        ctx.moveTo(size * 0.02, -size * 0.12);
        ctx.quadraticCurveTo(size * 0.3, -size * 0.48, size * 0.42, -size * 0.38);
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
    }

    draw(now: number) {
        const dt = Math.min(64, now - (this.previousFrame || now));
        this.previousFrame = now;
        const interpolation = 1 - Math.exp(-dt / 80);
        this.scale += (this.targetScale - this.scale) * interpolation;
        this.caretX += (this.targetCaretX - this.caretX) * interpolation;
        this.caretY += (this.targetCaretY - this.caretY) * interpolation;
        this.letters.forEach(letter => {
            if (letter.dead == null) { letter.x += (letter.targetX - letter.x) * interpolation; letter.y += (letter.targetY - letter.y) * interpolation; }
        });
        this.letters = this.letters.filter(letter => letter.dead == null || now - letter.dead < 300);
        const ctx = this.ctx, colors = this.colors;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, this.width, this.height);
        const scale = this.scale;
        for (let layer = 0; layer <= 1; layer++) {
            this.letters.forEach(letter => {
                if (letter.char === " ") return;
                const fade = letter.dead == null ? 1 : 1 - ease((now - letter.dead) * MOTION_RATE / 260);
                const age = (now - letter.born) * MOTION_RATE;
                letter.sprouts.forEach((sprout, index) => {
                    if (index % 2 !== layer) return;
                    const ageForSprout = age + (letter.born - sprout.born) * MOTION_RATE;
                    this.drawStem(letter, sprout, ageForSprout, colors, fade);
                });
                if (layer === 0) {
                    ctx.globalAlpha = Math.max(0, fade);
                    ctx.font = `700 ${scale}px "Playfair Display", Georgia, serif`;
                    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = colors.text;
                    ctx.fillText(letter.char, letter.x, letter.y);
                    ctx.globalAlpha = 1;
                }
            });
        }
        this.updateHoverButterflies(now);
        this.butterflies.forEach(butterfly => this.drawButterfly(butterfly, now, colors));
        const caretVisible = now - this.lastKey < 500 || Math.floor(now / 530) % 2 === 0;
        if (caretVisible && scale) {
            ctx.globalAlpha = ease((now - this.startedAt) / 600);
            ctx.fillStyle = colors.text;
            ctx.fillRect(this.caretX - Math.max(2, scale * 0.015) / 2, this.caretY - scale * 0.4, Math.max(2, scale * 0.03), scale * 0.8);
            ctx.globalAlpha = 1;
        }
    }

    exportPng() {
        this.draw(performance.now());
        this.canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob), link = document.createElement("a");
            link.href = url; link.download = "type-garden.png"; link.click(); URL.revokeObjectURL(url);
        });
    }
}
