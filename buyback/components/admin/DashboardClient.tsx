'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { displayConfigAtom } from '@/store/atoms';
import { useSession } from 'next-auth/react';

import { DateRange } from '@/hooks/useStats';
import { PlatformStatsOverview } from './dashboard/PlatformStatsOverview';
import { OrderStatusChart } from './dashboard/OrderStatusChart';
import { TopDevicesChart } from './dashboard/TopDevicesChart';
import { CatalogStatsOverview } from './dashboard/CatalogStatsOverview';
import { ModelsPerCategoryChart } from './dashboard/ModelsPerCategoryChart';
import { ModelsPerBrandChart } from './dashboard/ModelsPerBrandChart';
import { OrderProgressChart } from './dashboard/OrderProgressChart';
import { DateRangeFilter } from './dashboard/DateRangeFilter';

interface DashboardClientProps {
  shopId: number;
}

export function DashboardClient({ shopId }: DashboardClientProps) {
  const { data: session } = useSession();
  const config = useAtomValue(displayConfigAtom);
  const [dateRange, setDateRange] = useState<DateRange>({});

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading session information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* Placeholder if we want a title here, but AdminHeader usually handles it */}
        </div>
        <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
      </div>

      <PlatformStatsOverview shopId={shopId} dateRange={dateRange} />

      {dateRange.dateFrom && dateRange.dateTo && (
        <OrderProgressChart
          shopId={shopId}
          dateFrom={dateRange.dateFrom}
          dateTo={dateRange.dateTo}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <OrderStatusChart shopId={shopId} dateRange={dateRange} />
        </div>
        <div className="space-y-6">
          <TopDevicesChart shopId={shopId} dateRange={dateRange} limit={5} />
        </div>
      </div>

      <CatalogStatsOverview shopId={shopId} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ModelsPerCategoryChart shopId={shopId} limit={8} />
        </div>
        <div className="space-y-6">
          <ModelsPerBrandChart shopId={shopId} limit={6} />
        </div>
      </div>
    </div>
  );
} 