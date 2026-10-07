import { Badge, Select, Tooltip } from "@mantine/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GardenEngine, PALETTES, type FlowerMode } from "./garden.engine";
import "./garden.styles.css";

export default function GardenLayout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<GardenEngine | null>(null);
  const [selectedPalette, setSelectedPalette] = useState(() =>
    Math.floor(Math.random() * PALETTES.length),
  );
  const [flowerMode, setFlowerMode] = useState<FlowerMode>("all");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GardenEngine(canvas);
    engineRef.current = engine;
    let animationFrame = 0;
    const animate = (now: number) => {
      engine.draw(now);
      animationFrame = requestAnimationFrame(animate);
    };
    const resizeObserver = new ResizeObserver(engine.resize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", engine.resize);
    window.addEventListener("click", engine.click, true);
    window.addEventListener("dblclick", engine.doubleClick, true);
    document.fonts?.ready.then(() => {
      engine.metrics = {};
      engine.layout(true);
    });
    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", engine.resize);
      window.removeEventListener("click", engine.click, true);
      window.removeEventListener("dblclick", engine.doubleClick, true);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPalette(PALETTES[selectedPalette]);
  }, [selectedPalette]);
  useEffect(() => {
    engineRef.current?.setFlowerMode(flowerMode);
  }, [flowerMode]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const engine = engineRef.current;
    const target = event.target;
    if (
      !engine ||
      (target instanceof HTMLElement &&
        target.closest(".garden-controls, [role='listbox']")) ||
      event.isComposing
    )
      return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      engine.exportPng();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      engine.lastKey = performance.now();
      engine.backspace();
    } else if (event.key === "Enter") {
      event.preventDefault();
      engine.lastKey = performance.now();
      engine.clear();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      engine.lastKey = performance.now();
      engine.add(event.key);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget,
      engine = engineRef.current;
    if (!engine || !input.value) return;
    const value = input.value;
    input.value = "";
    engine.lastKey = performance.now();
    for (const character of value) engine.add(character);
  };

  const focusInput = () => inputRef.current?.focus({ preventScroll: true });
  const colors = PALETTES[selectedPalette];
  const appStyle: CSSProperties = {
    backgroundColor: colors[1],
    ["--garden-background" as string]: colors[1],
    ["--garden-foreground" as string]: colors[5],
    ["--garden-accent" as string]: colors[2],
  };

  return (
    <main
      className="garden-app"
      style={appStyle}
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".garden-controls, [role='listbox']"))
          window.setTimeout(focusInput, 0);
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Libre+Baskerville:ital,wght@1,400&display=swap"
        rel="stylesheet"
      />
      <canvas
        ref={canvasRef}
        className="garden-canvas"
        aria-label="Type to grow a garden"
      />
      <input
        ref={inputRef}
        className="garden-input"
        aria-label="Type to grow a garden"
        autoFocus
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={handleInput}
      />
      <div className="garden-brand" style={{ zIndex: 100000 }}>
        <div className="garden-mark">Playground No.1: Type Garden</div>
        <div className="garden-kicker">
          developed using prompt suggestions from{" "}
          <Badge
            color={colors[3]}
            variant="light"
            autoContrast
            style={{
              cursor: "pointer",
              pointerEvents: "auto",
              zIndex: 100000,
            }}
            onClick={() => window.open("https://x.com/art_akshat", "_blank")}
          >
            Akshat Agarwal
          </Badge>
        </div>
      </div>
      <div className="garden-footer">
        <div className="garden-hints">
          <span>type to grow</span>
          <span>space cuts</span>
          <span>backspace withers</span>
          <span>enter clears</span>
        </div>
        <div className="garden-controls">
          <Select
            className="flower-select"
            aria-label="Choose flower style"
            value={flowerMode}
            onChange={(value) => {
              setFlowerMode((value ?? "all") as typeof flowerMode);
              window.setTimeout(focusInput, 0);
            }}
            data={[
              { value: "all", label: "All flowers" },
              { value: "rose", label: "Rose" },
              { value: "lily", label: "Lily" },
              { value: "lotus", label: "Lotus" },
            ]}
            allowDeselect={false}
            checkIconPosition="right"
            comboboxProps={{
              withinPortal: true,
              shadow: "md",
              position: "top-start",
              width: "target",
              offset: 6,
              middlewares: { flip: false, shift: false },
            }}
            styles={{
              input: {
                minHeight: 30,
                height: 30,
                background: "transparent",
                color: colors[5],
                borderColor: `${colors[5]}55`,
                fontFamily: "'DM Mono', monospace",
              },
              dropdown: {
                background: colors[1],
                borderColor: `${colors[5]}55`,
              },
              option: { fontFamily: "'DM Mono', monospace", fontSize: 11 },
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
          <div
            className="garden-palette"
            aria-label="Choose palette"
            style={{ backgroundColor: `${colors[1]}bb` }}
          >
            {PALETTES.map((palette, index) => (
              <Tooltip
                label={palette[0]}
                key={palette[0]}
                position="top"
                withArrow
                styles={{ tooltip: { fontFamily: "'DM Mono', monospace" } }}
              >
                <button
                  key={palette[0]}
                  className={`swatch${selectedPalette === index ? " selected" : ""}`}
                  type="button"
                  tabIndex={-1}
                  aria-label={`${palette[0]} palette`}
                  title={palette[0]}
                  style={{ backgroundColor: palette[1] }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setSelectedPalette(index)}
                >
                  <i style={{ backgroundColor: palette[2] }} />
                </button>
              </Tooltip>
            ))}
          </div>
          <button
            className="export"
            type="button"
            tabIndex={-1}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => engineRef.current?.exportPng()}
          >
            PNG
          </button>
        </div>
      </div>
    </main>
  );
}
