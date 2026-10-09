import { Grid } from "@mantine/core";
import type { PlaygroundItem } from "../../../models/playgroundItem.model";
import PlaygroundItemListItem from "./playgroundItemList.item";

interface PlaygroundItemListProps {
  items: PlaygroundItem[];
}

export default function PlaygroundItemList({ items }: PlaygroundItemListProps) {
  return (
    <Grid>
      {items.map((item: PlaygroundItem, index: number) => (
        <Grid.Col
          span={{
            base: 12,
            md: 6,
            lg: 4,
          }}
          key={`item-${item.name}-${index}`}
        >
          <PlaygroundItemListItem item={item} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
