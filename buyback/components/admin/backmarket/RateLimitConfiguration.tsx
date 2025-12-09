"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService, RateLimitConfig } from "@/lib/api/backMarketService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RateLimitConfiguration() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<RateLimitConfig | null>(null);

  // Fetch current status to get current config
  const { data: status, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['backmarket-rate-limits'],
    queryFn: backMarketService.getRateLimitStatus,
  });

  // Fetch defaults for preview
  const { data: defaults, isLoading: isLoadingDefaults } = useQuery({
    queryKey: ['backmarket-rate-limits-defaults'],
    queryFn: backMarketService.getDefaultRateLimits,
  });

  // Initialize form with current status
  useEffect(() => {
    if (status) {
      const currentConfig: any = {};
      Object.entries(status).forEach(([key, value]) => {
        // Backend returns uppercase keys (GLOBAL), but config uses lowercase (global)
        const configKey = key.toLowerCase();
        currentConfig[configKey] = {
          maxRequests: value.maxTokens,
          intervalMs: value.refillIntervalMs
        };
      });
      setConfig(currentConfig as RateLimitConfig);
    }
  }, [status]);

  const updateMutation = useMutation({
    mutationFn: backMarketService.updateRateLimitConfig,
    onSuccess: () => {
      toast.success("Rate limits updated successfully");
      queryClient.invalidateQueries({ queryKey: ['backmarket-rate-limits'] });
    },
    onError: () => toast.error("Failed to update rate limits")
  });

  const handleSave = () => {
    if (config) {
      updateMutation.mutate(config);
    }
  };

  const handleResetToDefaults = () => {
    if (defaults) {
      setConfig(defaults);
      toast.info("Reset to defaults. Click Save to apply.");
    }
  };

  const handleChange = (bucket: keyof RateLimitConfig, field: 'maxRequests' | 'intervalMs', value: string) => {
    if (!config) return;
    const numValue = parseInt(value) || 0;
    setConfig({
      ...config,
      [bucket]: {
        ...config[bucket],
        [field]: numValue
      }
    });
  };

  if (isLoadingStatus || isLoadingDefaults) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!config || !defaults) return null;

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50/50 border-blue-200">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle>Rate Limit Configuration</AlertTitle>
        <AlertDescription>
          Configure the hard limits for the Back Market API. These settings control the token bucket algorithm used to throttle requests.
          <br />
          <strong>Warning:</strong> Setting these too high may result in 429 Too Many Requests errors from Back Market.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(config) as Array<keyof RateLimitConfig>).map((bucket) => (
          <Card key={bucket} className="bg-background/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="capitalize">{bucket} Bucket</CardTitle>
              <CardDescription>
                Default: {defaults[bucket]?.maxRequests ?? 'N/A'} req / {defaults[bucket]?.intervalMs ?? 'N/A'}ms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Max Requests (Tokens)</Label>
                <Input 
                  type="number" 
                  value={config[bucket].maxRequests}
                  onChange={(e) => handleChange(bucket, 'maxRequests', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Interval (ms)</Label>
                <Input 
                  type="number" 
                  value={config[bucket].intervalMs}
                  onChange={(e) => handleChange(bucket, 'intervalMs', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {config[bucket].maxRequests} requests per {config[bucket].intervalMs / 1000} seconds
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleResetToDefaults}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
