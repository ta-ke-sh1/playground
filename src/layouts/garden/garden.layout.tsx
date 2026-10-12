import { Select } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { GardenEngine, PALETTES, type FlowerMode } from "./garden.engine";

export default function GardenLayout() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const engineRef = useRef<GardenEngine | null>(null);
    const [selectedPalette, setSelectedPalette] = useState(0);
    const [flowerMode, setFlowerMode] = useState<FlowerMode>("all");
    const [count, setCount] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const engine = new GardenEngine(canvas);
        engineRef.current = engine;
        let animationFrame = 0;
        const animate = (now: number) => { engine.draw(now); animationFrame = requestAnimationFrame(animate); };
        const resizeObserver = new ResizeObserver(engine.resize);
        resizeObserver.observe(canvas);
        window.addEventListener("resize", engine.resize);
        window.addEventListener("pointermove", engine.pointerMove, true);
        document.addEventListener("pointerleave", engine.pointerLeave);
        document.fonts?.ready.then(() => { engine.metrics = {}; engine.layout(true); });
        animationFrame = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
            window.removeEventListener("resize", engine.resize);
            window.removeEventListener("pointermove", engine.pointerMove, true);
            document.removeEventListener("pointerleave", engine.pointerLeave);
            engineRef.current = null;
        };
    }, []);

    useEffect(() => { engineRef.current?.setPalette(PALETTES[selectedPalette]); }, [selectedPalette]);
    useEffect(() => { engineRef.current?.setFlowerMode(flowerMode); }, [flowerMode]);

    const updateCount = (engine: GardenEngine) => setCount(engine.letters.filter(letter => letter.dead == null && letter.char !== " ").length);
    const handleKeyDown = (event: KeyboardEvent) => {
        const engine = engineRef.current;
        const target = event.target;
        if (!engine || (target instanceof HTMLElement && target.closest(".garden-controls, [role='listbox']")) || event.isComposing) return;
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            engine.exportPng();
            return;
        }
        if (event.key === "Backspace") {
            event.preventDefault();
            engine.lastKey = performance.now();
            engine.backspace();
            updateCount(engine);
        } else if (event.key === "Enter") {
            event.preventDefault();
            engine.lastKey = performance.now();
            engine.clear();
            updateCount(engine);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            engine.lastKey = performance.now();
            engine.add(event.key);
            updateCount(engine);
        }
    };

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget, engine = engineRef.current;
        if (!engine || !input.value) return;
        const value = input.value;
        input.value = "";
        engine.lastKey = performance.now();
        for (const character of value) engine.add(character);
        updateCount(engine);
    };

    const focusInput = () => inputRef.current?.focus({ preventScroll: true });
    const colors = PALETTES[selectedPalette];

    return (
        <main className="garden-app" style={{ backgroundColor: colors[1] }} onPointerDownCapture={event => {
            const target = event.target as HTMLElement;
            if (!target.closest(".garden-controls, [role='listbox']")) window.setTimeout(focusInput, 0);
        }}>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
            <style>{`
                *{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}body{overflow:hidden}.garden-app{position:fixed;inset:0;overflow:hidden;color:${colors[5]};font-family:'DM Mono',monospace;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:none;cursor:text;transition:background-color .35s ease;color-scheme:dark}.garden-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.garden-input{position:fixed;inset:0;width:100%;height:100%;z-index:1;opacity:0;border:0;padding:0;margin:0;color:transparent;background:transparent;caret-color:transparent;font-size:16px;cursor:text;pointer-events:auto}.garden-brand{position:absolute;left:24px;top:22px;z-index:2;pointer-events:none}.garden-mark{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;letter-spacing:-.04em;opacity:.82}.garden-kicker{font-size:9px;letter-spacing:.17em;text-transform:uppercase;opacity:.42;margin-top:3px}.garden-mode{position:absolute;top:16px;right:16px;z-index:3;display:flex;gap:4px;padding:4px;border:1px solid #ffffff35;border-radius:999px;background:#00000024;backdrop-filter:blur(12px)}.garden-mode button,.garden-controls button{font:inherit;letter-spacing:.04em;cursor:pointer}.garden-mode button{border:0;border-radius:999px;padding:7px 14px;font-size:11px;color:${colors[5]};background:transparent;opacity:.65}.garden-mode button.active{color:${colors[1]};background:${colors[5]};opacity:1}.garden-footer{position:absolute;left:24px;right:24px;bottom:20px;z-index:2;display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;font-size:11px;letter-spacing:.035em;color:${colors[5]};opacity:.66;pointer-events:none}.garden-hints{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.garden-hints span+span:before{content:'·';opacity:.55;margin-right:18px}.garden-count{opacity:.75}.garden-controls{display:flex;align-items:center;gap:9px;pointer-events:auto}.garden-palette{display:flex;align-items:center;gap:5px;padding:4px 6px;border:1px solid #ffffff35;border-radius:999px;background:${colors[1]}bb;backdrop-filter:blur(10px)}.garden-controls .swatch{width:20px;height:20px;padding:0;border-radius:50%;display:grid;place-items:center;border:1.5px solid transparent;transition:transform .2s,border-color .2s;transform:scale(.95)}.garden-controls .swatch:hover{transform:scale(1.12)}.garden-controls .swatch.selected{border-color:${colors[5]};transform:scale(1.08)}.swatch i{width:9px;height:9px;border-radius:50%;display:block}.garden-controls .export{background:transparent;border:1px solid #ffffff45;color:${colors[5]};padding:7px 13px;border-radius:999px;font-size:10px;transition:border-color .2s,color .2s}.garden-controls .export:hover{border-color:${colors[5]}}.garden-credit{position:absolute;right:24px;top:25px;z-index:1;font-size:9px;letter-spacing:.11em;text-transform:uppercase;opacity:.35;pointer-events:none}@media(max-width:650px){.garden-brand{left:16px;top:18px}.garden-credit{display:none}.garden-footer{left:16px;right:16px;bottom:14px;gap:12px}.garden-hints{gap:10px;font-size:10px}.garden-hints span+span:before{margin-right:10px}.garden-controls{width:100%;justify-content:space-between}.garden-controls .swatch{width:clamp(14px,calc((100vw - 175px)/10),20px);height:clamp(14px,calc((100vw - 175px)/10),20px)}.garden-palette{gap:4px}.garden-controls .export{padding:7px 11px}}
                .garden-mode{gap:8px;padding:9px 13px;font-size:9px;letter-spacing:.12em}.flower-select{width:124px;flex:none}.flower-select input{letter-spacing:.025em}.live-dot{width:6px;height:6px;border-radius:50%;background:${colors[2]};box-shadow:0 0 12px ${colors[2]};animation:garden-pulse 2.4s ease-in-out infinite}@keyframes garden-pulse{50%{opacity:.35}}@media(max-width:650px){.flower-select{width:110px}}
            `}</style>
            <canvas ref={canvasRef} className="garden-canvas" aria-label="Type to grow a garden" />
            <input ref={inputRef} className="garden-input" aria-label="Type to grow a garden" autoFocus autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} onChange={handleInput} />
            <div className="garden-brand"><div className="garden-mark">Type Garden</div><div className="garden-kicker">a little garden for your words</div></div>
            <div className="garden-mode"><span className="live-dot" />LIVE CANVAS</div>
            <div className="garden-footer">
                <div className="garden-hints"><span>type to grow</span><span>space cuts</span><span>backspace withers</span><span>enter clears</span>{count > 0 && <span className="garden-count">{count} {count === 1 ? "letter" : "letters"}</span>}</div>
                <div className="garden-controls">
                    <Select
                        className="flower-select"
                        aria-label="Choose flower style"
                        value={flowerMode}
                        onChange={value => {
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
                        comboboxProps={{ withinPortal: true, shadow: "md" }}
                        styles={{
                            input: { minHeight: 30, height: 30, background: "transparent", color: colors[5], borderColor: `${colors[5]}55`, fontFamily: "'DM Mono', monospace", fontSize: 10 },
                            dropdown: { background: colors[1], borderColor: `${colors[5]}55` },
                            option: { fontFamily: "'DM Mono', monospace", fontSize: 11 },
                        }}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={event => event.stopPropagation()}
                    />
                    <div className="garden-palette" aria-label="Choose palette">{PALETTES.map((palette, index) => <button key={palette[0]} className={`swatch${selectedPalette === index ? " selected" : ""}`} type="button" tabIndex={-1} aria-label={`${palette[0]} palette`} title={palette[0]} style={{ backgroundColor: palette[1] }} onPointerDown={event => event.stopPropagation()} onClick={() => setSelectedPalette(index)}><i style={{ backgroundColor: palette[2] }} /></button>)}</div>
                    <button className="export" type="button" tabIndex={-1} onPointerDown={event => event.stopPropagation()} onClick={() => engineRef.current?.exportPng()}>PNG</button>
                </div>
            </div>
        </main>
    );
}