"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService, BackMarketListing } from "@/lib/api/backMarketService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity, ShieldAlert, Plus, History, Pencil, Settings, FlaskConical, LayoutGrid, List, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RepricingHistoryDialog } from "./RepricingHistoryDialog";
import { BulkUploadDialog } from "./BulkUploadDialog";
import { StrategyConfigurationDialog } from "./StrategyConfigurationDialog";
import { TestCompetitorDialog } from "./TestCompetitorDialog";

export function ListingsManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const limit = 10;
  
  // Dialog states
  const [probeListing, setProbeListing] = useState<BackMarketListing | null>(null);
  const [recoverListing, setRecoverListing] = useState<BackMarketListing | null>(null);
  const [probePrice, setProbePrice] = useState("");
  const [recoverPrice, setRecoverPrice] = useState("");

  const [createListingOpen, setCreateListingOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [historyListing, setHistoryListing] = useState<BackMarketListing | null>(null);
  const [basePriceListing, setBasePriceListing] = useState<BackMarketListing | null>(null);
  const [strategyListing, setStrategyListing] = useState<BackMarketListing | null>(null);
  const [testCompetitorListing, setTestCompetitorListing] = useState<BackMarketListing | null>(null);
  const [newBasePrice, setNewBasePrice] = useState("");
  
  const [newListingData, setNewListingData] = useState({
    sku: "",
    title: "",
    price: "",
    quantity: 1,
    state: 1,
    grade: 1
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backmarket-listings', page],
    queryFn: () => backMarketService.getListings({ page, limit }),
  });

  const { data: config } = useQuery({
    queryKey: ['backmarket-config'],
    queryFn: backMarketService.getBackMarketConfig,
  });

  const syncMutation = useMutation({
    mutationFn: backMarketService.syncListings,
    onSuccess: () => {
      toast.success("Listings sync started");
      queryClient.invalidateQueries({ queryKey: ['backmarket-listings'] });
    },
    onError: () => {
      toast.error("Failed to start sync");
    }
  });

  const repriceMutation = useMutation({
    mutationFn: backMarketService.repriceListing,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Repricing triggered");
        queryClient.invalidateQueries({ queryKey: ['backmarket-listings'] });
      } else {
        toast.error(data.message || "Repricing failed");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to trigger repricing");
    }
  });

  const probeMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => 
      backMarketService.runProbe(id, price),
    onSuccess: () => {
      toast.success("Price probe started");
      setProbeListing(null);
    },
    onError: () => {
      toast.error("Failed to start probe");
    }
  });

  const recoverMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => 
      backMarketService.recoverPrice(id, price),
    onSuccess: () => {
      toast.success("Price recovery triggered");
      setRecoverListing(null);
    },
    onError: () => {
      toast.error("Failed to recover price");
    }
  });

  const createMutation = useMutation({
    mutationFn: backMarketService.createListing,
    onSuccess: () => {
      toast.success("Listing created");
      setCreateListingOpen(false);
      queryClient.invalidateQueries({ queryKey: ['backmarket-listings'] });
    },
    onError: () => toast.error("Failed to create listing")
  });

  const updateBasePriceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => 
      backMarketService.updateBasePrice(id, price),
    onSuccess: () => {
      toast.success("Base price updated");
      setBasePriceListing(null);
      queryClient.invalidateQueries({ queryKey: ['backmarket-listings'] });
    },
    onError: () => toast.error("Failed to update base price")
  });
  
  const { data: historyData } = useQuery({
    queryKey: ['backmarket-history', historyListing?.listing_id],
    queryFn: () => historyListing ? backMarketService.getPriceHistory(historyListing.listing_id) : Promise.resolve(null),
    enabled: !!historyListing
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
        Failed to load listings. Please try again.
      </div>
    );
  }

  const listings = data?.results || [];

  return (
    <Card className="bg-background/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Listings Manager</CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">
            Manage your Back Market listings and prices.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md mr-2">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-none rounded-l-md"
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-none rounded-r-md"
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setBulkUploadOpen(true)}
          >
            Bulk Upload
          </Button>
          <Button 
            size="sm" 
            onClick={() => setCreateListingOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Listings
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'list' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Last Dip</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No listings found. Try syncing.
                  </TableCell>
                </TableRow>
              ) : (
                listings.map((listing) => (
                  <TableRow key={listing.listing_id}>
                    <TableCell className="font-medium max-w-[120px] truncate" title={listing.sku}>{listing.sku}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={listing.title || ''}>{listing.title || 'N/A'}</TableCell>
                    <TableCell className="whitespace-nowrap">{listing.price} {listing.currency || config?.currency}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {listing.base_price ? `${listing.base_price} ${listing.currency || config?.currency}` : 'N/A'}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setBasePriceListing(listing);
                            setNewBasePrice(listing.base_price || "");
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {listing.last_dip_at ? new Date(listing.last_dip_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    </TableCell>
                    <TableCell>{listing.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={listing.publication_state === 2 ? "default" : "secondary"}>
                        {listing.publication_state === 2 ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setHistoryListing(listing)}>
                            <History className="mr-2 h-4 w-4" />
                            Price History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStrategyListing(listing)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Strategy Config
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTestCompetitorListing(listing)}>
                            <FlaskConical className="mr-2 h-4 w-4" />
                            Simulate Competitor
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => repriceMutation.mutate(listing.listing_id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Trigger Reprice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setProbeListing(listing);
                            setProbePrice(listing.price || "");
                          }}>
                            <Activity className="mr-2 h-4 w-4" />
                            Probe Price
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setRecoverListing(listing);
                              setRecoverPrice(listing.price || "");
                            }}
                          >
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Emergency Recover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500 border rounded-md">
                No listings found. Try syncing.
              </div>
            ) : (
              listings.map((listing) => (
                <Card key={listing.listing_id} className="overflow-hidden">
                  <CardHeader className="pb-2 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold">{listing.sku}</CardTitle>
                        <CardDescription className="line-clamp-1 text-xs mt-1" title={listing.title}>
                          {listing.title || 'N/A'}
                        </CardDescription>
                      </div>
                      <Badge variant={listing.publication_state === 2 ? "default" : "secondary"}>
                        {listing.publication_state === 2 ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 text-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Current Price:</span>
                      <span className="font-semibold">{listing.price} {listing.currency || config?.currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Base Price:</span>
                      <div className="flex items-center gap-2">
                        <span>{listing.base_price ? `${listing.base_price} ${listing.currency || config?.currency}` : 'N/A'}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            setBasePriceListing(listing);
                            setNewBasePrice(listing.base_price || "");
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span>{listing.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Dip:</span>
                      <span className="text-xs">{listing.last_dip_at ? new Date(listing.last_dip_at).toLocaleString() : '-'}</span>
                    </div>
                    
                    <div className="pt-4 flex flex-wrap gap-1 justify-end border-t mt-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Price History"
                        onClick={() => setHistoryListing(listing)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Strategy Configuration"
                        onClick={() => setStrategyListing(listing)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Simulate Competitor"
                        onClick={() => setTestCompetitorListing(listing)}
                      >
                        <FlaskConical className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Reprice"
                        onClick={() => repriceMutation.mutate(listing.listing_id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Probe Price"
                        onClick={() => {
                          setProbeListing(listing);
                          setProbePrice(listing.price || "");
                        }}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="Emergency Recover"
                        onClick={() => {
                          setRecoverListing(listing);
                          setRecoverPrice(listing.price || "");
                        }}
                      >
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
        
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="text-sm text-gray-500">
            Page {page}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={listings.length < limit}
          >
            Next
          </Button>
        </div>
      </CardContent>

      {/* Create Listing Dialog */}
      <Dialog open={createListingOpen} onOpenChange={setCreateListingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Listing</DialogTitle>
            <DialogDescription>Add a new listing to Back Market.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right">SKU</Label>
              <Input id="sku" value={newListingData.sku} onChange={(e) => setNewListingData({...newListingData, sku: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" value={newListingData.title} onChange={(e) => setNewListingData({...newListingData, title: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Price</Label>
              <Input id="price" type="number" value={newListingData.price} onChange={(e) => setNewListingData({...newListingData, price: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">Quantity</Label>
              <Input id="quantity" type="number" value={newListingData.quantity} onChange={(e) => setNewListingData({...newListingData, quantity: parseInt(e.target.value)})} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateListingOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(newListingData)} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Base Price Dialog */}
      <Dialog open={!!basePriceListing} onOpenChange={(open) => !open && setBasePriceListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Base Price</DialogTitle>
            <DialogDescription>Set the minimum price for this listing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="base-price" className="text-right">Base Price</Label>
              <Input id="base-price" type="number" value={newBasePrice} onChange={(e) => setNewBasePrice(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBasePriceListing(null)}>Cancel</Button>
            <Button onClick={() => basePriceListing && updateBasePriceMutation.mutate({ id: basePriceListing.listing_id, price: parseFloat(newBasePrice) })} disabled={updateBasePriceMutation.isPending}>
              {updateBasePriceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyListing} onOpenChange={(open) => !open && setHistoryListing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>View historical prices for {historyListing?.sku}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Max Our Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {historyData?.data?.filter((e: any) => !e.competitor_id).reduce((max: number, e: any) => Math.max(max, parseFloat(e.price)), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Max Competitor Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {historyData?.data?.filter((e: any) => e.competitor_id).reduce((max: number, e: any) => Math.max(max, parseFloat(e.price)), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData?.data?.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{entry.price} {entry.currency}</TableCell>
                    <TableCell>{entry.competitor_name || 'Us'}</TableCell>
                    <TableCell>{entry.is_winner ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
                {!historyData?.data?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No history available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Probe Dialog */}
      <Dialog open={!!probeListing} onOpenChange={(open) => !open && setProbeListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Price Probe</DialogTitle>
            <DialogDescription>
              This will execute the Dip-Peek-Peak strategy to find the optimal price.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="probe-price" className="text-right">
                Current Price
              </Label>
              <Input
                id="probe-price"
                value={probePrice}
                onChange={(e) => setProbePrice(e.target.value)}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProbeListing(null)}>Cancel</Button>
            <Button 
              onClick={() => probeListing && probeMutation.mutate({ 
                id: probeListing.listing_id, 
                price: parseFloat(probePrice) 
              })}
              disabled={probeMutation.isPending}
            >
              {probeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Probe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recover Dialog */}
      <Dialog open={!!recoverListing} onOpenChange={(open) => !open && setRecoverListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency Price Recovery</DialogTitle>
            <DialogDescription>
              Force update the price immediately to the target value.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recover-price" className="text-right">
                Target Price
              </Label>
              <Input
                id="recover-price"
                value={recoverPrice}
                onChange={(e) => setRecoverPrice(e.target.value)}
                className="col-span-3"
                type="number"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoverListing(null)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => recoverListing && recoverMutation.mutate({ 
                id: recoverListing.listing_id, 
                price: parseFloat(recoverPrice) 
              })}
              disabled={recoverMutation.isPending}
            >
              {recoverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Recover Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RepricingHistoryDialog 
        listing={historyListing} 
        open={!!historyListing} 
        onOpenChange={(open) => !open && setHistoryListing(null)} 
      />

      <BulkUploadDialog 
        open={bulkUploadOpen} 
        onOpenChange={setBulkUploadOpen} 
      />

      <StrategyConfigurationDialog
        listing={strategyListing}
        open={!!strategyListing}
        onOpenChange={(open) => !open && setStrategyListing(null)}
      />

      <TestCompetitorDialog
        listing={testCompetitorListing}
        open={!!testCompetitorListing}
        onOpenChange={(open) => !open && setTestCompetitorListing(null)}
      />
    </Card>
  );
}
