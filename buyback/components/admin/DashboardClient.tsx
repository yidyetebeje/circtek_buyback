'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { displayConfigAtom } from '@/store/atoms';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DateRange } from '@/hooks/useStats';
import { PlatformStatsOverview } from './dashboard/PlatformStatsOverview';
import { OrderStatusChart } from './dashboard/OrderStatusChart';
import { TopDevicesChart } from './dashboard/TopDevicesChart';
import { CatalogStatsOverview } from './dashboard/CatalogStatsOverview';
import { QuickOpsNumbers } from './dashboard/QuickOpsNumbers';
import { ModelsPerCategoryChart } from './dashboard/ModelsPerCategoryChart';
import { ModelsPerBrandChart } from './dashboard/ModelsPerBrandChart';
import { OrderProgressChart } from './dashboard/OrderProgressChart';
import { DateRangeFilter } from './dashboard/DateRangeFilter';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Package, ShoppingCart, Warehouse } from 'lucide-react';

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

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session information...</p>
        </div>
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Desktop Header Section */}
      

      {/* Date Range Filter */}
      <div className="w-full">
        <DateRangeFilter onDateRangeChange={handleDateRangeChange} />
      </div>

      {/* Key Performance Metrics Section */}
      <section className="space-y-6">
        <SectionHeader 
          icon={BarChart3} 
          title="Key Performance Metrics" 
          description="Your most important business metrics at a glance"
        />
        <PlatformStatsOverview shopId={shopId} dateRange={dateRange} />
      </section>

      <Separator className="my-8" />

      {/* Order Analytics Section */}
      <section className="space-y-6">
        <SectionHeader 
          icon={ShoppingCart} 
          title="Order Analytics" 
          description="Detailed insights into your order performance and trends"
        />
        
        {/* Order Progress Time Series Chart */}
        {dateRange.dateFrom && dateRange.dateTo && (
          <div className="w-full">
            <OrderProgressChart 
              shopId={shopId} 
              dateFrom={dateRange.dateFrom} 
              dateTo={dateRange.dateTo}
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrderStatusChart shopId={shopId} dateRange={dateRange} />
          </div>
          <div className="lg:col-span-1">
            <TopDevicesChart shopId={shopId} dateRange={dateRange} limit={5} />
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Catalog & Inventory Section */}
      <section className="space-y-6">
        <SectionHeader 
          icon={Package} 
          title="Catalog & Inventory" 
          description="Overview of your product catalog and inventory distribution"
        />
        
        {/* Catalog Stats Overview */}
        <div>
          <h3 className="text-lg font-medium mb-4">Catalog Overview</h3>
          <CatalogStatsOverview shopId={shopId} />
        </div>

        {/* Catalog Distribution Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ModelsPerCategoryChart shopId={shopId} limit={8} />
          <ModelsPerBrandChart shopId={shopId} limit={6} />
        </div>
      </section>

      <Separator className="my-8" />

      {/* Operations Overview Section */}
      <section className="space-y-6">
        <SectionHeader 
          icon={Warehouse} 
          title="Operations Overview" 
          description="Quick operational metrics and current status"
        />
        <QuickOpsNumbers shopId={shopId} />
      </section>
    </div>
  );
} 