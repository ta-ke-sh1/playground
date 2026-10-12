import { useEffect, useState } from "react";
import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { PlaygroundItem } from "../../../models/playgroundItem.model";
import { Link } from "react-router-dom";

interface PlaygroundItemListItemProps {
  item: PlaygroundItem;
}

export default function PlaygroundItemListItem({ item }: PlaygroundItemListItemProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPreviewActive = isHovered || isFocused;

  useEffect(() => {
    if (!isPreviewActive || item.images.length < 2) return;

    const intervalId = window.setInterval(() => {
      setImageIndex((currentIndex) => (currentIndex + 1) % item.images.length);
    }, 400);

    return () => window.clearInterval(intervalId);
  }, [isPreviewActive, item.images]);

  return (
    <Card className="playground-item-card" p={0} radius={0}>
      {item.images.length > 0 && (
        <div className="playground-item-image">
          <Link
            className="playground-item-image-link"
            to={`/playground${item.url}`}
            aria-label={`Open ${item.name}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              if (!isFocused) setImageIndex(0);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              if (!isHovered) setImageIndex(0);
            }}
          >
            <img
              src={item.images[imageIndex]}
              alt=""
              loading="lazy"
            />
            <span className="playground-item-tags" aria-hidden="true">
              {item.tags.filter(Boolean).map((tag, index) => (
                <Badge
                  className="playground-item-tag"
                  key={`${tag}-${index}`}
                  radius={3}
                >
                  {tag}
                </Badge>
              ))}
            </span>
            <IconArrowUpRight
              className="playground-item-arrow"
              size={20}
              aria-hidden="true"
            />
          </Link>
        </div>
      )}
      <Stack className="playground-item-content" gap={5}>
        <Text component="h2" className="playground-item-title">
          {item.name}
        </Text>
        <Text className="playground-item-description" lineClamp={2}>
          {item.description}
        </Text>
        <Group className="playground-item-details" gap="xs" justify="space-between">
          <Text className="playground-item-category">
            {item.category}
          </Text>
          <Text className="playground-item-date">
            {item.date}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
