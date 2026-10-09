import { Group, Title } from "@mantine/core";

export default function NavigationBar() {
  return (
    <Group
      justify="space-between"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100dvw",
        zIndex: 1000,
        padding: "25px clamp(20px, 1.5dvw, 32px)",
        height: '60px',
      }}
    >
      
    </Group>
  );
}
