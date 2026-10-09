import type { JSX } from "react";

import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GardenLayout from "./layouts/garden/garden.layout";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import MainLayout from "./layouts/main.layout";

import "@mantine/core/styles.css";
import '@mantine/notifications/styles.css';
import "@mantine/dates/styles.css";
import "@fontsource/libre-baskerville/400.css"; // Specify weight
import "@fontsource/libre-baskerville/400-italic.css"; // Specify weight and style
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "./styles/app.css"
import CrystalLayout from "./layouts/crystal/crystal.layout";
import ShortestPathLayout from "./layouts/shortest_path/shortest_path.layout";
import { Notifications } from "@mantine/notifications";

type RouteItem = {
  element: JSX.Element;
  path: string;
};

const routes: RouteItem[] = [
  {
    path: "/*",
    element: <MainLayout />,
  },
  {
    path: "/garden",
    element: <GardenLayout />,
  },
  {
    path: "/crystal",
    element: <CrystalLayout />,
  },
  {
    path: "/shortest-path",
    element: <ShortestPathLayout />,
  },
];

function App() {
  return (
    <MantineProvider
      defaultColorScheme="light"
      theme={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <Notifications />
      <BrowserRouter>
        <SpeedInsights />
        <Analytics />
        <Routes>
          {routes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
