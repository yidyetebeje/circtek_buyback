"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useModelsPerCategory } from "@/hooks/useStats";
import * as React from "react";

interface ModelsPerCategoryChartProps {
  shopId: number;
  limit?: number;
}

export function ModelsPerCategoryChart({ shopId, limit = 10 }: ModelsPerCategoryChartProps) {
  const { data, isLoading, error } = useModelsPerCategory(shopId);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.slice(0, limit).map((item) => ({
      name: item.categoryName,
      count: item.modelCount,
    })).sort((a,b) => b.count - a.count);
  }, [data, limit]);

  const chartConfig: ChartConfig = {
    count: { label: "Models", color: "hsl(var(--chart-1))" },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Models per Category</CardTitle>
          <CardDescription>Distribution of published models</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Models per Category</CardTitle>
        <CardDescription>Top categories by published models</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickFormatter={(v) => (v.length > 10 ? v.slice(0,10)+"..." : v)} />
            <YAxis />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4,4,0,0]} name="Models" />
            <ChartTooltip content={<ChartTooltipContent labelKey="name" />} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 