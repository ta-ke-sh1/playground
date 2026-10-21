import { useState } from "react";
import { Button, Grid, Pagination, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { PlaygroundItem } from "../../../models/playgroundItem.model";
import PlaygroundItemListItem from "./playgroundItemList.item";

const ITEMS_PER_PAGE = 10;

interface PlaygroundItemListProps {
  items: PlaygroundItem[];
}

export default function PlaygroundItemList({ items }: PlaygroundItemListProps) {
  const [pagination, setPagination] = useState({ items, page: 1 });
  const page = pagination.items === items ? pagination.page : 1;
  const pageCount = Math.ceil(items.length / ITEMS_PER_PAGE);

  const visibleItems = items.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <>
      {items.length > 0 && (
        <nav className="playground-pagination" aria-label="Project pagination">
          <Button
            className="playground-pagination-button playground-pagination-previous"
            variant="default"
            size="xs"
            leftSection={<IconChevronLeft size={16} aria-hidden="true" />}
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPagination({ items, page: page - 1 })}
          >
            Previous
          </Button>
          <Pagination
            className="playground-pagination-pages"
            aria-label="Project pages"
            color="orange"
            total={pageCount}
            value={page}
            onChange={(nextPage) => setPagination({ items, page: nextPage })}
            withControls={false}
          />
          <Button
            className="playground-pagination-button playground-pagination-next"
            variant="default"
            size="xs"
            rightSection={<IconChevronRight size={16} aria-hidden="true" />}
            aria-label="Next page"
            disabled={page === pageCount}
            onClick={() => setPagination({ items, page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
      {visibleItems.length > 0 ? (
        <Grid className="playground-item-grid">
          {visibleItems.map((item) => (
            <Grid.Col span={{ base: 12, md: 4 }} key={item.name} mb="lg">
              <PlaygroundItemListItem item={item} />
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Text className="playground-item-empty">
          No projects match these filters.
        </Text>
      )}
      
    </>
  );
}
