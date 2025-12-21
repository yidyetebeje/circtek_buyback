"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopOverview, DateRange } from "@/hooks/useStats";
import { Package, TrendingUp, ShoppingBag, Banknote } from "lucide-react";

interface ShopStatsOverviewProps {
  shopId: number;
  dateRange?: DateRange;
}

export function PlatformStatsOverview({ shopId, dateRange }: ShopStatsOverviewProps) {
  const { data, isLoading, error } = useShopOverview(shopId, dateRange);

  const completedOrders = useMemo(() => {
    if (!data?.ordersByStatus) return 0;
    return data.ordersByStatus["PAID"] || 0;
  }, [data]);

  const pendingOrders = useMemo(() => {
    if (!data?.ordersByStatus) return 0;
    // Sum pending and arrived orders
    return (data.ordersByStatus["PENDING"] || 0) + (data.ordersByStatus["ARRIVED"] || 0);
  }, [data]);

  const statsItems = [
    {
      title: "Total Orders",
      value: data?.totalOrders,
      icon: ShoppingBag,
      iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      title: "Paid Orders",
      value: completedOrders,
      icon: Package,
      iconColor: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      title: "Active Orders",
      value: pendingOrders,
      icon: TrendingUp,
      iconColor: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
    {
      title: "Total Revenue",
      value: data?.totalFinalValue,
      icon: Banknote,
      iconColor: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      borderColor: "border-purple-200 dark:border-purple-800",
      isCurrency: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-2 border-destructive/20">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load platform statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsItems.map((item, i) => (
        <Card key={i} className={`border-2 ${item.borderColor} transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {item.title}
                </p>
                <h3 className="text-3xl font-bold tracking-tight">
                  {item.isCurrency
                    ? `€${item.value?.toLocaleString() || 0}`
                    : item.value?.toLocaleString() || 0
                  }
                </h3>
              </div>
              <div className={`p-3 rounded-full ${item.iconColor} transition-colors`}>
                <item.icon className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 