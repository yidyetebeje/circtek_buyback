"use client";

import { useQuery } from "@tanstack/react-query";
import { backMarketService } from "@/lib/api/backMarketService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity } from "lucide-react";

type ProgressProps = {
  value?: number;
  className?: string;
  indicatorClassName?: string;
};

function Progress({ value = 0, className = "", indicatorClassName = "" }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full bg-muted h-2 rounded overflow-hidden ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`h-full rounded transition-all ${indicatorClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function RateLimitStatus() {
  const { data: rateLimits, isLoading } = useQuery({
    queryKey: ['backmarket-rate-limits'],
    queryFn: () => backMarketService.getRateLimitStatus(),
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rateLimits) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(rateLimits).map(([key, bucket]) => {
        const percentage = (bucket.tokens / bucket.maxTokens) * 100;
        const isLow = percentage < 20;
        
        return (
          <Card key={key} className="bg-background/60 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {key.toLowerCase()} Bucket
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.floor(bucket.tokens)}</div>
              <p className="text-xs text-muted-foreground mb-2">
                of {bucket.maxTokens} tokens available
              </p>
              <Progress 
                value={percentage} 
                className={`h-2 ${isLow ? "bg-red-100" : ""}`}
                indicatorClassName={isLow ? "bg-red-500" : "bg-emerald-500"}
              />
              {bucket.queueLength > 0 && (
                <p className="text-xs text-amber-500 mt-2 font-medium">
                  Queue: {bucket.queueLength} requests
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
