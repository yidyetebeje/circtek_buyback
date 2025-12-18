"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { backMarketService, BackMarketListing } from "@/lib/api/backMarketService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface RepricingHistoryDialogProps {
  listing: BackMarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepricingHistoryDialog({ listing, open, onOpenChange }: RepricingHistoryDialogProps) {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['listing-history', listing?.listing_id],
    queryFn: () => backMarketService.getPriceHistory(listing!.listing_id),
    enabled: !!listing && open,
  });

  const history = historyData?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 bg-white/95 backdrop-blur-xl">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Repricing History</DialogTitle>
          <DialogDescription>
            Price changes for {listing?.title} (SKU: {listing?.sku})
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Winner?</TableHead>
                  <TableHead>Competitor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.timestamp), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        {entry.price} {entry.currency}
                      </TableCell>
                      <TableCell>
                        {entry.is_winner ? (
                          <Badge className="bg-green-500">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.competitor_name || (entry.competitor_id ? `ID: ${entry.competitor_id}` : "-")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
