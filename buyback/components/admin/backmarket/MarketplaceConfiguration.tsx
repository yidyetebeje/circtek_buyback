"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService } from "@/lib/api/backMarketService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const MARKETPLACES = [
  { id: 'fr-fr', name: 'France', currency: 'EUR' },
  { id: 'de-de', name: 'Germany', currency: 'EUR' },
  { id: 'en-gb', name: 'United Kingdom', currency: 'GBP' },
  { id: 'en-us', name: 'United States', currency: 'USD' },
  { id: 'es-es', name: 'Spain', currency: 'EUR' },
  { id: 'it-it', name: 'Italy', currency: 'EUR' },
  { id: 'fr-be', name: 'Belgium', currency: 'EUR' },
];

export function MarketplaceConfiguration() {
  const queryClient = useQueryClient();
  const [marketplace, setMarketplace] = useState("fr-fr");
  const [currency, setCurrency] = useState("EUR");

  const { data: config, isLoading } = useQuery({
    queryKey: ['backmarket-config'],
    queryFn: backMarketService.getBackMarketConfig,
  });

  useEffect(() => {
    if (config) {
      setMarketplace(config.marketplace);
      setCurrency(config.currency);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: backMarketService.updateBackMarketConfig,
    onSuccess: () => {
      toast.success("Configuration updated successfully");
      queryClient.invalidateQueries({ queryKey: ['backmarket-config'] });
    },
    onError: () => {
      toast.error("Failed to update configuration");
    }
  });

  const handleMarketplaceChange = (value: string) => {
    setMarketplace(value);
    const selected = MARKETPLACES.find(m => m.id === value);
    if (selected) {
      setCurrency(selected.currency);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ marketplace, currency });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace Settings</CardTitle>
        <CardDescription>Configure your primary Back Market marketplace and currency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="marketplace">Marketplace</Label>
          <Select value={marketplace} onValueChange={handleMarketplaceChange}>
            <SelectTrigger id="marketplace">
              <SelectValue placeholder="Select marketplace" />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} ({m.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Currency</Label>
          <div className="p-2 border rounded-md bg-muted text-muted-foreground">
            {currency}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}
