import { useMemo, useState } from "react";
import {
  Container,
  Group,
  Title,
  Text,
  Stack,
  SegmentedControl,
} from "@mantine/core";
import type { PlaygroundItem } from "../models/playgroundItem.model";
import PlaygroundItemList from "../components/viewer/playground/playgrounItemList.viewer";
import PlaygroundItemFiltersPanel from "../components/viewer/playground/playgroundItemFilters";
import type { PlaygroundItemFilters } from "../components/viewer/playground/playgroundItemFilters";
import Dither from "../components/backgrounds/dither";
import CollectionsLayout from "./collection/collections.layout";

const projects: PlaygroundItem[] = [
  {
    name: "Type Garden",
    images: [
      "/projects/garden/1.png",
      "/projects/garden/2.png",
      "/projects/garden/3.png",
    ],
    tags: ["TypeScript", "Generative", "Interactive"],
    category: "Web Art",
    date: "2026-10-08",
    description:
      "An interactive generative garden: type to grow flowers from letters, choose flower styles and color palettes, then export your creation as a PNG.",
    url: "/garden",
  },
  {
    name: "Crystal Texts",
    images: [
      "/projects/crystal/1.png",
      "/projects/crystal/2.png",
      "/projects/crystal/3.png",
    ],
    tags: ["TypeScript", "Three.js", "3D", "Interactive"],
    category: "Web Art",
    date: "2026-10-09",
    description:
      "An interactive generative crystal text generator: type to create crystal-like text structures, customize styles and colors, then export your creation as a PNG.",
    url: "/crystal",
  },
  {
    name: "Maze Visualizer",
    images: ["/projects/shortest_path/1.png"],
    tags: ["TypeScript", "Simulation", "Algorithm"],
    category: "Simulation",
    date: "2026-10-10",
    description:
      "An interactive shortest-path and maze visualizer with BFS, DFS, A*, randomized maze generation, and animated pathfinding.",
    url: "/shortest-path",
  },
];

enum SITE_MODES {
  Playground = "Playground",
  Curated = "Curated",
}

export default function MainLayout() {
  const [mode, setMode] = useState<SITE_MODES>(SITE_MODES.Playground);

  return (
    <Container
      fluid
      className="main-container"
      mt="25"
      style={{
        minHeight: "100dvh",
        paddingBottom: "20px",
        position: "relative",
      }}
    >
      <Group
        justify="center"
        mb="sm"
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
        }}
      >
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value)}
          data={Object.values(SITE_MODES)}
        />
      </Group>
      <Group
        align="flex-end"
        gap={5}
        style={{
          position: "absolute",
          left: 42,
          top: "105px",
          zIndex: 10,
        }}
      >
        <Title
          style={{
            fontFamily: "Libre Baskerville, serif",
            fontStyle: "italic",
            fontSize: "32px",
            fontWeight: "200",
            color: "white",
            userSelect: "none",
          }}
        >
          {mode}
        </Title>
        <Title
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "14px",
            fontWeight: "200",
            transform: "translateY(-6px)",
            color: "white",
            cursor: "pointer",
          }}
          onClick={() => {
            window.open("https://trung-ha-26.vercel.app/", "_blank");
          }}
        >
          (by trung.ha)
        </Title>
      </Group>
      <Dither
        waveColor={
          mode === SITE_MODES.Playground ? [0.5, 0.5, 0] : [0.9, 0.2, 1]
        }
        disableAnimation={false}
        enableMouseInteraction={false}
        mouseRadius={1.5}
        colorNum={4}
        waveAmplitude={0.4}
        waveFrequency={4}
        waveSpeed={1}
        backgroundColor={
          mode === SITE_MODES.Playground ? [255, 0, 0] : [0, 0, 255]
        }
      />
      {mode === SITE_MODES.Playground ? (
        <PlaygroundSite />
      ) : (
        <CollectionsLayout />
      )}
    </Container>
  );
}

function PlaygroundSite() {
  const [filters, setFilters] = useState<PlaygroundItemFilters>({
    tags: [],
    category: null,
    name: "",
    startDate: "",
    endDate: "",
  });
  const filteredProjects = useMemo(() => {
    const normalizedName = filters.name.trim().toLocaleLowerCase();

    return projects.filter((project) => {
      const matchesTags =
        filters.tags.length === 0 ||
        filters.tags.some((tag) => project.tags.includes(tag));
      const matchesCategory =
        filters.category === null || project.category === filters.category;
      const matchesName =
        normalizedName === "" ||
        project.name.toLocaleLowerCase().includes(normalizedName);
      const matchesStartDate =
        filters.startDate === "" || project.date >= filters.startDate;
      const matchesEndDate =
        filters.endDate === "" || project.date <= filters.endDate;

      return (
        matchesTags &&
        matchesCategory &&
        matchesName &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [filters]);

  return (
    <Stack gap="xs" mb="40">
      <Group
        mt="sm"
        style={{
          width: "50%",
        }}
      >
        <Text
          style={{
            textTransform: "uppercase",
          }}
        >
          Little backyard playground site that I used to re-create, test, and
          play on visual effects and newly accquired knowledge. All sources will
          be credited inside the playground item details.
        </Text>
      </Group>
      <PlaygroundItemFiltersPanel
        items={projects}
        value={filters}
        onChange={setFilters}
        resultCount={filteredProjects.length}
        totalCount={projects.length}
      />
      <PlaygroundItemList items={filteredProjects} />
    </Stack>
  );
}
