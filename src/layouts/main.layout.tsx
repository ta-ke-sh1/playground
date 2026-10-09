import { useMemo, useState } from "react";
import { Container } from "@mantine/core";
import type { PlaygroundItem } from "../models/playgroundItem.model";
import PlaygroundItemList from "../components/viewer/playground/playgrounItemList.viewer";
import PlaygroundItemFiltersPanel from "../components/viewer/playground/playgroundItemFilters";
import type { PlaygroundItemFilters } from "../components/viewer/playground/playgroundItemFilters";

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

export default function MainLayout() {
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
    <Container fluid className="main-container" mt="lg">
      <PlaygroundItemFiltersPanel
        items={projects}
        value={filters}
        onChange={setFilters}
        resultCount={filteredProjects.length}
        totalCount={projects.length}
      />
      <PlaygroundItemList items={filteredProjects} />
    </Container>
  );
}
