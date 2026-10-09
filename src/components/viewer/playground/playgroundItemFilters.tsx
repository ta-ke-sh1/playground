import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import type { PlaygroundItem } from "../../../models/playgroundItem.model";
import Dither from "../../backgrounds/dither";

export interface PlaygroundItemFilters {
  tags: string[];
  category: string | null;
  name: string;
  startDate: string;
  endDate: string;
}

interface PlaygroundItemFiltersProps {
  items: PlaygroundItem[];
  value: PlaygroundItemFilters;
  onChange: (filters: PlaygroundItemFilters) => void;
  resultCount: number;
  totalCount: number;
}

interface PlaygroundItemFilterSummaryProps {
  filters: PlaygroundItemFilters;
}

function PlaygroundItemFilterSummary({
  filters,
}: PlaygroundItemFilterSummaryProps) {
  const selectedFilters = [
    ...filters.tags.map((tag) => ({ label: `tag: ${tag}`, color: "blue" })),
    filters.category
      ? { label: `category: ${filters.category}`, color: "green" }
      : null,
    filters.name.trim()
      ? { label: `name: ${filters.name.trim()}`, color: "orange" }
      : null,
    filters.startDate || filters.endDate
      ? {
          label: `date: ${filters.startDate || "Any"} – ${filters.endDate || "Any"}`,
          color: "grape",
        }
      : null,
  ].filter(
    (filter): filter is { label: string; color: string } => filter !== null,
  );

  return (
    <Group className="playground-filter-summary" gap="xs" ml="12">
      <Text size="sm" c="dimmed">
        Filtering by:
      </Text>
      {selectedFilters.length > 0 ? (
        selectedFilters.map((filter) => (
          <Badge key={filter.label} color={filter.color} variant="light">
            {filter.label}
          </Badge>
        ))
      ) : (
        <Text size="sm" c="dimmed">
          All projects
        </Text>
      )}
    </Group>
  );
}

export default function PlaygroundItemFiltersPanel({
  items,
  value,
  onChange,
  resultCount,
  totalCount,
}: PlaygroundItemFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMdUp, setIsMdUp] = useState(true);
  const theme = useMantineTheme();

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${theme.breakpoints.md})`,
    );
    const updateBreakpoint = () => setIsMdUp(mediaQuery.matches);

    updateBreakpoint();
    mediaQuery.addEventListener("change", updateBreakpoint);
    return () => mediaQuery.removeEventListener("change", updateBreakpoint);
  }, [theme.breakpoints.md]);

  const categories = [
    ...new Set(items.map((item) => item.category).filter(Boolean)),
  ].sort();
  const tags = [
    ...new Set(items.flatMap((item) => item.tags).filter(Boolean)),
  ].sort();
  const hasActiveFilters =
    value.tags.length > 0 ||
    value.category !== null ||
    value.name !== "" ||
    value.startDate !== "" ||
    value.endDate !== "";

  return (
    <Stack className="playground-filter-panel" gap={0} mb={isMdUp ? "12px" : 0}>
      <Group
        align="flex-end"
        gap={5}
        style={{
          position: "absolute",
          left: 22,
          top: "95px",
          zIndex: 2,
        }}
      >
        <Title
          style={{
            fontFamily: "Libre Baskerville, serif",
            fontStyle: "italic",
            fontSize: "32px",
            fontWeight: "200",
            color: "white",
          }}
        >
          Playground
        </Title>
        <Title
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "14px",
            fontWeight: "200",
            transform: "translateY(-6px)",
            color: "white",
          }}
        >
          (by trung.ha)
        </Title>
      </Group>

      <Dither
        waveColor={[0.5, 0.5, 0]}
        disableAnimation={false}
        enableMouseInteraction={true}
        mouseRadius={1.5}
        colorNum={4}
        waveAmplitude={0.4}
        waveFrequency={12}
        waveSpeed={0.01}
        backgroundColor={[255, 0, 0]}
      />
      <Group
        className="playground-filter-scroll"
        data-md-up={isMdUp}
        style={{
          padding: "12px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {!isMdUp && (
          <Group
            className="playground-filter-mobile-summary"
            gap="xs"
            justify="space-between"
          >
            <Group gap="xs">
              <Badge className="playground-filter-count" circle>
                {resultCount}
              </Badge>
              <span className="playground-filter-mobile-label">Projects</span>
            </Group>
            <Button
              className="playground-filter-mobile-toggle"
              variant="default"
              aria-expanded={mobileFiltersOpen}
              aria-controls="playground-filter-controls"
              onClick={() => setMobileFiltersOpen((open) => !open)}
            >
              Filters{" "}
              <span aria-hidden="true">{mobileFiltersOpen ? "−" : "+"}</span>
            </Button>
          </Group>
        )}
        <Collapse
          expanded={mobileFiltersOpen || isMdUp}
          className="playground-filter-collapse"
        >
          <Group
            id="playground-filter-controls"
            className="playground-filter-bar"
            gap={6}
          >
            <MultiSelect
              className="playground-filter-control playground-filter-tags"
              placeholder="Tags"
              data={tags}
              value={value.tags}
              onChange={(selectedTags) =>
                onChange({ ...value, tags: selectedTags })
              }
              searchable
              clearable
              aria-label="Tags"
              comboboxProps={{ withinPortal: true, shadow: "md" }}
            />
            <Select
              className="playground-filter-control playground-filter-category"
              placeholder="Category"
              data={categories}
              value={value.category}
              onChange={(category) => onChange({ ...value, category })}
              searchable
              clearable
              aria-label="Category"
              comboboxProps={{ withinPortal: true, shadow: "md" }}
            />
            <TextInput
              className="playground-filter-control playground-filter-name"
              placeholder="Name"
              value={value.name}
              onChange={(event) =>
                onChange({ ...value, name: event.currentTarget.value })
              }
              aria-label="Name"
            />
            <DatePickerInput
              className="playground-filter-control playground-filter-date"
              type="range"
              placeholder="From date – To date"
              value={[value.startDate || null, value.endDate || null]}
              onChange={([startDate, endDate]) =>
                onChange({
                  ...value,
                  startDate: startDate ?? "",
                  endDate: endDate ?? "",
                })
              }
              clearable
              aria-label="From date to To date"
              valueFormat="MMM D, YYYY"
              popoverProps={{ withinPortal: true, shadow: "md" }}
            />
            <div className="playground-filter-spacer" />
            {hasActiveFilters && (
              <>
                <Badge className="playground-filter-count" circle>
                  {resultCount}
                </Badge>
                <Button
                  className="playground-filter-reset"
                  variant="default"
                  onClick={() =>
                    onChange({
                      tags: [],
                      category: null,
                      name: "",
                      startDate: "",
                      endDate: "",
                    })
                  }
                >
                  Reset filters <span aria-hidden="true">↶</span>
                </Button>
              </>
            )}
          </Group>
        </Collapse>
      </Group>
      <Group justify="space-between">
        {isMdUp && <PlaygroundItemFilterSummary filters={value} />}
      </Group>
    </Stack>
  );
}
