"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopShops, DateRange } from "@/hooks/useStats";

interface TopShopsChartProps {
  dateRange?: DateRange;
  limit?: number;
}

export function TopShopsChart({ dateRange, limit = 5 }: TopShopsChartProps) {
  const { data, isLoading, error } = useTopShops(limit, 'orderCount', dateRange);

  const chartData = useMemo(() => {
    if (!data?.topShops) return [];

    return data.topShops.map(shop => ({
      name: shop.shopName,
      count: shop.orderCount,
      value: shop.totalFinalValue,
      id: shop.shopId,
    })).sort((a, b) => b.count - a.count);
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: {
        label: "Order Count",
        color: "hsl(var(--chart-1))",
      },
      value: {
        label: "Total Value",
        color: "hsl(var(--chart-2))",
      },
    };

    return config;
  }, []);

  // Custom formatter for currency values
  const formatCurrency = (value: number) => `€${value.toLocaleString()}`;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Shops</CardTitle>
          <CardDescription>Best performing shops by order count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Shops</CardTitle>
          <CardDescription>Best performing shops by order count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-center">
            <p className="text-destructive">Failed to load top shops data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Shops</CardTitle>
          <CardDescription>Best performing shops by order count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-center">
            <p>No Data Available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Shops</CardTitle>
        <CardDescription>Best performing shops by order count</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickFormatter={(value) =>
                value.length > 10 ? `${value.slice(0, 10)}...` : value
              }
            />
            <YAxis />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
              name="Order Count"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent labelKey="name" />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between font-semibold border-b pb-1">
            <span>Shop</span>
            <span>Revenue</span>
          </div>
          {chartData.slice(0, 3).map((shop) => (
            <div key={shop.id} className="flex justify-between">
              <span>{shop.name}</span>
              <span className="font-semibold">{formatCurrency(shop.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 