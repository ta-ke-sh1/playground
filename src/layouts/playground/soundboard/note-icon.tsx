type NoteIconProps = {
  variant: 1 | 2 | 3 | 4;
  size: string;
};

// Each shape is split into parts filled with --note-color (primary),
// --note-color-2 (secondary) and --note-color-3 (accent).
const PRIMARY = "var(--note-color)";
const SECONDARY = "var(--note-color-2, var(--note-color))";
const ACCENT = "var(--note-color-3, var(--note-color))";

const PETAL_CENTERS = [
  [256, 96],
  [96, 256],
  [416, 256],
  [256, 416],
] as const;

const BAR = { x: 215, y: 20, width: 82, height: 472 };

export function NoteIcon({ variant, size }: NoteIconProps) {
  return (
    <svg
      className="soundboard-note-icon"
      style={{ height: size, width: size }}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      {variant === 1 && (
        <>
          <path
            fill={PRIMARY}
            d="M115 21v94H21v94h94v94H21v94h94v94h94v-94h94v94h94v-94h94v-94h-94v-94h94v-94h-94v-94h-94v94h-94v-94h-94z"
          />
          <circle cx="256" cy="256" r="86" fill={SECONDARY} />
          <circle cx="256" cy="256" r="52" fill={ACCENT} />
        </>
      )}
      {variant === 2 && (
        <>
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              fill={PRIMARY}
              transform={`rotate(${angle} 256 256)`}
              d="M256 256C196 196 196 96 256 24C316 96 316 196 256 256Z"
            />
          ))}
          {[45, 135, 225, 315].map((angle) => (
            <circle
              key={angle}
              cx="256"
              cy="96"
              r="34"
              fill={SECONDARY}
              transform={`rotate(${angle} 256 256)`}
            />
          ))}
          <circle cx="256" cy="256" r="52" fill={ACCENT} />
        </>
      )}
      {variant === 3 && (
        <>
          {[
            [32, 32],
            [384, 32],
            [32, 384],
            [384, 384],
          ].map(([x, y]) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="96"
              height="96"
              fill={SECONDARY}
            />
          ))}
          <polygon points="256,128 384,256 256,384 128,256" fill={PRIMARY} />
          {PETAL_CENTERS.map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="96" fill={PRIMARY} />
              <circle cx={cx} cy={cy} r="32" fill={SECONDARY} />
            </g>
          ))}
          <polygon points="256,160 352,256 256,352 160,256" fill={SECONDARY} />
          <polygon points="256,160 292,196 256,232 220,196" fill={ACCENT} />
          <polygon points="352,256 316,292 280,256 316,220" fill={ACCENT} />
          <polygon points="256,352 220,316 256,280 292,316" fill={ACCENT} />
          <polygon points="160,256 196,220 232,256 196,292" fill={ACCENT} />
        </>
      )}
      {variant === 4 && (
        <>
          {[45, 135].map((angle) => (
            <rect
              key={angle}
              {...BAR}
              fill={SECONDARY}
              transform={`rotate(${angle} 256 256)`}
            />
          ))}
          {[0, 90].map((angle) => (
            <rect
              key={angle}
              {...BAR}
              fill={PRIMARY}
              transform={`rotate(${angle} 256 256)`}
            />
          ))}
          <circle cx="256" cy="256" r="52" fill={ACCENT} />
        </>
      )}
    </svg>
  );
}
