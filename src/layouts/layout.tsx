import {
  Container,
  Group,
  SegmentedControl,
  Title,
} from "@mantine/core";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLenis } from "lenis/react";
import Dither from "../components/backgrounds/dither";

const SITE_PAGES = [
  { label: "Playground", path: "/" },
  { label: "Curated", path: "/curated" },
  { label: "About", path: "/about" },
] as const;

const DITHER_THEMES = {
  "/": {
    waveColor: "#ffec95",
    ditherMode: "bayer",
    backgroundColor: "#f14729",
  },
  "/curated": {
    waveColor: "#e6aaff",
    ditherMode: "crosshatch",
    backgroundColor: "#0000ff",
  },
  "/about": {
    waveColor: "#9edfc7",
    ditherMode: "lines",
    backgroundColor: "#183b3b",
  },
} as const;

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const lenis = useLenis();
  const currentPage =
    SITE_PAGES.find(
      ({ path }) =>
        path === location.pathname ||
        (path === "/curated" && location.pathname.startsWith(`${path}/`)),
    ) ?? SITE_PAGES[0];
  const ditherTheme = DITHER_THEMES[currentPage.path];

  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [currentPage.path, lenis]);

  return (
    <Container
      fluid
      className="main-container"
      pt="20"
      style={{
        minHeight: "100dvh",
        paddingBottom: "20px",
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
          aria-label="Site pages"
          value={currentPage.path}
          onChange={(path) => navigate(path)}
          data={SITE_PAGES.map(({ label, path }) => ({ label, value: path }))}
        />
      </Group>
      <section className="main-dither-section">
        <Dither
          waveColor={ditherTheme.waveColor}
          ditherMode={ditherTheme.ditherMode}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={2}
          colorNum={4}
          contrast={0.7}
          waveAmplitude={0.28}
          waveFrequency={2}
          waveSpeed={0.05}
          backgroundColor={ditherTheme.backgroundColor}
        />
        <Group className="main-dither-title" align="flex-end" gap={5}>
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
            {currentPage.label}
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
      </section>
      <Outlet />
    </Container>
  );
}