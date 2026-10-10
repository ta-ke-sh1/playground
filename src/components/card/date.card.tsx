import { useEffect, useState, useMemo, useCallback } from "react";
import { Group, Text, Stack, UnstyledButton } from "@mantine/core";
import { IconTerminal, IconArrowUpRight } from "@tabler/icons-react";
import { getRandomNumber } from "../../services/utils.service";

interface DateCardProps {
  data?: any;
  setSelectedData: any;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const EMPTY_ITEMS: any[] = [];

export function DateCard({ data, setSelectedData }: DateCardProps) {
  const hasData = Boolean(data?.data);
  const cardData = data?.data;
  const collectionId = cardData?.id;
  const items = cardData?.collection_items ?? EMPTY_ITEMS;
  const itemCount = items.length;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPreloaded, setIsPreloaded] = useState(false);

  function handleNavigate() {
    if (hasData) {
      setSelectedData(cardData.id);
    }
  }

  const getImageUrl = useCallback(
    (item: any) => {
      if (!item) return "";
      if (item.image_url) return item.image_url;

      if (item.name && collectionId) {
        const encodedName = encodeURIComponent(item.name);
        return `${supabaseUrl}/storage/v1/object/public/collection_items/collection-${collectionId}-${encodedName}.jpg`;
      }
      return "";
    },
    [collectionId],
  );

  // Generate array of all image URLs for preloading
  const imageUrls = useMemo(() => {
    return items.map((item: any) => getImageUrl(item)).filter(Boolean);
  }, [items, getImageUrl]);

  // Preload all images into browser cache
  useEffect(() => {
    if (!imageUrls.length) return;

    let isMounted = true;

    const loadPromises = imageUrls.map((url: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Resolve anyway so broken images don't block the rest
      });
    });

    Promise.all(loadPromises).then(() => {
      if (isMounted) {
        setIsPreloaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [imageUrls]);

  // Cycle through collection items only after preloading finishes
  useEffect(() => {
    if (itemCount <= 1 || !isPreloaded) return;

    const interval = setInterval(
      () => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % itemCount);
      },
      getRandomNumber(50, 70) * 10,
    );

    return () => clearInterval(interval);
  }, [itemCount, isPreloaded]);

  const currentItem = items[currentImageIndex];
  const bgImageUrl = getImageUrl(currentItem);

  return (
    <UnstyledButton
      type="button"
      className="collection-date-card"
      data-has-data={hasData}
      data-cursor={hasData ? "pointer" : "default"}
      disabled={!hasData}
      aria-label={
        hasData
          ? `${data?.value}: ${cardData.name}, ${itemCount} ${
              itemCount === 1 ? "item" : "items"
            }`
          : `${data?.value}: no collection`
      }
      onClick={handleNavigate}
      style={{
        backgroundImage: bgImageUrl
          ? `linear-gradient(180deg, rgba(24, 25, 28, 0.28) 0%, rgba(24, 25, 28, 0.12) 38%, rgba(24, 25, 28, 0.72) 100%), url("${bgImageUrl}")`
          : "none",
      }}
    >
      <Stack
        className="collection-date-card__content"
        gap={6}
        justify="space-between"
      >
        <Group
          className="collection-date-card__meta"
          justify="space-between"
          align="center"
        >
          <Group className="collection-date-card__badge" gap={6}>
            <IconTerminal size={13} aria-hidden="true" />
            <Text fz="10px" fw={700}>
              {hasData ? cardData.name : "NO COLLECTION"}
            </Text>
          </Group>

          {hasData && (
            <Group className="collection-date-card__count">
              <Text fz="10px" fw={700}>
                {itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}
              </Text>
            </Group>
          )}
        </Group>

        <Group
          className="collection-date-card__footer"
          justify="space-between"
          align="center"
        >
          <Text
            className="collection-date-card__day"
            fw={200}
            fz="lg"
            style={{
              fontStyle: "italic",
            }}
          >
            {data?.value}
          </Text>

          {hasData && (
            <span className="collection-date-card__link" aria-hidden="true">
              <IconArrowUpRight size={18} />
            </span>
          )}
        </Group>
      </Stack>
    </UnstyledButton>
  );
}
