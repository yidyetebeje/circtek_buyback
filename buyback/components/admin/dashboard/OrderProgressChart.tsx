"use client";

import { useMemo } from "react";
import { XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopTimeSeries, TimeSeriesParams } from "@/hooks/useStats";
import { TrendingUp } from "lucide-react";
import * as React from "react";

interface OrderProgressChartProps {
  shopId: number;
  dateFrom: string;
  dateTo: string;
}

export function OrderProgressChart({ 
  shopId, 
  dateFrom, 
  dateTo
}: OrderProgressChartProps) {
  // Always use daily period for this chart
  const period = 'daily';

  const params: TimeSeriesParams = {
    dateFrom,
    dateTo,
    period
  };

  const { data, isLoading, error } = useShopTimeSeries(shopId, params);

  const chartData = useMemo(() => {
    if (!data?.timeSeries) return [];
    
    return data.timeSeries.map((point) => ({
      period: formatPeriodLabel(point.period, period),
      orders: point.orderCount,
      paid: point.paidOrders,
      pending: point.pendingOrders,
      arrived: point.arrivedOrders,
      rejected: point.rejectedOrders,
      totalValue: point.totalFinalValue,
      estimatedValue: point.totalEstimatedValue,
    }));
  }, [data, period]);

  const chartConfig: ChartConfig = {
    orders: {
      label: "Total Orders",
      color: "hsl(var(--chart-1))",
    },
    paid: {
      label: "Paid",
      color: "hsl(var(--chart-2))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--chart-3))",
    },
    arrived: {
      label: "Arrived",
      color: "hsl(var(--chart-4))",
    },
    rejected: {
      label: "Rejected",
      color: "hsl(var(--chart-5))",
    },
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Order Progress Over Time
          </CardTitle>
          <CardDescription>Track order trends and status changes</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Order Progress Over Time
          </CardTitle>
          <CardDescription>Track order trends and status changes</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              {error ? "Failed to load time series data" : "No data available for the selected period"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Daily Order Progress
        </CardTitle>
        <CardDescription>Track daily order trends and status changes</CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="h-[400px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart 
              data={chartData} 
              accessibilityLayer
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => 
                  value.length > 8 ? `${value.slice(0, 8)}...` : value
                }
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Bar dataKey="orders" fill="var(--color-orders)" name="Total Orders" />
              <Bar dataKey="paid" fill="var(--color-paid)" name="Paid Orders" />
              <Bar dataKey="pending" fill="var(--color-pending)" name="Pending Orders" />
              <Bar dataKey="arrived" fill="var(--color-arrived)" name="Arrived Orders" />
              <Bar dataKey="rejected" fill="var(--color-rejected)" name="Rejected Orders" />
              <ChartTooltip 
                content={<ChartTooltipContent labelKey="period" />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format period labels for display
function formatPeriodLabel(period: string, periodType: 'daily' | 'weekly' | 'monthly'): string {
  switch (periodType) {
    case 'daily':
      // Format YYYY-MM-DD to more readable format
      const date = new Date(period);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekly':
      // Format YYYY-WW to Week format
      return `Week ${period.split('-')[1]}`;
    case 'monthly':
      // Format YYYY-MM to Month Year
      const [year, month] = period.split('-');
      const monthDate = new Date(parseInt(year), parseInt(month) - 1);
      return monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    default:
      return period;
  }
} 