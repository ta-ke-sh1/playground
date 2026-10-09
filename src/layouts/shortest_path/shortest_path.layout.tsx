import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Select,
  SegmentedControl,
  Stack,
  Text,
  Grid,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

export const PALETTES = [
  ["Sunset", "#577590", "#F94144", "#43AA8B", "#F9C74F", "#FFF8EB"],
  ["Electric Orchid", "#160A2A", "#D000FF", "#00E5A8", "#FF5CC8", "#FFF0FF"],
  ["Arctic Flame", "#102A43", "#FF4D6D", "#00C2A8", "#FFD166", "#F1FAFF"],
  ["Deep Current", "#005F73", "#CA6702", "#0A9396", "#94D2BD", "#FFF3D6"],
  ["Berry Bloom", "#FFC2D1", "#FB6F92", "#FF8FAB", "#FFE5EC", "#51202F"],
  ["Golden Hour", "#F9C74F", "#F94144", "#43AA8B", "#F3722C", "#263746"],
  ["Solar Flare", "#21130A", "#FFB000", "#D1495B", "#FFE08A", "#FFF7E8"],
  ["Sky Wash", "#E3F2FD", "#1565C0", "#E9D8A6", "#90CAF9", "#0D47A1"],
] as const;

type CellState = "empty" | "start" | "finish" | "wall" | "visited" | "path";
type PlacementMode = "start" | "finish" | "wall";
type Algorithm = "bfs" | "dfs" | "astar";
type MazeAlgorithm =
  | "random"
  | "backtracking"
  | "division"
  | "prim"
  | "fractal";
type AnimationSpeed = "slow" | "medium" | "fast";
type CellSize = "small" | "medium" | "large";
type Palette = (typeof PALETTES)[number][0];

type Cell = {
  state: CellState;
};

const DEFAULT_GRID_DIMENSIONS = { rows: 20, columns: 20 };
const MIN_CELL_SIZE = 48;
const CELL_SIZE_VALUES: Record<CellSize, number> = {
  small: MIN_CELL_SIZE,
  medium: MIN_CELL_SIZE * 1.5,
  large: MIN_CELL_SIZE * 2,
};
const MAZE_OPTIONS: { label: string; value: MazeAlgorithm }[] = [
  { label: "Random blocks", value: "random" },
  { label: "Backtracking", value: "backtracking" },
  { label: "Division", value: "division" },
  { label: "Randomized Prim", value: "prim" },
  { label: "Fractal tessellation", value: "fractal" },
];
const MAZE_LABELS: Record<MazeAlgorithm, string> = Object.fromEntries(
  MAZE_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<MazeAlgorithm, string>;
const ANIMATION_DELAYS: Record<
  AnimationSpeed,
  { visit: number; path: number }
> = {
  slow: { visit: 48, path: 90 },
  medium: { visit: 18, path: 48 },
  fast: { visit: 6, path: 18 },
};

function createGrid(rows: number, columns: number): Cell[] {
  return Array.from({ length: rows * columns }, () => ({ state: "empty" }));
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getNeighbors(index: number, rows: number, columns: number) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  return [
    [row - 1, column],
    [row, column + 1],
    [row + 1, column],
    [row, column - 1],
  ]
    .filter(
      ([neighborRow, neighborColumn]) =>
        neighborRow >= 0 &&
        neighborRow < rows &&
        neighborColumn >= 0 &&
        neighborColumn < columns,
    )
    .map(
      ([neighborRow, neighborColumn]) => neighborRow * columns + neighborColumn,
    );
}

function manhattanDistance(
  first: number,
  second: number,
  rows: number,
  columns: number,
) {
  return (
    Math.abs(Math.floor(first / columns) - Math.floor(second / columns)) +
    Math.abs((first % columns) - (second % columns))
  );
}

function calculateSearch(
  grid: Cell[],
  rows: number,
  columns: number,
  start: number,
  finish: number,
  algorithm: Algorithm,
) {
  const parent = new Map<number, number>();
  const visitOrder: number[] = [];

  if (algorithm === "astar") {
    const open = [{ index: start, score: 0 }];
    const closed = new Set<number>();
    const scores = new Map<number, number>([[start, 0]]);

    while (open.length > 0) {
      open.sort((first, second) => first.score - second.score);
      const current = open.shift()!.index;
      if (closed.has(current)) continue;
      closed.add(current);
      if (current === finish) break;
      if (current !== start) visitOrder.push(current);

      for (const neighbor of getNeighbors(current, rows, columns)) {
        if (closed.has(neighbor) || grid[neighbor].state === "wall") continue;
        const nextScore = (scores.get(current) ?? Infinity) + 1;
        if (nextScore >= (scores.get(neighbor) ?? Infinity)) continue;
        scores.set(neighbor, nextScore);
        parent.set(neighbor, current);
        open.push({
          index: neighbor,
          score: nextScore + manhattanDistance(neighbor, finish, rows, columns),
        });
      }
    }

    return { parent, visitOrder, found: closed.has(finish) };
  }

  const frontier = [start];
  const discovered = new Set<number>([start]);
  let found = false;

  while (frontier.length > 0) {
    const current = algorithm === "dfs" ? frontier.pop()! : frontier.shift()!;
    if (current === finish) {
      found = true;
      break;
    }
    if (current !== start) visitOrder.push(current);

    for (const neighbor of getNeighbors(current, rows, columns)) {
      if (discovered.has(neighbor) || grid[neighbor].state === "wall") continue;
      discovered.add(neighbor);
      parent.set(neighbor, current);
      frontier.push(neighbor);
    }
  }

  return { parent, visitOrder, found };
}

export default function ShortestPathLayout() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const [gridDimensions, setGridDimensions] = useState(DEFAULT_GRID_DIMENSIONS);
  const [gridCellSize, setGridCellSize] = useState(MIN_CELL_SIZE);
  const [grid, setGrid] = useState(() =>
    createGrid(DEFAULT_GRID_DIMENSIONS.rows, DEFAULT_GRID_DIMENSIONS.columns),
  );
  const [mode, setMode] = useState<PlacementMode>("start");
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [finishIndex, setFinishIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("astar");
  const [mazeAlgorithm, setMazeAlgorithm] = useState<MazeAlgorithm>("random");
  const [animationSpeed, setAnimationSpeed] =
    useState<AnimationSpeed>("medium");
  const [cellSize, setCellSize] = useState<CellSize>("medium");
  const [palette, setPalette] = useState<Palette>(PALETTES[0][0]);
  const [status, setStatus] = useState("Place a start node to begin.");
  const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
  const [draggingToolbar, setDraggingToolbar] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const paintingWalls = useRef(false);
  const toolbarDrag = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const selectedPalette =
    PALETTES.find(([name]) => name === palette) ?? PALETTES[0];
  const [
    ,
    paletteStart,
    paletteFinish,
    paletteVisited,
    palettePath,
    paletteHover,
  ] = selectedPalette;
  const paletteStyle = {
    "--palette-cell": "transparent",
    "--palette-cell-hover": `color-mix(in srgb, ${paletteHover} 35%, transparent)`,
    "--palette-start": paletteFinish,
    "--palette-finish": paletteVisited,
    "--palette-wall": paletteStart,
    "--palette-visited-a": paletteFinish,
    "--palette-visited-b": paletteVisited,
    "--palette-visited-c": paletteHover,
    "--palette-path-a": paletteStart,
    "--palette-path-b": paletteFinish,
    "--palette-path-c": palettePath,
  } as CSSProperties;

  useEffect(() => {
    const stopPaintingWalls = () => {
      paintingWalls.current = false;
    };

    window.addEventListener("pointerup", stopPaintingWalls);
    return () => window.removeEventListener("pointerup", stopPaintingWalls);
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const updateGridSize = () => {
      const { width, height } = page.getBoundingClientRect();
      const minimumCellSize = CELL_SIZE_VALUES[cellSize];
      const nextColumns = Math.max(8, Math.floor(width / minimumCellSize));
      const nextRows = Math.max(8, Math.floor(height / minimumCellSize));
      const nextCellSize = Math.min(width / nextColumns, height / nextRows);
      setGridDimensions((currentDimensions) =>
        currentDimensions.rows === nextRows &&
        currentDimensions.columns === nextColumns
          ? currentDimensions
          : { rows: nextRows, columns: nextColumns },
      );
      setGridCellSize(nextCellSize);
    };

    const observer = new ResizeObserver(updateGridSize);
    observer.observe(page);
    updateGridSize();
    return () => observer.disconnect();
  }, [cellSize]);

  useEffect(() => {
    setGrid(createGrid(gridDimensions.rows, gridDimensions.columns));
    setStartIndex(null);
    setFinishIndex(null);
    setMode("start");
    paintingWalls.current = false;
    setStatus("Place a start node to begin.");
  }, [gridDimensions, cellSize]);

  const handleToolbarPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    toolbarDrag.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: toolbarOffset.x,
      offsetY: toolbarOffset.y,
    };
    setDraggingToolbar(true);
  };

  const handleToolbarPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!toolbarDrag.current) return;
    setToolbarOffset({
      x:
        toolbarDrag.current.offsetX +
        event.clientX -
        toolbarDrag.current.startX,
      y:
        toolbarDrag.current.offsetY +
        event.clientY -
        toolbarDrag.current.startY,
    });
  };

  const handleToolbarPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    toolbarDrag.current = null;
    setDraggingToolbar(false);
  };

  const updateCell = (index: number, state: CellState) => {
    setGrid((current) =>
      current.map((cell, cellIndex) =>
        cellIndex === index ? { ...cell, state } : cell,
      ),
    );
  };

  const handleCellClick = (index: number) => {
    if (running) return;

    const cell = grid[index];
    if (mode === "start") {
      if (index === finishIndex) {
        setStatus("Choose a different start node.");
        return;
      }
      if (startIndex !== null) updateCell(startIndex, "empty");
      updateCell(index, "start");
      setStartIndex(index);
      setStatus("Now choose a finish node.");
      return;
    }

    if (mode === "finish") {
      if (index === startIndex) {
        setStatus("Choose a different finish node.");
        return;
      }
      if (finishIndex !== null) updateCell(finishIndex, "empty");
      updateCell(index, "finish");
      setFinishIndex(index);
      setStatus("Add blocks or start the search.");
      return;
    }

    if (cell.state === "start" || cell.state === "finish") return;
    updateCell(index, cell.state === "wall" ? "empty" : "wall");
    setStatus("Blocks added. Start the search when ready.");
  };

  const handleCellPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (running || mode !== "wall") return;
    event.preventDefault();
    paintingWalls.current = true;
    handleCellClick(index);
  };

  const handleCellPointerEnter = (index: number) => {
    if (!paintingWalls.current || running || mode !== "wall") return;
    const cell = grid[index];
    if (cell.state === "empty") {
      updateCell(index, "wall");
      setStatus("Blocks added. Start the search when ready.");
    }
  };

  const handlePlacementModeChange = (value: string) => {
    const nextMode = value as PlacementMode;
    setMode(nextMode);
    setStatus(
      nextMode === "start"
        ? "Click a grid cell to place the start node."
        : nextMode === "finish"
          ? "Click a grid cell to place the finish node."
          : "Click or drag across grid cells to add or remove blocks.",
    );
  };

  const reset = () => {
    if (running) return;
    setGrid(createGrid(gridDimensions.rows, gridDimensions.columns));
    setStartIndex(null);
    setFinishIndex(null);
    setMode("start");
    paintingWalls.current = false;
    setStatus("Place a start node to begin.");
  };

  const generateMazeBoard = async () => {
    if (running) return;
    const { rows, columns } = gridDimensions;
    const nextStart = columns + 1;
    const finishRow = Math.max(1, rows - 2);
    const nextFinish = finishRow * columns + columns - 2;
    const generatedMaze = generateMaze(
      rows,
      columns,
      mazeAlgorithm,
      nextStart,
      nextFinish,
    );
    const revealOrder = shuffle(
      Array.from({ length: rows * columns }, (_, index) => index),
    );
    const revealDelay =
      animationSpeed === "slow" ? 1 : animationSpeed === "fast" ? 0.03 : 0.3;

    setRunning(true);
    setGrid(createGrid(rows, columns));
    setStartIndex(nextStart);
    setFinishIndex(nextFinish);
    setMode("wall");
    setStatus("Generating maze...");

    for (const index of revealOrder) {
      setGrid((current) =>
        current.map((cell, cellIndex) =>
          cellIndex === index ? generatedMaze[index] : cell,
        ),
      );
      await wait(revealDelay);
    }

    setGrid(generatedMaze);
    setRunning(false);
    setStatus(`${MAZE_LABELS[mazeAlgorithm]} maze generated.`);
  };

  const findPath = async () => {
    if (running) return;
    if (startIndex === null || finishIndex === null) {
      notifications.show({
        title: "Two nodes needed",
        message: "Choose both a start node and a finish node first.",
        color: "orange",
      });
      return;
    }

    const searchGrid = grid.map((cell) =>
      cell.state === "visited" || cell.state === "path"
        ? { state: "empty" as CellState }
        : cell,
    );
    setRunning(true);
    setGrid(searchGrid);
    setStatus(`Running ${algorithm.toUpperCase()}...`);
    const { visit: visitDelay, path: pathDelay } =
      ANIMATION_DELAYS[animationSpeed];

    const { parent, visitOrder, found } = calculateSearch(
      searchGrid,
      gridDimensions.rows,
      gridDimensions.columns,
      startIndex,
      finishIndex,
      algorithm,
    );

    for (const index of visitOrder) {
      if (index !== finishIndex) updateCell(index, "visited");
      await wait(visitDelay);
    }

    if (!found) {
      setRunning(false);
      setStatus("No valid path found.");
      notifications.show({
        title: "No path found",
        message: "Remove a few blocks and try the search again.",
        color: "red",
      });
      return;
    }

    const path: number[] = [];
    let current: number | undefined = finishIndex;
    while (current !== undefined && current !== startIndex) {
      path.unshift(current);
      current = parent.get(current);
    }

    for (const index of path) {
      if (index !== finishIndex) updateCell(index, "path");
      await wait(pathDelay);
    }

    setRunning(false);
    setStatus(`${path.length} steps found.`);
  };

  return (
    <Box
      ref={pageRef}
      className={`shortest-path-page${running ? " shortest-path-playing" : ""}`}
      style={paletteStyle}
    >
      <Box className="shortest-path-home-title" onClick={() => navigate("/")}>
        <Text component="span">Playground No.3: Shortest Path</Text>
        <Text component="span">Pathfinding study</Text>
      </Box>
      <Box
        className="shortest-path-grid"
        role="grid"
        aria-label={`${gridDimensions.rows} by ${gridDimensions.columns} pathfinding grid`}
        style={{
          width: `${gridDimensions.columns * gridCellSize}px`,
          height: `${gridDimensions.rows * gridCellSize}px`,
          gridTemplateColumns: `repeat(${gridDimensions.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridDimensions.rows}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((cell, index) => (
          <button
            key={index}
            type="button"
            role="gridcell"
            aria-label={`Grid node ${index + 1}, ${cell.state}`}
            className={`shortest-path-cell shortest-path-cell-${cell.state}`}
            onClick={(event) => {
              if (mode === "wall" && event.detail !== 0) return;
              handleCellClick(index);
            }}
            onPointerDown={(event) => handleCellPointerDown(event, index)}
            onPointerEnter={() => handleCellPointerEnter(index)}
            onPointerUp={() => {
              paintingWalls.current = false;
            }}
            disabled={running}
          />
        ))}
      </Box>

      <Paper
        className={`shortest-path-toolbar${draggingToolbar ? " shortest-path-toolbar-dragging" : ""}${toolbarCollapsed ? " shortest-path-toolbar-collapsed" : ""}`}
        shadow="sm"
        radius="md"
        p="md"
        style={{
          transform: `translate(${toolbarOffset.x}px, ${toolbarOffset.y}px)`,
        }}
      >
        <Box
          className="shortest-path-toolbar-handle"
          onPointerDown={handleToolbarPointerDown}
          onPointerMove={handleToolbarPointerMove}
          onPointerUp={handleToolbarPointerUp}
          onPointerCancel={handleToolbarPointerUp}
        >
          <Group
            justify="space-between"
            align="flex-start"
            gap="md"
            wrap="wrap"
          >
            <Stack gap={2}>
              <Text className="shortest-path-kicker">Pathfinding study</Text>
              <Text component="h1" className="shortest-path-title">
                Shortest path
              </Text>
              <Text size="sm" c="dimmed">
                {status}
              </Text>
            </Stack>
            <Group
              gap="xs"
              style={{
                transform: `translate(5px, -5px)`,
              }}
            >
              <Text className="shortest-path-drag-hint">Drag panel</Text>
              <ActionIcon
                variant="light"
                size="sm"
                aria-label={
                  toolbarCollapsed ? "Expand controls" : "Minimize controls"
                }
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setToolbarCollapsed((collapsed) => !collapsed);
                }}
              >
                {toolbarCollapsed ? "+" : "-"}
              </ActionIcon>
            </Group>
          </Group>
        </Box>

        {!toolbarCollapsed && (
          <>
            <Group
              mt="md"
              justify="space-between"
              align="flex-end"
              gap="sm"
              wrap="wrap"
            >
              <Grid gap="sm">
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack gap={4}>
                    <Text className="shortest-path-control-label">
                      Search algorithm
                    </Text>
                    <Box className="shortest-path-desktop-control">
                      <SegmentedControl
                        fullWidth
                        value={algorithm}
                        onChange={(value) => setAlgorithm(value as Algorithm)}
                        data={[
                          { label: "BFS", value: "bfs" },
                          { label: "DFS", value: "dfs" },
                          { label: "A*", value: "astar" },
                        ]}
                        disabled={running}
                      />
                    </Box>
                    <Select
                      className="shortest-path-mobile-control"
                      value={algorithm}
                      onChange={(value) =>
                        value && setAlgorithm(value as Algorithm)
                      }
                      data={[
                        { label: "BFS", value: "bfs" },
                        { label: "DFS", value: "dfs" },
                        { label: "A*", value: "astar" },
                      ]}
                      allowDeselect={false}
                      disabled={running}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack gap={4}>
                    <Text className="shortest-path-control-label">
                      Node placement
                    </Text>
                    <Box className="shortest-path-desktop-control">
                      <SegmentedControl
                        fullWidth
                        value={mode}
                        onChange={handlePlacementModeChange}
                        data={[
                          { label: "Start", value: "start" },
                          { label: "Finish", value: "finish" },
                          { label: "Block", value: "wall" },
                        ]}
                        disabled={running}
                      />
                    </Box>
                    <Select
                      className="shortest-path-mobile-control"
                      value={mode}
                      onChange={(value) =>
                        value && handlePlacementModeChange(value)
                      }
                      data={[
                        { label: "Start", value: "start" },
                        { label: "Finish", value: "finish" },
                        { label: "Block", value: "wall" },
                      ]}
                      allowDeselect={false}
                      disabled={running}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack gap={4}>
                    <Text className="shortest-path-control-label">
                      Cell size
                    </Text>
                    <Box className="shortest-path-desktop-control">
                      <SegmentedControl
                        fullWidth
                        value={cellSize}
                        onChange={(value) => setCellSize(value as CellSize)}
                        data={[
                          { label: "S", value: "small" },
                          { label: "M", value: "medium" },
                          { label: "L", value: "large" },
                        ]}
                        disabled={running}
                      />
                    </Box>
                    <Select
                      className="shortest-path-mobile-control"
                      value={cellSize}
                      onChange={(value) =>
                        value && setCellSize(value as CellSize)
                      }
                      data={[
                        { label: "Small", value: "small" },
                        { label: "Medium", value: "medium" },
                        { label: "Large", value: "large" },
                      ]}
                      allowDeselect={false}
                      disabled={running}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack gap={4}>
                    <Text className="shortest-path-control-label">
                      Animation speed
                    </Text>
                    <Select
                      value={animationSpeed}
                      onChange={(value) =>
                        value && setAnimationSpeed(value as AnimationSpeed)
                      }
                      data={[
                        { label: "Slow", value: "slow" },
                        { label: "Medium", value: "medium" },
                        { label: "Fast", value: "fast" },
                      ]}
                      allowDeselect={false}
                      disabled={running}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack gap={4}>
                    <Text className="shortest-path-control-label">
                      Color palette
                    </Text>
                    <Select
                      value={palette}
                      onChange={(value) =>
                        value && setPalette(value as Palette)
                      }
                      data={PALETTES.map(([name]) => ({
                        label: name,
                        value: name,
                      }))}
                      allowDeselect={false}
                      disabled={running}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 6 }}>
                  <Button
                    color="red"
                    fullWidth
                    variant="light"
                    onClick={reset}
                    disabled={running}
                  >
                    Reset
                  </Button>
                </Grid.Col>
                <Grid.Col span={{ base: 6 }}>
                  <Button
                    color="green"
                    fullWidth
                    variant="light"
                    onClick={findPath}
                    loading={running}
                  >
                    Start
                  </Button>
                </Grid.Col>
              </Grid>
            </Group>
            <Box className="shortest-path-maze-section" mt="md" pt="sm">
              <Grid gap="xs">
                <Grid.Col>
                  <Stack gap={4}>
                    <Text component="h1" className="shortest-path-title">
                      Maze Generator
                    </Text>
                    <Text size="sm" c="dimmed" mb="sm">
                      Select an algorithm to generate
                    </Text>
                    <Text className="shortest-path-control-label">
                      Supported Algorithms
                    </Text>
                    <Box className="shortest-path-desktop-control">
                      <SegmentedControl
                        fullWidth
                        value={mazeAlgorithm}
                        onChange={(value) =>
                          setMazeAlgorithm(value as MazeAlgorithm)
                        }
                        data={MAZE_OPTIONS}
                        disabled={running}
                      />
                    </Box>
                    <Select
                      className="shortest-path-mobile-control"
                      value={mazeAlgorithm}
                      onChange={(value) =>
                        value && setMazeAlgorithm(value as MazeAlgorithm)
                      }
                      data={MAZE_OPTIONS}
                      allowDeselect={false}
                      disabled={running}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col>
                  <Button
                    fullWidth
                    variant="light"
                    onClick={generateMazeBoard}
                    disabled={running}
                  >
                    Generate maze
                  </Button>
                </Grid.Col>
              </Grid>
            </Box>
          </>
        )}
      </Paper>

      <Paper className="shortest-path-legend" shadow="sm" radius="md" p="xs">
        <Group gap="sm">
          {[
            ["empty", "Empty"],
            ["start", "Start"],
            ["finish", "Finish"],
            ["wall", "Block"],
            ["visited", "Visited"],
            ["path", "Path"],
          ].map(([state, label]) => (
            <Group key={state} gap={6}>
              <span
                className={`shortest-path-swatch shortest-path-swatch-${state}`}
              />
              <Text size="xs">{label}</Text>
            </Group>
          ))}
        </Group>
      </Paper>
    </Box>
  );
}

function setMazeWall(
  grid: Cell[],
  index: number,
  start: number,
  finish: number,
) {
  if (index !== start && index !== finish) grid[index].state = "wall";
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function connectMazeEndpoint(
  grid: Cell[],
  rows: number,
  columns: number,
  endpoint: number,
) {
  if (grid[endpoint].state === "empty") return;

  const queue = [endpoint];
  const parent = new Map<number, number | null>([[endpoint, null]]);
  let target: number | null = null;

  while (queue.length > 0 && target === null) {
    const current = queue.shift()!;
    const row = Math.floor(current / columns);
    const column = current % columns;
    if (current !== endpoint && grid[current].state === "empty") {
      target = current;
      break;
    }

    for (const [neighborRow, neighborColumn] of shuffle([
      [row - 1, column],
      [row, column + 1],
      [row + 1, column],
      [row, column - 1],
    ])) {
      if (
        neighborRow < 1 ||
        neighborRow >= rows - 1 ||
        neighborColumn < 1 ||
        neighborColumn >= columns - 1
      ) {
        continue;
      }
      const neighbor = neighborRow * columns + neighborColumn;
      if (!parent.has(neighbor)) {
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  if (target === null) return;
  let current: number | null = target;
  while (current !== null) {
    grid[current].state = "empty";
    current = parent.get(current) ?? null;
  }
}

function generatePrimMaze(grid: Cell[], rows: number, columns: number) {
  grid.forEach((cell) => {
    cell.state = "wall";
  });

  const frontier: number[] = [];
  const frontierSet = new Set<number>();
  const addFrontier = (row: number, column: number) => {
    for (const [nextRow, nextColumn] of [
      [row - 2, column],
      [row + 2, column],
      [row, column - 2],
      [row, column + 2],
    ]) {
      if (
        nextRow <= 0 ||
        nextRow >= rows - 1 ||
        nextColumn <= 0 ||
        nextColumn >= columns - 1
      ) {
        continue;
      }
      const index = nextRow * columns + nextColumn;
      if (grid[index].state === "wall" && !frontierSet.has(index)) {
        frontier.push(index);
        frontierSet.add(index);
      }
    }
  };

  grid[columns + 1].state = "empty";
  addFrontier(1, 1);

  while (frontier.length > 0) {
    const frontierIndex = Math.floor(Math.random() * frontier.length);
    const current = frontier.splice(frontierIndex, 1)[0];
    frontierSet.delete(current);
    const row = Math.floor(current / columns);
    const column = current % columns;
    const openNeighbors = [
      [row - 2, column],
      [row + 2, column],
      [row, column - 2],
      [row, column + 2],
    ].filter(
      ([neighborRow, neighborColumn]) =>
        neighborRow > 0 &&
        neighborRow < rows - 1 &&
        neighborColumn > 0 &&
        neighborColumn < columns - 1 &&
        grid[neighborRow * columns + neighborColumn].state === "empty",
    );

    if (openNeighbors.length === 0) continue;
    const [neighborRow, neighborColumn] =
      openNeighbors[Math.floor(Math.random() * openNeighbors.length)];
    grid[current].state = "empty";
    grid[
      ((row + neighborRow) / 2) * columns + (column + neighborColumn) / 2
    ].state = "empty";
    addFrontier(row, column);
  }
}

function generateFractalMaze(
  grid: Cell[],
  rows: number,
  columns: number,
  start: number,
  finish: number,
) {
  const tessellate = (
    top: number,
    left: number,
    bottom: number,
    right: number,
  ) => {
    if (bottom - top < 5 || right - left < 5) return;

    const middleRow = Math.floor((top + bottom) / 2);
    const middleColumn = Math.floor((left + right) / 2);
    const horizontalPassages = new Set(
      shuffle(
        Array.from({ length: right - left + 1 }, (_, index) => left + index),
      ).slice(0, Math.max(2, Math.floor((right - left + 1) / 4))),
    );
    const verticalPassages = new Set(
      shuffle(
        Array.from({ length: bottom - top + 1 }, (_, index) => top + index),
      ).slice(0, Math.max(2, Math.floor((bottom - top + 1) / 4))),
    );

    for (let column = left; column <= right; column += 1) {
      if (!horizontalPassages.has(column)) {
        setMazeWall(grid, middleRow * columns + column, start, finish);
      }
    }
    for (let row = top; row <= bottom; row += 1) {
      if (!verticalPassages.has(row)) {
        setMazeWall(grid, row * columns + middleColumn, start, finish);
      }
    }

    tessellate(top, left, middleRow - 1, middleColumn - 1);
    tessellate(top, middleColumn + 1, middleRow - 1, right);
    tessellate(middleRow + 1, left, bottom, middleColumn - 1);
    tessellate(middleRow + 1, middleColumn + 1, bottom, right);
  };

  tessellate(1, 1, rows - 2, columns - 2);
}

function generateMaze(
  rows: number,
  columns: number,
  algorithm: MazeAlgorithm,
  start: number,
  finish: number,
) {
  const maze = createGrid(rows, columns);

  if (algorithm === "random") {
    maze.forEach((cell, index) => {
      if (index !== start && index !== finish && Math.random() < 0.28) {
        cell.state = "wall";
      }
    });
  }

  if (algorithm === "backtracking") {
    maze.forEach((cell) => {
      cell.state = "wall";
    });
    const stack = [columns + 1];
    maze[columns + 1].state = "empty";

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const row = Math.floor(current / columns);
      const column = current % columns;
      const candidates = shuffle([
        [row - 2, column],
        [row + 2, column],
        [row, column - 2],
        [row, column + 2],
      ]).filter(
        ([nextRow, nextColumn]) =>
          nextRow > 0 &&
          nextRow < rows - 1 &&
          nextColumn > 0 &&
          nextColumn < columns - 1 &&
          maze[nextRow * columns + nextColumn].state === "wall",
      );

      if (candidates.length === 0) {
        stack.pop();
        continue;
      }

      const [nextRow, nextColumn] = candidates[0];
      const next = nextRow * columns + nextColumn;
      maze[next].state = "empty";
      maze[((row + nextRow) / 2) * columns + (column + nextColumn) / 2].state =
        "empty";
      stack.push(next);
    }
  }

  if (algorithm === "prim") {
    generatePrimMaze(maze, rows, columns);
  }

  if (algorithm === "fractal") {
    generateFractalMaze(maze, rows, columns, start, finish);
  }

  if (algorithm === "division") {
    const divide = (
      top: number,
      left: number,
      bottom: number,
      right: number,
    ) => {
      if (right - left < 2 || bottom - top < 2) return;

      const horizontal = bottom - top > right - left;
      if (horizontal) {
        const wallRow =
          top +
          1 +
          2 * Math.floor(Math.random() * Math.floor((bottom - top) / 2));
        const passageColumn =
          left + Math.floor(Math.random() * (right - left + 1));
        for (let column = left; column <= right; column++) {
          setMazeWall(maze, wallRow * columns + column, start, finish);
        }
        maze[wallRow * columns + passageColumn].state = "empty";
        divide(top, left, wallRow - 1, right);
        divide(wallRow + 1, left, bottom, right);
      } else {
        const wallColumn =
          left +
          1 +
          2 * Math.floor(Math.random() * Math.floor((right - left) / 2));
        const passageRow = top + Math.floor(Math.random() * (bottom - top + 1));
        for (let row = top; row <= bottom; row++) {
          setMazeWall(maze, row * columns + wallColumn, start, finish);
        }
        maze[passageRow * columns + wallColumn].state = "empty";
        divide(top, left, bottom, wallColumn - 1);
        divide(top, wallColumn + 1, bottom, right);
      }
    };

    divide(0, 0, rows - 1, columns - 1);
  }

  connectMazeEndpoint(maze, rows, columns, finish);

  if (algorithm !== "random") {
    for (let loopRow = 1; loopRow < rows - 1; loopRow += 1) {
      for (let loopColumn = 1; loopColumn < columns - 1; loopColumn += 1) {
        const index = loopRow * columns + loopColumn;
        if (maze[index].state !== "wall" || Math.random() >= 0.2) continue;

        const horizontalLoop =
          maze[index - 1].state === "empty" &&
          maze[index + 1].state === "empty";
        const verticalLoop =
          maze[index - columns].state === "empty" &&
          maze[index + columns].state === "empty";

        if (horizontalLoop || verticalLoop) maze[index].state = "empty";
      }
    }
  }

  maze[start].state = "start";
  maze[finish].state = "finish";
  return maze;
}
