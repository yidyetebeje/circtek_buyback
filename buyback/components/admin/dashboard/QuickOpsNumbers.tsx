"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopCatalogOverview } from "@/hooks/useStats";
import { Warehouse, Clock3, CheckCircle2 } from "lucide-react";
import * as React from "react";

interface QuickOpsNumbersProps {
  shopId: number;
}

export function QuickOpsNumbers({ shopId }: QuickOpsNumbersProps) {
  const { data, isLoading, error } = useShopCatalogOverview(shopId);

  const statsItems = [
    {
      label: "Stock Devices",
      value: data?.stockDevices || 0,
      icon: Warehouse,
      iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800",
      description: "Devices in inventory"
    },
    {
      label: "Open Orders",
      value: data?.openOrders || 0,
      icon: Clock3,
      iconColor: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800",
      description: "Orders in progress"
    },
    {
      label: "Paid This Month",
      value: data?.completedOrdersThisMonth || 0,
      icon: CheckCircle2,
      iconColor: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-800",
      description: "Completed orders"
    },
  ];

  const StatCard = ({ label, value, icon: Icon, iconColor, borderColor, description }: { 
    label: string; 
    value: number; 
    icon: React.ElementType;
    iconColor: string;
    borderColor: string;
    description: string;
  }) => (
    <Card className={`border-2 ${borderColor} transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`rounded-full ${iconColor} p-3 transition-colors`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-20" />
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
          <p className="text-destructive">Failed to load operational statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsItems.map((item, index) => (
        <StatCard 
          key={index}
          label={item.label} 
          value={item.value} 
          icon={item.icon}
          iconColor={item.iconColor}
          borderColor={item.borderColor}
          description={item.description}
        />
      ))}
    </div>
  );
} 