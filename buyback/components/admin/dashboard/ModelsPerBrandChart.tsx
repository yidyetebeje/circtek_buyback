"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useModelsPerBrand } from "@/hooks/useStats";
import * as React from "react";

interface ModelsPerBrandChartProps {
  shopId: number;
  limit?: number;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export function ModelsPerBrandChart({ shopId, limit = 6 }: ModelsPerBrandChartProps) {
  const { data, isLoading, error } = useModelsPerBrand(shopId);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.slice(0, limit).map((item) => ({
      name: item.brandName,
      value: item.modelCount,
    }));
  }, [data, limit]);

  const chartConfig: ChartConfig = {};

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Models per Brand</CardTitle>
          <CardDescription>Top brands by published models</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Models per Brand</CardTitle>
        <CardDescription>Top brands by published models</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 