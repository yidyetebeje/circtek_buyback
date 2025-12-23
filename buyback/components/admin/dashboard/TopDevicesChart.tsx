"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopTopDevices, DateRange } from "@/hooks/useStats";

interface TopDevicesChartProps {
  shopId: number;
  dateRange?: DateRange;
  limit?: number;
}

export function TopDevicesChart({ shopId, dateRange, limit = 5 }: TopDevicesChartProps) {
  const { data, isLoading, error } = useShopTopDevices(shopId, limit, 'count', dateRange);

  const chartData = useMemo(() => {
    if (!data?.topDevices) return [];

    return data.topDevices.map(device => ({
      name: device.modelName,
      brand: device.brandName,
      count: device.orderCount,
      value: device.totalFinalValue,
      id: device.deviceId,
    })).sort((a, b) => b.count - a.count);
  }, [data]);



  if (isLoading) {
    return (
      <Card className="h-[480px] w-full">
        <CardHeader className="pb-4">
          <CardTitle>Top Devices</CardTitle>
          <CardDescription>Most popular devices by order count</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-[480px] w-full">
        <CardHeader className="pb-4">
          <CardTitle>Top Devices</CardTitle>
          <CardDescription>Most popular devices by order count</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] overflow-hidden">
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-destructive">Failed to load top devices data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="h-[480px] w-full">
        <CardHeader className="pb-4">
          <CardTitle>Top Devices</CardTitle>
          <CardDescription>Most popular devices by order count</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] overflow-hidden">
          <div className="h-full flex items-center justify-center text-center">
            <p>No Data Available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom formatter for currency values
  const formatCurrency = (value: number) => `€${value.toLocaleString()}`;

  return (
    <Card className="h-[480px] w-full">
      <CardHeader className="pb-4">
        <CardTitle>Top Devices</CardTitle>
        <CardDescription>Most popular devices by order count</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col h-[360px] overflow-hidden">
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 20, bottom: 20 }}>
              <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  value.length > 12 ? `${value.slice(0, 12)}...` : value
                }
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--chart-3))"
                radius={[0, 4, 4, 0]}
                name="Order Count"
              />
              <Tooltip
                formatter={(value, name) => [value, name]}
                labelFormatter={(label) => `Device: ${label}`}
              />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Additional value information display */}
        <div className="mt-3 space-y-2 flex-shrink-0 border-t pt-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">Revenue Breakdown</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {chartData.slice(0, 3).map((device) => (
              <div key={device.id} className="flex justify-between items-center text-sm">
                <span className="truncate mr-2 text-xs">{device.name}</span>
                <span className="font-semibold text-xs">{formatCurrency(device.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 