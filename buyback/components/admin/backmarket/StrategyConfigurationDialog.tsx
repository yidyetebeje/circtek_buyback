import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService, BackMarketListing, PricingParameters } from "@/lib/api/backMarketService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface StrategyConfigurationDialogProps {
  listing: BackMarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StrategyConfigurationDialog({ listing, open, onOpenChange }: StrategyConfigurationDialogProps) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Partial<PricingParameters>>({
    m_target: "0.15",
    f_bm: "0.10",
    c_refurb: "0",
    c_op: "0",
    c_risk: "0",
    price_step: "1.00"
  });

  const [triggerReprice, setTriggerReprice] = useState(true);

  const { data: existingParams, isLoading } = useQuery({
    queryKey: ['pricing-params', listing?.sku, listing?.grade],
    queryFn: () => listing ? backMarketService.getParameters(listing.sku!, listing.grade!, "fr-fr") : Promise.resolve(null),
    enabled: !!listing && open
  });

  useEffect(() => {
    if (existingParams?.data) {
      setParams(existingParams.data);
    }
  }, [existingParams]);

  const mutation = useMutation({
    mutationFn: backMarketService.updateParameters,
    onSuccess: (data) => {
      toast.success(data.message || "Strategy updated successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['pricing-params'] });
      if (triggerReprice) {
          queryClient.invalidateQueries({ queryKey: ['backmarket-listings'] });
      }
    },
    onError: () => {
      toast.error("Failed to update strategy");
    }
  });

  const handleSave = () => {
    if (!listing) return;
    
    mutation.mutate({
      sku: listing.sku!,
      grade: listing.grade!,
      country_code: "fr-fr", // Defaulting to FR for now
      ...params,
      triggerReprice
    } as PricingParameters & { triggerReprice: boolean });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Pricing Strategy</DialogTitle>
          <DialogDescription>
            Configure pricing parameters for {listing?.sku} (Grade {listing?.grade})
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="m_target" className="text-right">
                Target Margin
              </Label>
              <Input
                id="m_target"
                value={params.m_target}
                onChange={(e) => setParams({ ...params, m_target: e.target.value })}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="f_bm" className="text-right">
                BM Fee Rate
              </Label>
              <Input
                id="f_bm"
                value={params.f_bm}
                onChange={(e) => setParams({ ...params, f_bm: e.target.value })}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price_step" className="text-right">
                Overcut Step
              </Label>
              <Input
                id="price_step"
                value={params.price_step}
                onChange={(e) => setParams({ ...params, price_step: e.target.value })}
                className="col-span-3"
                type="number"
                step="0.01"
                placeholder="1.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c_refurb" className="text-right">
                Refurb Cost
              </Label>
              <Input
                id="c_refurb"
                value={params.c_refurb}
                onChange={(e) => setParams({ ...params, c_refurb: e.target.value })}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c_op" className="text-right">
                Op Cost
              </Label>
              <Input
                id="c_op"
                value={params.c_op}
                onChange={(e) => setParams({ ...params, c_op: e.target.value })}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c_risk" className="text-right">
                Risk Cost
              </Label>
              <Input
                id="c_risk"
                value={params.c_risk}
                onChange={(e) => setParams({ ...params, c_risk: e.target.value })}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2 justify-end">
              <Checkbox 
                id="triggerReprice" 
                checked={triggerReprice}
                onCheckedChange={(checked) => setTriggerReprice(checked as boolean)}
              />
              <Label htmlFor="triggerReprice" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Trigger repricing immediately
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
