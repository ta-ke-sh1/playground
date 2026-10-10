import { Group, Stack, Text, Container, Button, Divider } from "@mantine/core";
import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
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
    <Container fluid mt="sm" p="0">
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
        >
          A curated collection of places, ideas, and experiences worth
          revisiting. Explore the calendar to discover thoughtful finds and
          stories, with sources and details included with each entry.
        </Text>
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
