import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
  useMantineTheme,
  Grid,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar, IconCategory, IconSearch } from "@tabler/icons-react";
import type { PlaygroundItem } from "../../../models/playgroundItem.model";

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

export default function PlaygroundItemFiltersPanel({
  items,
  value,
  onChange,
  resultCount,
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
  const tags = Array.from(
    items.reduce((counts, item) => {
      new Set(item.tags.filter(Boolean)).forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
      return counts;
    }, new Map<string, number>()),
  )
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  const toggleTag = (tag: string) => {
    const selectedTags = value.tags.includes(tag)
      ? value.tags.filter((selectedTag) => selectedTag !== tag)
      : [...value.tags, tag];
    onChange({ ...value, tags: selectedTags });
  };

  return (
    <Stack className="playground-filter-panel" gap={0} mb={isMdUp ? "12px" : 0}>
      <Group
        className="playground-filter-scroll"
        data-md-up={isMdUp}
        style={{
          padding: "12px",
          position: "relative",
          zIndex: 1,
        }}
        mt="sm"
        p="0"
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
          style={{
            width: "100%",
          }}
        >
          <Group
            style={{
              width: "100%",
            }}
            gap={6}
          >
            <Grid
              style={{
                width: "100%",
              }}
            >
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <Select
                  label="Category"
                  classNames={{ label: "playground-filter-tag-label" }}
                  placeholder="Category"
                  leftSection={<IconCategory size={16} aria-hidden="true" />}
                  data={categories}
                  value={value.category}
                  onChange={(category) => onChange({ ...value, category })}
                  searchable
                  clearable
                  aria-label="Category"
                  comboboxProps={{ withinPortal: true, shadow: "md" }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <TextInput
                  label="Name"
                  classNames={{ label: "playground-filter-tag-label" }}
                  placeholder="Name"
                  leftSection={<IconSearch size={16} aria-hidden="true" />}
                  value={value.name}
                  onChange={(event) =>
                    onChange({ ...value, name: event.currentTarget.value })
                  }
                  aria-label="Name"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                <DatePickerInput
                  label="Date range"
                  classNames={{ label: "playground-filter-tag-label" }}
                  type="range"
                  placeholder="From date – To date"
                  leftSection={<IconCalendar size={16} aria-hidden="true" />}
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
              </Grid.Col>
            </Grid>
          </Group>
          {tags.length > 0 && (
            <Stack gap={6} mt="sm">
              <Text className="playground-filter-tag-label">
                Filter by tags
              </Text>
              <div
                className="playground-filter-tag-list"
                role="group"
                aria-label="Filter playground items by tag"
              >
                <Group gap="xs">
                  {tags.map(({ tag }) => {
                    const isActive = value.tags.includes(tag);
                    return (
                      <Badge
                        size="lg"
                        radius="sm"
                        key={`playground-tag-${tag}`}
                        color="orange"
                        variant="light"
                        data-active={isActive}
                        aria-pressed={isActive}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                  {value.tags.length > 0 && (
                    <Button
                      color="red"
                      variant="light"
                      size="xs"
                      onClick={() => onChange({ ...value, tags: [] })}
                    >
                      Clear ({value.tags.length})
                    </Button>
                  )}
                </Group>
              </div>
            </Stack>
          )}
          {!isMdUp && <Divider mt="md" mb="md" />}
        </Collapse>
      </Group>
    </Stack>
  );
}
