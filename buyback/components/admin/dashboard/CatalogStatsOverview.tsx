"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopCatalogOverview } from "@/hooks/useStats";
import { Smartphone, Layers, Store, ArchiveRestore } from "lucide-react";
import * as React from "react";

interface CatalogStatsOverviewProps {
  shopId: number;
}

export function CatalogStatsOverview({ shopId }: CatalogStatsOverviewProps) {
  const { data, isLoading, error } = useShopCatalogOverview(shopId);

  const statsItems = [
    {
      label: "Categories",
      value: data?.published.categories || 0,
      icon: Layers,
      iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      label: "Brands",
      value: data?.published.brands || 0,
      icon: Store,
      iconColor: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
      borderColor: "border-purple-200 dark:border-purple-800",
    },
    {
      label: "Series",
      value: data?.published.series || 0,
      icon: Layers,
      iconColor: "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      label: "Models",
      value: data?.published.models || 0,
      icon: Smartphone,
      iconColor: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
    {
      label: "Unpublished",
      value: data?.unpublishedModels || 0,
      icon: ArchiveRestore,
      iconColor: "text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400",
      borderColor: "border-gray-200 dark:border-gray-800",
    },
  ];

  const StatCard = ({ label, value, icon: Icon, iconColor, borderColor }: { 
    label: string; 
    value: number; 
    icon: React.ElementType;
    iconColor: string;
    borderColor: string;
  }) => (
    <Card className={`border-2 ${borderColor} transition-all duration-200 hover:shadow-md hover:scale-[1.02]`}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg ${iconColor} p-2.5 transition-colors`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-2">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
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
          <p className="text-destructive">Failed to load catalog statistics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statsItems.map((item, index) => (
        <StatCard 
          key={index}
          label={item.label} 
          value={item.value} 
          icon={item.icon}
          iconColor={item.iconColor}
          borderColor={item.borderColor}
        />
      ))}
    </div>
  );
} 