import { useEffect, useState } from "react";
import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import type { PlaygroundItem } from "../../../models/playgroundItem.model";
import { useNavigate } from "react-router-dom";

const IMAGE_ROTATION_INTERVAL_MS = 800;

interface PlaygroundItemListItemProps {
  item: PlaygroundItem;
}

export default function PlaygroundItemListItem({
  item,
}: PlaygroundItemListItemProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (item.images.length < 2) return;

    const intervalId = window.setInterval(() => {
      setImageIndex((currentIndex) => (currentIndex + 1) % item.images.length);
    }, IMAGE_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [item.images]);

  return (
    <Card className="playground-item-card" p="sm">
      {item.images.length > 0 && (
        <div className="playground-item-image">
          <img
            src={item.images[imageIndex % item.images.length]}
            alt={item.name}
            loading="lazy"
            onClick={() => navigate(item.url)}
            style={{
              display: "block",
              width: "100%",
              height: "clamp(260px, 33vh, 420px)",
              objectFit: "cover",
              borderRadius: 5,
              cursor: "pointer",
            }}
          />
          <svg
            className="playground-item-arrow icon icon-tabler icons-tabler-outline icon-tabler-arrow-up-right"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M17 7l-10 10" />
            <path d="M8 7l9 0l0 9" />
          </svg>
        </div>
      )}
      <Stack gap="5" mt="sm">
        <Text
          style={{
            fontFamily: "Libre Baskerville",
            fontStyle: "italic",
            fontWeight: 200,
          }}
          size="lg"
        >
          {item.name}
        </Text>
        <Group gap="xs" justify="space-between">
          <Text size="sm" c="dimmed">
            {item.category}
          </Text>
          <Text size="sm" c="dimmed">
            {item.date}
          </Text>
        </Group>
        {item.tags.length > 0 && (
          <Group gap="xs">
            {item.tags.filter(Boolean).map((tag, index) => (
              <Badge
                bdrs="sm"
                color="red"
                variant="outline"
                key={`${tag}-${index}`}
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
