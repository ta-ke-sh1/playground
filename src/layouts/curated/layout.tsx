import { Container, Grid, Stack, Text, Title } from "@mantine/core";
import { IconFlowerFilled } from "@tabler/icons-react";
import { Outlet } from "react-router-dom";
import "./collections.layout.scss";

export default function CuratedLayout() {
  return (
    <Container fluid mt="lg" p="0">
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 2 }}>
          <Title
            style={{
              fontFamily: "Libre Baskerville",
              fontWeight: 200,
              fontSize: "18px",
            }}
          >
            Handpicked websites from across the internet{" "}
          </Title>
          <IconFlowerFilled className="collections-title__flower" stroke={1} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="xs">
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              A curated collection of places, ideas, and experiences worth
              revisiting. Each entry is chosen for the care, creativity, or
              perspective it brings to the web.
            </Text>
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              Explore the calendar to discover thoughtful finds and stories,
              with sources and details included with each entry. Browse at your
              own pace, follow what catches your eye, and save a little
              inspiration for later.
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
              These are sites that do something exceptionally well or leave a
              lasting impression. Some offer a fresh perspective; others make
              everyday interactions feel considered and memorable.
            </Text>
            <Text
              style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}
            >
              Their design, ideas, or experiences make them worth returning to
              and sharing. Together, they celebrate the many ways thoughtful
              work can make the internet more useful, surprising, and human.
            </Text>
          </Stack>
        </Grid.Col>
      </Grid>
      <Outlet />
    </Container>
  );
}