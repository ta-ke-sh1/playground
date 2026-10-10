import { Grid, Stack } from "@mantine/core";
import { type JSX } from "react";
import { DateCard } from "../../../components/card/date.card";
import { type CollectionEntity } from "../../../models/entity/collection.model";

interface CalendarProps {
  data: CollectionEntity[];
  year: number;
  month: number;
  setSelectedData: any;
}

interface CalendarDay {
  value: string;
  date: string; // Format: YYYY-MM-DD (or empty string for padding days)
}

export default function Calendar({
  data,
  year,
  month,
  setSelectedData,
}: CalendarProps): JSX.Element {
  // Index of the first day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeekIndex = new Date(year, month, 1).getDay();

  // Total number of days in the current month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

  // Helper to format date as YYYY-MM-DD
  const formatDateString = (y: number, m: number, d: number): string => {
    const formattedMonth = String(m + 1).padStart(2, "0");
    const formattedDay = String(d).padStart(2, "0");
    return `${y}-${formattedMonth}-${formattedDay}`;
  };

  const datamap: CalendarDay[] = Array(dayOfWeekIndex + daysInCurrentMonth)
    .fill(null)
    .map((_, index) => {
      // Offset for padding empty slots before the 1st day of the month
      const dayNumber = index - dayOfWeekIndex + 1;

      if (dayNumber <= 0) {
        // Leading padding days from the previous month slot
        return {
          value: "",
          date: "",
        };
      }
      const dateStr = formatDateString(year, month, dayNumber);
      const matching = data.find((d) => d.date.startsWith(dateStr));

      return {
        value: String(dayNumber),
        date: dateStr,
        data: matching || undefined,
      };
    });

  return (
    <Stack m={0}>
      <Grid columns={7} gap={0}>
        {datamap.map((data, index: number) => {
          return (
            <Grid.Col
              key={`calendar-card-${index}`}
              span={{ base: 7, sm: 3.5, lg: 1 }}
              mb={data.date ? "sm" : 0}
              p={data.date ? "5" : 0}
            >
              {index > dayOfWeekIndex - 1 && (
                <DateCard setSelectedData={setSelectedData} data={data} />
              )}
            </Grid.Col>
          );
        })}
      </Grid>
    </Stack>
  );
}
