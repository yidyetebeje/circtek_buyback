"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, Save, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { backMarketService } from "@/lib/api/backMarketService";

interface BuybackPrice {
  id: number;
  sku: string;
  grade_name: string;
  price: string;
  market_price: string;
  updated_at: string;
}

interface PricingParams {
  id?: number;
  sku: string;
  grade: number;
  country_code: string;
  c_refurb: string;
  c_op: string;
  c_risk: string;
  m_target: string;
  f_bm: string;
}

export function BuybackPricingManager() {
  const queryClient = useQueryClient();
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Fetch Prices
  const { data: prices, isLoading, refetch } = useQuery({
    queryKey: ["buyback-prices"],
    queryFn: async () => {
      const res = await backMarketService.getBuybackPrices();
      return res.data;
    },
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await backMarketService.syncBuybackPrices();
    },
    onSuccess: () => {
      toast.success("Prices synced successfully");
      queryClient.invalidateQueries({ queryKey: ["buyback-prices"] });
    },
    onError: () => {
      toast.error("Failed to sync prices");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Buyback Pricing</h2>
          <p className="text-muted-foreground">
            Manage calculated buyback prices based on Back Market data.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button 
            onClick={() => syncMutation.mutate()} 
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync Prices
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calculated Prices</CardTitle>
          <CardDescription>
            Prices are calculated as: Market Price - Costs - (Market Price * (Margin + Fee))
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Market Price</TableHead>
                  <TableHead>Buyback Price</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : prices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">No prices found. Try syncing.</TableCell>
                  </TableRow>
                ) : (
                  prices?.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">{price.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{price.grade_name}</Badge>
                      </TableCell>
                      <TableCell>€{price.market_price}</TableCell>
                      <TableCell className="font-bold text-green-600">€{price.price}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(price.updated_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedSku(price.sku);
                          setIsParamsOpen(true);
                        }}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-full text-center py-8">Loading...</div>
              ) : prices?.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                  No prices found. Try syncing.
                </div>
              ) : (
                prices?.map((price) => (
                  <div key={price.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-lg">{price.sku}</div>
                        <Badge variant="outline" className="mt-1">{price.grade_name}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Buyback Price</div>
                        <div className="font-bold text-xl text-green-600">€{price.price}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Market Price:</span>
                        <span className="font-medium">€{price.market_price}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Last Updated:</span>
                        <span className="font-medium text-xs">{new Date(price.updated_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setSelectedSku(price.sku);
                          setIsParamsOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Parameters
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PricingParamsDialog 
        open={isParamsOpen} 
        onOpenChange={setIsParamsOpen} 
        sku={selectedSku} 
      />
    </div>
  );
}

function PricingParamsDialog({ open, onOpenChange, sku }: { open: boolean, onOpenChange: (open: boolean) => void, sku: string | null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<PricingParams>>({});

  // Fetch Params
  const { data: params, isLoading } = useQuery({
    queryKey: ["pricing-params", sku],
    queryFn: async () => {
      if (!sku) return null;
      // Default to grade 10 (Mint) and country 'fr-fr' for now as per our script
      const res = await backMarketService.getParameters(sku, 10, 'fr-fr');
      return res.data as PricingParams;
    },
    enabled: !!sku && open,
  });

  // Update local state when data loads
  if (params && (!formData.sku || formData.sku !== sku)) {
    setFormData(params);
  }

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PricingParams>) => {
      return await backMarketService.updateParameters({
        ...data,
        sku: sku!, // Ensure SKU is set
        grade: 10, // Hardcoded for now
        country_code: 'fr-fr' // Hardcoded for now
      });
    },
    onSuccess: () => {
      toast.success("Parameters updated");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["pricing-params", sku] });
      // Also invalidate prices as they might change on next sync
      // Ideally we trigger a sync here too or recalculate locally
    },
    onError: () => {
      toast.error("Failed to update parameters");
    }
  });

  const handleChange = (field: keyof PricingParams, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Pricing Parameters</DialogTitle>
          <CardDescription>SKU: {sku}</CardDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-4">Loading...</div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c_refurb" className="text-right">Refurb Cost</Label>
              <Input 
                id="c_refurb" 
                value={formData.c_refurb || ""} 
                onChange={e => handleChange("c_refurb", e.target.value)}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c_op" className="text-right">Op Cost</Label>
              <Input 
                id="c_op" 
                value={formData.c_op || ""} 
                onChange={e => handleChange("c_op", e.target.value)}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c_risk" className="text-right">Risk Cost</Label>
              <Input 
                id="c_risk" 
                value={formData.c_risk || ""} 
                onChange={e => handleChange("c_risk", e.target.value)}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="m_target" className="text-right">Target Margin %</Label>
              <Input 
                id="m_target" 
                value={formData.m_target || ""} 
                onChange={e => handleChange("m_target", e.target.value)}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="f_bm" className="text-right">BM Fee %</Label>
              <Input 
                id="f_bm" 
                value={formData.f_bm || ""} 
                onChange={e => handleChange("f_bm", e.target.value)}
                className="col-span-3" 
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="submit" onClick={() => updateMutation.mutate(formData)}>
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
