"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { DateRange, useDateRangeFilter } from "@/hooks/useStats";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange as CalendarDateRange } from "react-day-picker";

interface DateRangeFilterProps {
  onDateRangeChange: (dateRange: DateRange) => void;
}

export function DateRangeFilter({ onDateRangeChange }: DateRangeFilterProps) {
  const { dateRange, setDateRange } = useDateRangeFilter();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetClick = (days: number) => {
    // Create dates directly here instead of depending on state updates
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const past = new Date();
    past.setDate(past.getDate() - days);
    past.setHours(0, 0, 0, 0);

    const newDateRange = {
      dateFrom: past.toISOString(),
      dateTo: now.toISOString(),
    };

    // Update the internal state
    setDateRange(newDateRange);

    // Immediately call onDateRangeChange with the new values
    onDateRangeChange(newDateRange);
  };

  // Set default 30-day range on component mount
  useEffect(() => {
    if (!dateRange.dateFrom && !dateRange.dateTo) {
      handlePresetClick(30);
    }
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return format(new Date(dateString), "MMM dd");
  };

  const hasDateRange = !!(dateRange.dateFrom && dateRange.dateTo);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-background rounded-lg border">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Filter by date:</h3>
        {hasDateRange && (
          <span className="text-sm text-foreground hidden md:inline">
            {formatDate(dateRange.dateFrom)} - {formatDate(dateRange.dateTo)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePresetClick(7)}
          className="h-8 px-3 text-xs"
        >
          7d
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePresetClick(30)}
          className="h-8 px-3 text-xs"
        >
          30d
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePresetClick(90)}
          className="h-8 px-3 text-xs"
        >
          90d
        </Button>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-3 text-xs",
                hasDateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              <span className="hidden md:inline">
                {hasDateRange ? (
                  `${formatDate(dateRange.dateFrom)} - ${formatDate(dateRange.dateTo)}`
                ) : (
                  "Custom"
                )}
              </span>
              <span className="md:hidden">Custom</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.dateFrom ? new Date(dateRange.dateFrom) : undefined,
                to: dateRange.dateTo ? new Date(dateRange.dateTo) : undefined,
              }}
              onSelect={(range: CalendarDateRange | undefined) => {
                if (!range) {
                  setDateRange({
                    dateFrom: undefined,
                    dateTo: undefined,
                  });
                  return;
                }

                const newDateRange: DateRange = {};

                if (range.from) {
                  // Set start date to beginning of day (00:00:00)
                  const fromDate = new Date(range.from);
                  fromDate.setHours(0, 0, 0, 0);
                  newDateRange.dateFrom = fromDate.toISOString();
                }

                if (range.to) {
                  // Set end date to end of day (23:59:59.999)
                  const toDate = new Date(range.to);
                  toDate.setHours(23, 59, 59, 999);
                  newDateRange.dateTo = toDate.toISOString();
                }

                setDateRange(newDateRange);

                if (range.from && range.to) {
                  onDateRangeChange(newDateRange);
                  setIsCalendarOpen(false);
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {hasDateRange && (
        <div className="text-xs text-muted-foreground md:hidden">
          {formatDate(dateRange.dateFrom)} - {formatDate(dateRange.dateTo)}
        </div>
      )}
    </div>
  );
} 