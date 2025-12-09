import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService, BackMarketListing } from "@/lib/api/backMarketService";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TestCompetitorDialogProps {
  listing: BackMarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestCompetitorDialog({ listing, open, onOpenChange }: TestCompetitorDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("Test Competitor");
  const [price, setPrice] = useState("");

  const addMutation = useMutation({
    mutationFn: () => backMarketService.addTestCompetitor(listing!.listing_id, name, parseFloat(price)),
    onSuccess: () => {
      toast.success("Test competitor added");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to add test competitor");
    }
  });

  const clearMutation = useMutation({
    mutationFn: () => backMarketService.clearTestCompetitors(listing!.listing_id),
    onSuccess: () => {
      toast.success("Test competitors cleared");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to clear test competitors");
    }
  });

  const handleAdd = () => {
    if (!listing || !price) return;
    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Simulate Competitor</DialogTitle>
          <DialogDescription>
            Add a fake competitor to test the pricing logic for {listing?.sku}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comp-name" className="text-right">
              Name
            </Label>
            <Input
              id="comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comp-price" className="text-right">
              Price
            </Label>
            <Input
              id="comp-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
              type="number"
              step="0.01"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button 
            variant="destructive" 
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Add Competitor
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
