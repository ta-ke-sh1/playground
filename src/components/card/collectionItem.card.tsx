import { Badge, Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { CollectionItemEntity } from "../../models/entity/collection.model";

interface CollectionItemCardProps {
  data: CollectionItemEntity;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";

export function CollectionItemCard({ data }: CollectionItemCardProps) {
  const imageUrl = `${supabaseUrl}/storage/v1/object/public/collection_items/collection-${data.collection_id}-${encodeURIComponent(data.name)}.jpg`;

  return (
    <Card className="collection-item-card" p="sm">
      <UnstyledButton
        className="collection-item-card__image"
        component="a"
        href={data.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${data.name}${data.author ? ` by ${data.author}` : ""}`}
        style={{ backgroundImage: `url("${imageUrl}")` }}
      >
        <span
          className="collection-item-card__image-overlay"
          aria-hidden="true"
        />
        <span className="collection-item-card__open" aria-hidden="true">
          <IconArrowUpRight size={20} />
        </span>
      </UnstyledButton>

      <Stack className="collection-item-card__details" gap="5" mt="sm">
        <Group justify="space-between" align="flex-start" gap="xs">
          <Text
            fw={500}
            style={{
              fontStyle: "italic",
              fontFamily: "Libre Baskerville, serif",
              fontSize: "clamp(16px, 2vw, 20px)",
              textAlign: "center",
            }}
          >
            {data.name}
          </Text>
          {data.year && <Text size="xs">{data.year}</Text>}
        </Group>
        {data.author && <Text size="sm">{data.author}</Text>}
        {data.tags?.length > 0 && (
          <Group className="collection-item-card__tags" gap={6}>
            {data.tags.filter(Boolean).map((tag, index) => (
              <Badge
                size="md"
                key={`${data.id}-${tag}-${index}`}
                variant="light"
                color="violet"
                radius="sm"
              >
                {tag}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
