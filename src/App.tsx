import { lazy, Suspense } from "react";
import { Center, MantineProvider } from "@mantine/core";
import { BitLoader } from "./components/loader/bit-loader";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { ReactLenis } from "lenis/react";

import "lenis/dist/lenis.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@fontsource/libre-baskerville/400.css"; // Specify weight
import "@fontsource/libre-baskerville/400-italic.css"; // Specify weight and style
import "@fontsource/libre-baskerville/700-italic.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "./styles/app.css";
import { Notifications } from "@mantine/notifications";

const MainLayout = lazy(() => import("./layouts/layout"));
const PlaygroundPage = lazy(() => import("./layouts/playground/page"));
const CuratedLayout = lazy(() => import("./layouts/curated/layout"));
const CollectionsPage = lazy(() => import("./layouts/curated/page"));
const CollectionDetail = lazy(
  () => import("./layouts/curated/collection-details"),
);
const AboutLayout = lazy(() => import("./layouts/about/page"));
const GardenLayout = lazy(() => import("./layouts/playground/garden/page"));
const CrystalLayout = lazy(() => import("./layouts/playground/crystal/page"));
const ShortestPathLayout = lazy(() => import("./layouts/playground/shortest-path/page"));
const InfiniteZoomLayout = lazy(() => import("./layouts/playground/zoom/page"));
const SoundboardLayout = lazy(() => import("./layouts/playground/soundboard/page"));

function RouteLenis() {
  const { pathname } = useLocation();

  return (
    <ReactLenis
      root
      options={{ infinite: pathname === "/playground/infinite-zoom" }}
    />
  );
}

function App() {
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{ fontFamily: "DM Mono, monospace" }}
    >
      <Notifications />
      <BrowserRouter>
        <RouteLenis />
        <SpeedInsights />
        <Analytics />
        <Suspense
          fallback={
            <Center h="100dvh">
              <BitLoader />
            </Center>
          }
        >
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<PlaygroundPage />} />
              <Route path="curated" element={<CuratedLayout />}>
                <Route index element={<CollectionsPage />} />
                <Route path=":id" element={<CollectionDetail />} />
              </Route>
              <Route path="about" element={<AboutLayout />} />
            </Route>
            <Route path="/playground/garden" element={<GardenLayout />} />
            <Route path="/playground/crystal" element={<CrystalLayout />} />
            <Route path="/playground/shortest-path" element={<ShortestPathLayout />} />
            <Route path="/playground/infinite-zoom" element={<InfiniteZoomLayout />} />
            <Route path="/playground/soundboard" element={<SoundboardLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
