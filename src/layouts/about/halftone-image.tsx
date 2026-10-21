import { useEffect, useRef, useState, type PointerEvent } from "react";

type HalftoneImageProps = {
  color?: string;
};

type PointerState = { x: number; y: number; active: boolean };

type MotionState = {
  time: number;
  pointerX: number;
  pointerY: number;
  strength: number;
};

type Renderer = {
  cols: number;
  rows: number;
  cellOffsetX: number;
  cellOffsetY: number;
  width: number;
  height: number;
  dpr: number;
  luminance: Float32Array;
  glyphs: HTMLCanvasElement[];
};

const src = "/about/about.jpg";
// Ordered dark to bright. Index 0 is blank so shadows stay empty.
const GLYPH_RAMP = " .:-+tTsSWM";
const CELL_WIDTH = 5;
const CELL_HEIGHT = 8;
const FONT = "8px ui-monospace, Menlo, Consolas, monospace";

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function sampleLuminance(image: HTMLImageElement, cols: number, rows: number) {
  const luminance = new Float32Array(cols * rows);
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return luminance;

  // Cover-fit the photo into the grid, cropping the overflow evenly.
  const gridAspect = cols / rows;
  const imageAspect = image.naturalWidth / image.naturalHeight;
  const cropWidth =
    imageAspect > gridAspect
      ? image.naturalHeight * gridAspect
      : image.naturalWidth;
  const cropHeight =
    imageAspect > gridAspect
      ? image.naturalHeight
      : image.naturalWidth / gridAspect;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (image.naturalWidth - cropWidth) / 2,
    (image.naturalHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    cols,
    rows,
  );

  const pixels = context.getImageData(0, 0, cols, rows).data;
  for (let i = 0; i < luminance.length; i++) {
    const offset = i * 4;
    luminance[i] =
      (0.299 * pixels[offset] +
        0.587 * pixels[offset + 1] +
        0.114 * pixels[offset + 2]) /
      255;
  }
  return luminance;
}

function buildGlyphs(color: string, dpr: number) {
  return Array.from(GLYPH_RAMP, (character) => {
    const glyph = document.createElement("canvas");
    glyph.width = Math.ceil(CELL_WIDTH * dpr);
    glyph.height = Math.ceil(CELL_HEIGHT * dpr);
    const context = glyph.getContext("2d");
    if (context && character !== " ") {
      context.scale(dpr, dpr);
      context.font = FONT;
      context.fillStyle = color;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(character, CELL_WIDTH / 2, CELL_HEIGHT / 2);
    }
    return glyph;
  });
}

function createRenderer(
  image: HTMLImageElement,
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  color: string,
): Renderer {
  const { width, height } = container.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cols = Math.max(1, Math.floor(width / CELL_WIDTH));
  const rows = Math.max(1, Math.floor(height / CELL_HEIGHT));
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  return {
    cols,
    rows,
    cellOffsetX: (width - cols * CELL_WIDTH) / 2,
    cellOffsetY: (height - rows * CELL_HEIGHT) / 2,
    width,
    height,
    dpr,
    luminance: sampleLuminance(image, cols, rows),
    glyphs: buildGlyphs(color, dpr),
  };
}

function paint(
  context: CanvasRenderingContext2D,
  renderer: Renderer,
  motion: MotionState,
) {
  const {
    cols,
    rows,
    luminance,
    glyphs,
    width,
    height,
    dpr,
    cellOffsetX,
    cellOffsetY,
  } = renderer;
  const { time, pointerX, pointerY, strength } = motion;
  const aspect = width / height;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(dpr, 0, 0, dpr, cellOffsetX * dpr, cellOffsetY * dpr);

  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5) / rows;
    for (let col = 0; col < cols; col++) {
      const u = (col + 0.5) / cols;

      // Slow wave and diagonal sweep, matching the Dither background.
      const flow = Math.sin(
        u * 7 + time * 0.7 + Math.sin(v * 5 - time * 0.45) * 1.6,
      );
      const sweepPhase = (u + v * 0.35) * 0.5 - time * 0.05;
      const sweep = smoothstep(
        0.35,
        0,
        Math.abs(sweepPhase - Math.floor(sweepPhase) - 0.5),
      );

      // Pointer ripple nudges the sampled column and lifts brightness nearby.
      const pointerDistance = Math.hypot((u - pointerX) * aspect, v - pointerY);
      const touch = strength * (1 - smoothstep(0, 0.3, pointerDistance));
      const ripple = Math.sin(pointerDistance * 38 - time * 6) * touch;
      const sourceCol = Math.min(
        cols - 1,
        Math.max(0, col + Math.round(ripple * 2)),
      );

      // Contrast curve: the photo is mostly midtone, so this keeps shadows empty.
      const base = luminance[row * cols + sourceCol];
      const level = clamp01(
        (base - 0.15) / 0.75 + flow * 0.05 + sweep * 0.12 + touch * 0.25,
      );
      const shaded = Math.pow(level, 1.3);
      const glyphIndex = Math.round(shaded * (glyphs.length - 1));
      if (glyphIndex === 0) continue;

      context.globalAlpha = 0.35 + 0.65 * shaded;
      context.drawImage(
        glyphs[glyphIndex],
        col * CELL_WIDTH,
        row * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT,
      );
    }
  }
  context.globalAlpha = 1;
}

export default function HalftoneImage({
  color = "#3bddb5",
}: HalftoneImageProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const pointer = useRef<PointerState>({ x: 0.5, y: 0.5, active: false });
  const motion = useRef<MotionState>({
    time: 0,
    pointerX: 0.5,
    pointerY: 0.5,
    strength: 0,
  });

  useEffect(() => {
    const loaded = new Image();
    loaded.onload = () => setImage(loaded);
    loaded.src = src;
    return () => {
      loaded.onload = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(([entry]) =>
      setIsVisible(entry.isIntersecting),
    );
    observer.observe(container);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setPrefersReducedMotion(motionQuery.matches);
    const onVisibilityChange = () => setIsTabVisible(!document.hidden);
    motionQuery.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !context || !image) return;

    const rebuild = () => {
      rendererRef.current = createRenderer(image, container, canvas, color);
      paint(context, rendererRef.current, motion.current);
    };
    rebuild();

    const observer = new ResizeObserver(rebuild);
    observer.observe(container);
    return () => observer.disconnect();
  }, [image, color]);

  const animate = !prefersReducedMotion;
  const shouldRun = !isReady || (animate && isVisible && isTabVisible);

  useEffect(() => {
    if (!shouldRun) return;
    let frame = 0;
    let previous: number | null = null;

    const tick = (now: number) => {
      const delta =
        previous === null ? 0 : Math.min((now - previous) / 1000, 0.05);
      previous = now;

      const state = motion.current;
      if (animate) {
        const target = pointer.current.active ? 1 : 0;
        state.time += delta;
        state.strength +=
          (target - state.strength) *
          (1 - Math.exp(-delta / (target ? 0.12 : 0.35)));
        const follow = 1 - Math.exp(-delta / 0.06);
        state.pointerX += (pointer.current.x - state.pointerX) * follow;
        state.pointerY += (pointer.current.y - state.pointerY) * follow;
      }

      const context = canvasRef.current?.getContext("2d");
      const renderer = rendererRef.current;
      if (context && renderer) {
        paint(context, renderer, state);
        setIsReady(true);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, shouldRun]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      active: true,
    };
  };

  const handlePointerLeave = () => {
    pointer.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      className="about-page__image"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <canvas
        ref={canvasRef}
        className="about-page__image-canvas"
        aria-hidden="true"
        style={{ opacity: isReady ? 1 : 0 }}
      />
    </div>
  );
}
