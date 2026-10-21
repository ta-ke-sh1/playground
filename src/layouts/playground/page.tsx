import { useMemo, useState } from "react";
import { Grid, Stack, Text, Title } from "@mantine/core";
import type { PlaygroundItem } from "../../models/playgroundItem.model";
import PlaygroundItemList from "../../components/viewer/playground/playgroundItemList.viewer";
import PlaygroundItemFiltersPanel from "../../components/viewer/playground/playgroundItemFilters";
import type { PlaygroundItemFilters } from "../../components/viewer/playground/playgroundItemFilters";
import { IconBrightnessDownFilled } from "@tabler/icons-react";

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
  {
    name: "Infinite Zoom Scrolling",
    images: ["/projects/infinite_zoom/1.png", "/projects/infinite_zoom/2.png", "/projects/infinite_zoom/3.png"],
    tags: ["TypeScript", "GSAP", "Scroll", "Interactive"],
    category: "Simulation",
    date: "2026-10-12",
    description:
      "An interactive infinite zoom scrolling experience: scroll to continuously zoom into a scene with smooth animations and dynamic content.",
    url: "/infinite-zoom",
  },
  {
    name: "Soundboard",
    images: ["/projects/soundboard/1.png", "/projects/soundboard/2.png", "/projects/soundboard/3.png"],
    tags: ["TypeScript", "Web Audio", "Interactive"],
    category: "Music",
    date: "2026-10-15",
    description:
      "A playful step sequencer for arranging notes in a grid, changing tempo, and experimenting with synthesized instruments.",
    url: "/soundboard",
  },
];

export default function PlaygroundPage() {
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
        filters.tags.every((tag) => project.tags.includes(tag));
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
    <Stack gap="xs" mt="lg" mb="40">
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 2 }}>
          <Title
            style={{
              fontFamily: "Libre Baskerville",
              fontWeight: 200,
              fontSize: "18px",
            }}
          >
            Experiments and replications for study purposes{" "}
          </Title>
          <IconBrightnessDownFilled
            className="collections-title__flower"
            stroke={1}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="xs">
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              Little backyard playground site that I used to re-create, test,
              and play on visual effects and newly accquired knowledge.
            </Text>
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              All sources will be credited inside the playground item details.
            </Text>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="xs">
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              I choose projects that spark my curiosity—sites with interactions,
              visual details, or ideas I want to understand better. Recreating
              them gives me a hands-on way to study what makes the experience
              work.
            </Text>
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              These are experiments, not exact copies: I rebuild, play with
              variations, and explore different techniques. Along the way, I
              learn from the original and develop ideas of my own.
            </Text>
          </Stack>
        </Grid.Col>
      </Grid>
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
