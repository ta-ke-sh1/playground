import {
  Container,
  Group,
  SegmentedControl,
  Stack,
  Title,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
  Center,
} from "@mantine/core";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLenis } from "lenis/react";
import Dither from "../components/backgrounds/dither";
import {
  IconCardsFilled,
  IconDeviceGamepad2,
  IconSun,
  IconMoon,
  IconManFilled,
} from "@tabler/icons-react";

const SITE_PAGES = [
  { label: "Playground", path: "/", icon: IconDeviceGamepad2 },
  { label: "Curated", path: "/curated", icon: IconCardsFilled },
  { label: "About", path: "/about", icon: IconManFilled },
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
  const colorScheme = useComputedColorScheme("light");
  const { setColorScheme } = useMantineColorScheme();
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
      <Stack gap={0} style={{
          position: "fixed",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 100,
        }}>
          <Text
            c="dimmed"
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
            }}
          >
            Theme
          </Text>
          <SegmentedControl
            orientation="vertical"
            aria-label="Color scheme"
            value={colorScheme}
            onChange={(scheme) => setColorScheme(scheme as "light" | "dark")}
            data={[
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <IconSun color='var(--mantine-color-yellow-4)' size={16} />
                    <span>Light</span>
                  </Center>
                ),
                value: "light",
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <IconMoon color='var(--mantine-color-blue-6)' size={16} />
                    <span>Dark</span>
                  </Center>
                ),
                value: "dark",
              },
            ]}
          />
        </Stack>
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
        
        <Stack gap={0}>
          <Text
            c="dimmed"
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
            }}
          >
            Navigation
          </Text>
          <SegmentedControl
            aria-label="Site pages"
            value={currentPage.path}
            onChange={(path) => navigate(path)}
            data={SITE_PAGES.map(({ label, path, icon: Icon }) => ({
              value: path,
              label: (
                <Center style={{ gap: 6 }}>
                  <Icon size={14} aria-hidden="true" />
                  <span>{label}</span>
                </Center>
              ),
            }))}
          />
        </Stack>
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
