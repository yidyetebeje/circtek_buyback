"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopOverview, DateRange } from "@/hooks/useStats";

interface OrderStatusChartProps {
  shopId: number;
  dateRange?: DateRange;
}

export function OrderStatusChart({ shopId, dateRange }: OrderStatusChartProps) {
  const { data, isLoading, error } = useShopOverview(shopId, dateRange);
  
  const chartData = useMemo(() => {
    if (!data?.ordersByStatus) return [];
    
    return Object.entries(data.ordersByStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: formatStatusName(status),
        value: count,
        statusKey: status,
      }));
  }, [data]);
  
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-1) / 0.7)",
    "hsl(var(--chart-2) / 0.7)",
    "hsl(var(--chart-3) / 0.7)",
    "hsl(var(--chart-4) / 0.7)",
    "hsl(var(--chart-5) / 0.7)",
  ];
  
  if (isLoading) {
    return (
      <Card className="h-[480px] w-full">
        <CardHeader className="pb-4">
          <CardTitle>Order Status Distribution</CardTitle>
          <CardDescription>Overview of orders by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <Skeleton className="h-[200px] w-[200px] md:h-[250px] md:w-[250px] rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card className="h-[480px] w-full">
        <CardHeader className="pb-4">
          <CardTitle>Order Status Distribution</CardTitle>
          <CardDescription>Overview of orders by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] overflow-hidden">
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-destructive">Failed to load order status data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="h-[480px] w-full">
        <CardHeader className="pb-4">
          <CardTitle>Order Status Distribution</CardTitle>
          <CardDescription>Overview of orders by status</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px] overflow-hidden">
          <div className="h-full flex items-center justify-center text-center">
            <p>No Data Available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="h-[480px] w-full">
      <CardHeader className="pb-4">
        <CardTitle>Order Status Distribution</CardTitle>
        <CardDescription>Overview of orders by status</CardDescription>
      </CardHeader>
      <CardContent className="h-[360px] overflow-hidden">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="60%"
                innerRadius="30%"
                paddingAngle={2}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [value, name]}
                labelFormatter={(label) => `Status: ${label}`}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }} 
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format status names for display
function formatStatusName(status: string): string {
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
} 