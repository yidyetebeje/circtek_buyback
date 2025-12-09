"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backMarketService } from "@/lib/api/backMarketService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Eye, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function OrdersManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const limit = 10;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backmarket-orders', page],
    queryFn: () => backMarketService.getOrders({ page, limit }),
  });

  const { data: liveOrderData, isLoading: isLoadingLive } = useQuery({
    queryKey: ['backmarket-live-order', selectedOrderId],
    queryFn: () => selectedOrderId ? backMarketService.getLiveOrder(selectedOrderId) : null,
    enabled: !!selectedOrderId,
  });

  const syncMutation = useMutation({
    mutationFn: () => backMarketService.syncOrders(false),
    onSuccess: (data) => {
      toast.success(`Synced ${data.totalSynced} orders`);
      queryClient.invalidateQueries({ queryKey: ['backmarket-orders'] });
    },
    onError: () => {
      toast.error("Failed to sync orders");
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
        Failed to load orders. Please try again.
      </div>
    );
  }

  const orders = data?.results || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Orders Manager</CardTitle>
          <CardDescription>View and sync Back Market orders.</CardDescription>
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
            variant="outline" 
            size="sm" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Orders
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'list' ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No orders found. Try syncing.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.order_id}>
                      <TableCell className="font-medium">{order.order_id}</TableCell>
                      <TableCell>{format(new Date(order.creation_date), 'PP')}</TableCell>
                      <TableCell>
                        {order.shipping_first_name} {order.shipping_last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === '0' ? "default" : "secondary"}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedOrderId(order.order_id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Order Details: {order.order_id}</DialogTitle>
                              <DialogDescription>
                                Live data from Back Market API
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              {isLoadingLive ? (
                                <div className="flex justify-center p-8">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                              ) : liveOrderData ? (
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto max-h-[400px] text-xs">
                                  {JSON.stringify(liveOrderData.data, null, 2)}
                                </pre>
                              ) : (
                                <p>No live data available.</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                No orders found. Try syncing.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.order_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-lg">{order.order_id}</div>
                      <div className="text-sm text-gray-500">{format(new Date(order.creation_date), 'PP')}</div>
                    </div>
                    <Badge variant={order.status === '0' ? "default" : "secondary"}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Customer:</span>{' '}
                      <span className="font-medium">{order.shipping_first_name} {order.shipping_last_name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Price:</span>{' '}
                      <span className="font-medium">{order.price} {order.currency}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                     <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedOrderId(order.order_id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Order Details: {order.order_id}</DialogTitle>
                            <DialogDescription>
                              Live data from Back Market API
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4">
                            {isLoadingLive ? (
                              <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                              </div>
                            ) : liveOrderData ? (
                              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto max-h-[400px] text-xs">
                                {JSON.stringify(liveOrderData.data, null, 2)}
                              </pre>
                            ) : (
                              <p>No live data available.</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                  </div>
                </div>
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
            disabled={orders.length < limit}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusLabel(status: string) {
  const statusMap: Record<string, string> = {
    '0': 'New',
    '1': 'Payment Confirmed',
    '2': 'Shipped',
    '3': 'Cancelled',
    '8': 'Refunded',
    '9': 'Received'
  };
  return statusMap[status] || `Status ${status}`;
}
