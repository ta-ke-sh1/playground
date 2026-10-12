import { Anchor, Grid, Stack, Text } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";

export default function AboutLayout() {
  return (
    <main className="about-page" aria-labelledby="about-page-title">
      <Grid columns={15} mb="xl" mt="lg">
        <Grid.Col span={{ base: 15, md: 3 }} style={{
            width: '100%'
          }}>
            <div style={{
              height: 'clamp(200px, 30vw, 400px)',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
            }}></div>
        </Grid.Col>
        <Grid.Col span={{ base: 15, md: 1 }}>
        </Grid.Col>
        <Grid.Col span={{ base: 15, md: 5 }}>
          <Stack gap="xs">
            <Text c="dimmed" size="xs" tt="uppercase" style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              Story
            </Text>
            <Text style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              I make interactive web experiments to explore visual effects,
              motion, and playful ways to use the browser.
            </Text>
            <Text style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              This playground is where I study projects that catch my curiosity.
              I rebuild ideas to understand how they work, then experiment with
              the techniques and develop variations of my own.
            </Text>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 15, md: 1 }}>
        </Grid.Col>
        <Grid.Col span={{ base: 15, md: 5 }}>
          <Stack gap="xs">
            <Text c="dimmed" size="xs" tt="uppercase" style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              Areas of exploration
            </Text>
            <Text style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              Generative visuals, interaction, animation, and algorithms.
            </Text>
            <Anchor
              className="about-page__link"
              href="https://trung-ha-26.vercel.app/"
              target="_blank"
              rel="noreferrer"
              fw={500}
            >
              Portfolio
              <IconArrowUpRight
                className="about-page__link-icon"
                size={15}
                aria-hidden="true"
              />
            </Anchor>

            <Text mt="xl" c="dimmed" size="xs" tt="uppercase" style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              Links
            </Text>
            <Text style={{
                letterSpacing: "-1px",
                fontSize: "clamp(10px, 2vw, 14px)",
              }}>
              Feel free to connect.
            </Text>
            <Anchor
              className="about-page__link"
              href="https://github.com/trung-ha-26"
              target="_blank"
              rel="noreferrer"
              fw={500}
            >
              GitHub
              <IconArrowUpRight
                className="about-page__link-icon"
                size={15}
                aria-hidden="true"
              />
            </Anchor>
            <Anchor
              className="about-page__link"
              href="https://www.instagram.com/trung.ha/"
              target="_blank"
              rel="noreferrer"
              fw={500}
            >
              Instagram
              <IconArrowUpRight
                className="about-page__link-icon"
                size={15}
                aria-hidden="true"
              />
            </Anchor>
            <Anchor
              className="about-page__link"
              href="https://www.facebook.com/ed.1698"
              target="_blank"
              rel="noreferrer"
              fw={500}
            >
              Facebook
              <IconArrowUpRight
                className="about-page__link-icon"
                size={15}
                aria-hidden="true"
              />
            </Anchor>

          </Stack>
        </Grid.Col>
      </Grid>
    </main>
  );
}