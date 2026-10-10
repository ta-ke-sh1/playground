import {
  Group,
  Stack,
  Text,
  Container,
  Button,
  Divider,
  Grid,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconFlowerFilled,
} from "@tabler/icons-react";
import Calendar from "./calendar/calendar";
import CollectionService from "../../services/collection.service";
import type { CollectionEntity } from "../../models/entity/collection.model.tsx";
import "./collections.layout.scss";
import CollectionDetailsLayout from "./collectionDetails.layout.tsx";

/** Helper function to format a Date object or month/year pair into "JUL. 2026" format */
function formatMonthYear(year: number, monthIndex: number): string {
  const date = new Date(year, monthIndex, 1);
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);

  return formatted.toUpperCase().replace(/^([A-Z]{3})\b/, "$1.");
}

export default function CollectionsLayout() {
  const now = new Date();

  // Track both month and year so calendar controls wrap correctly (e.g. Dec -> Jan)
  const [currentDate, setCurrentDate] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const [data, setData] = useState<CollectionEntity[]>([]);

  const [selectedData, setSelectedData] = useState<any>(undefined);

  useEffect(() => {
    async function fetchCollections(): Promise<void> {
      try {
        const response =
          await CollectionService.getInstance().getCollectionsByMonthAndYear(
            currentDate.year,
            currentDate.month,
          );

        if (response.error) {
          console.error(response.error);
        } else if (response.data) {
          setData(response.data as CollectionEntity[]);
        }
      } catch (e) {
        console.error(e);
      }
    }

    (async () => await fetchCollections())();
  }, [currentDate.month, currentDate.year]);

  // Handlers to increment/decrement the active month
  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev.year, prev.month - 1, 1);
      return {
        month: newDate.getMonth(),
        year: newDate.getFullYear(),
      };
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev.year, prev.month + 1, 1);
      return {
        month: newDate.getMonth(),
        year: newDate.getFullYear(),
      };
    });
  };

  // Derive previous and next month strings dynamically
  const currentLabel = formatMonthYear(currentDate.year, currentDate.month);
  const prevLabel = formatMonthYear(currentDate.year, currentDate.month - 1);
  const nextLabel = formatMonthYear(currentDate.year, currentDate.month + 1);

  return selectedData ? (
    <CollectionDetailsLayout
      id={selectedData}
      setSelectedData={setSelectedData}
    />
  ) : (
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
      <Group
        mt="sm"
        mb="lg"
        style={{
          width: "50%",
        }}
      >
        <Text
          style={{
            textTransform: "uppercase",
          }}
        ></Text>
      </Group>
      <Stack mb={50} gap="xs">
        <Group gap={0} justify="space-between">
          <Button
            variant="default"
            size="xs"
            leftSection={<IconChevronLeft size={16} aria-hidden="true" />}
            onClick={handlePrevMonth}
          >
            {prevLabel}
          </Button>

          <Text
            aria-live="polite"
            style={{
              fontFamily: "Libre Baskerville",
              fontStyle: "italic",
              fontWeight: 200,
              fontSize: "clamp(10px, 4dvw, 42px)",
            }}
          >
            {currentLabel} ({data.length})
          </Text>

          <Button
            variant="default"
            size="xs"
            rightSection={<IconChevronRight size={16} aria-hidden="true" />}
            onClick={handleNextMonth}
          >
            {nextLabel}
          </Button>
        </Group>

        <Divider
          style={{
            marginBottom: "clamp(0, 5dvh, 12px)",
          }}
        />

        <Calendar
          setSelectedData={setSelectedData}
          data={data}
          year={currentDate.year}
          month={currentDate.month}
        />
      </Stack>
    </Container>
  );
}
