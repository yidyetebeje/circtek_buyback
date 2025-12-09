"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService } from "@/lib/api/backMarketService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Timer, Play } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { RateLimitStatus } from "./RateLimitStatus";

function Countdown({ targetDate }: { targetDate: string | Date }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Due now");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono font-medium text-blue-600">{timeLeft}</span>;
}

export function SchedulerDashboard() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['backmarket-scheduler'],
    queryFn: backMarketService.getSchedulerStatus,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const triggerMutation = useMutation({
    mutationFn: backMarketService.triggerSchedulerTask,
    onSuccess: (data, variables) => {
      toast.success(`Task triggered: ${variables}`);
      queryClient.invalidateQueries({ queryKey: ['backmarket-scheduler'] });
    },
    onError: (error) => {
      toast.error(`Failed to trigger task: ${error}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load scheduler status.
      </div>
    );
  }

  const status = data?.status || {};

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">System Status</h2>
            <Button 
                variant="default" 
                size="sm"
                onClick={() => triggerMutation.mutate('all')}
                disabled={triggerMutation.isPending}
            >
                {triggerMutation.isPending && triggerMutation.variables === 'all' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Play className="mr-2 h-4 w-4" />
                )}
                Trigger All Tasks
            </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(status).map(([jobName, jobStatus]) => (
            <Card key={jobName} className="bg-background/60 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {jobName.replace(/([A-Z])/g, ' $1').trim()}
                </CardTitle>
                {jobStatus.isRunning ? (
                  <Badge variant="default" className="bg-blue-500">Running</Badge>
                ) : (
                  <Badge variant="secondary">Idle</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Timer className="mr-2 h-4 w-4" />
                    Next Run: {jobStatus.nextRun ? <Countdown targetDate={jobStatus.nextRun} /> : 'Unknown'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="mr-2 h-4 w-4" />
                    Last Run: {jobStatus.lastRun ? format(new Date(jobStatus.lastRun), 'PPpp') : 'Never'}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2" 
                    disabled={jobStatus.isRunning || triggerMutation.isPending}
                    onClick={() => triggerMutation.mutate(jobName)}
                  >
                    {triggerMutation.isPending && triggerMutation.variables === jobName ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-3 w-3" />
                    )}
                    Trigger Now
                  </Button>

                  {jobStatus.lastError && (
                    <div className="flex items-start text-sm text-red-500 mt-2">
                      <XCircle className="mr-2 h-4 w-4 mt-0.5" />
                      <span className="break-all">{jobStatus.lastError}</span>
                    </div>
                  )}
                  {!jobStatus.lastError && jobStatus.lastRun && (
                    <div className="flex items-center text-sm text-green-500">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Success
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {Object.keys(status).length === 0 && (
            <div className="col-span-full text-center p-8 text-gray-500">
              No active jobs found.
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">API Rate Limits</h2>
        <RateLimitStatus />
      </div>
    </div>
  );
}
