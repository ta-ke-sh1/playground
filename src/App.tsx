import type { JSX } from "react";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GardenLayout from "./layouts/garden/garden.layout";

type RouteItem = {
  element: JSX.Element;
  path: string;
};

const routes: RouteItem[] = [
  {
    path: "/*",
    element: <GardenLayout />,
  },
  {
    path: "/garden",
    element: <GardenLayout />,
  },
];

function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <BrowserRouter>
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
