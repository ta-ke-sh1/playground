import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Grid,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import CollectionService from "../../services/collection.service.ts";
import type { CollectionItemEntity } from "../../models/entity/collection.model";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { CollectionItemCard } from "../../components/card/collectionItem.card.tsx";
import "./collectionDetails.layout.scss";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "author-asc", label: "Author (A–Z)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

const FIELD_CLASSNAMES = {
  label: "playground-filter-tag-label",
  input: "folio-input",
  section: "folio-section",
};

export default function CollectionDetailsLayout({ id, setSelectedData }: any) {
  const [data, setData] = useState<CollectionItemEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<string | null>("name-asc");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // On mobile the search / sort / tag controls collapse behind a toggle.
  const isMobile = useMediaQuery("(max-width: 48em)", false, {
    getInitialValueInEffect: false,
  });
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
  const showFilters = !isMobile || filtersOpened;

  // Unique tags across all items, with how many items use each one.
  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach((item) => {
      new Set(item.tags ?? []).forEach((tag) => {
        if (!tag) return;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [data]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  };

  const activeFilterCount = (searchQuery.trim() ? 1 : 0) + selectedTags.length;

  const filteredData = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filtered = data.filter((item) => {
      // Tag filter: an item must have ALL selected tags.
      if (selectedTags.length > 0) {
        const itemTags = item.tags ?? [];
        if (!selectedTags.every((tag) => itemTags.includes(tag))) {
          return false;
        }
      }

      const searchableText = [
        item.name,
        item.author,
        item.year,
        ...(item.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return searchableText.includes(normalizedQuery);
    });

    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "author-asc":
          return a.author.localeCompare(b.author);
        case "newest":
          return Date.parse(b.created_at) - Date.parse(a.created_at);
        case "oldest":
          return Date.parse(a.created_at) - Date.parse(b.created_at);
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [data, searchQuery, sortOrder, selectedTags]);

  useEffect(() => {
    async function fetchData() {
      const response =
        await CollectionService.getInstance().getCollectionItemsById(
          Number(id),
        );
      if (response.success) {
        setData((response.data ?? []) as CollectionItemEntity[]);
      } else {
        console.error(response.error);
      }
    }

    (async () => await fetchData())();
  }, [id]);

  const handleReturn = () => {
    setSelectedData(undefined);
  };

  return (
    <Container fluid p={0}>
      <Stack mb={100}>
        <Stack gap={0}>
          <Group
            gap={5}
            onClick={handleReturn}
            style={{
              cursor: "pointer",
            }}
          >
            <IconChevronLeft color="purple" size={16} aria-hidden="true" />
            <Text
              mt="xs"
              mb="xs"
              size="sm"
              variant="transparent"
              color=""
              style={{
                fontFamily: "Libre Baskerville",
                fontStyle: "italic",
                fontWeight: 200,
                fontSize: "clamp(16px, 2vw, 20px)",
                width: "fit-content",
                color: "purple",
              }}
            >
              Back to collections
            </Text>
          </Group>

          {isMobile && (
            <UnstyledButton
              className="collection-filter-toggle"
              mt={8}
              data-opened={filtersOpened}
              aria-expanded={filtersOpened}
              aria-controls="collection-filters"
              onClick={toggleFilters}
            >
              <Group gap="xs" wrap="nowrap">
                <IconSearch size={16} />
                <span>Search & filter</span>
                {activeFilterCount > 0 && (
                  <span className="collection-filter-toggle__count">
                    {activeFilterCount} active
                  </span>
                )}
              </Group>
              <Group gap="xs" wrap="nowrap">
                <span className="collection-filter-toggle__count">
                  {filteredData.length}{" "}
                  {filteredData.length === 1 ? "item" : "items"}
                </span>
                <IconChevronDown
                  size={16}
                  className="collection-filter-toggle__chevron"
                />
              </Group>
            </UnstyledButton>
          )}

          {showFilters && (
            <div id="collection-filters">
              <Group align="end" gap="md" wrap="wrap">
                <TextInput
                  size="sm"
                  aria-label="Search collection items"
                  label="Search items"
                  placeholder="Search name, author, year, or tag"
                  leftSection={<IconSearch size={16} aria-hidden="true" />}
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.currentTarget.value)
                  }
                  classNames={{
                    ...FIELD_CLASSNAMES,
                  }}
                  style={{ flex: "1 1 240px", maxWidth: 350 }}
                />
                <Select
                  aria-label="Order collection items"
                  label="Order by"
                  size="sm"
                  leftSection={<IconArrowsSort size={16} aria-hidden="true" />}
                  data={SORT_OPTIONS}
                  value={sortOrder}
                  onChange={setSortOrder}
                  allowDeselect={false}
                  classNames={{
                    ...FIELD_CLASSNAMES,
                    dropdown: "collection-filter-dropdown",
                    option: "collection-filter-option",
                  }}
                  style={{ flex: "0 1 220px" }}
                />
              </Group>

              {availableTags.length > 0 && (
                <Stack gap={6} mt="md">
                  <Group gap="xs">
                    <Text
                      className="collection-filter-label"
                      style={{
                        fontSize: "10px",
                        fontWeight: 400,
                      }}
                    >
                      Filter by tags
                    </Text>
                  </Group>
                  <div
                    className="collection-tag-list"
                    role="group"
                    aria-label="Filter collection items by tag"
                  >
                    <Group gap="xs">
                      {availableTags.map(({ tag }) => {
                        const isActive = selectedTags.includes(tag);
                        return (
                          <Badge
                            size="lg"
                            color="violet"
                            radius={"sm"}
                            variant="light"
                            key={`tag-filter-${tag}`}
                            className="collection-tag"
                            data-active={isActive}
                            aria-pressed={isActive}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        );
                      })}
                      {selectedTags.length > 0 && (
                        <UnstyledButton
                          className="collection-tag collection-tag--clear"
                          onClick={() => setSelectedTags([])}
                        >
                          <IconX size={14} />
                          Clear ({selectedTags.length})
                        </UnstyledButton>
                      )}
                    </Group>
                  </div>
                </Stack>
              )}
            </div>
          )}

          <Grid className="collection-item-grid" mt="md">
            {filteredData.map((d) => (
              <Grid.Col
                span={{
                  base: 12,
                  xs: 12,
                  sm: 6,
                  md: 6,
                  lg: 4,
                }}
                key={d.id}
              >
                <CollectionItemCard data={d} />
              </Grid.Col>
            ))}
          </Grid>
          {filteredData.length === 0 && (
            <div className="collection-empty-state">
              <Text fw={500}>
                {data.length === 0
                  ? "This collection has no items yet."
                  : "No items match your filters."}
              </Text>
              {(searchQuery || selectedTags.length > 0) && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTags([]);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
