"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingsManager } from "./ListingsManager";
import { PricingConfiguration } from "./PricingConfiguration";
import { SchedulerDashboard } from "./SchedulerDashboard";
import { OrdersManager } from "./OrdersManager";
import { ApiSettings } from "./ApiSettings";
import { BuybackPricingManager } from "../pricing/BuybackPricingManager";

export function BackMarketClient() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="listings" className="space-y-6">
        <div className="rounded-xl border bg-background/60 backdrop-blur-xl shadow-sm p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">Back Market Integration</h1>
            </div>

            <TabsList className="grid w-full grid-cols-6 h-12 items-center rounded-lg bg-muted/50 p-1 text-muted-foreground">
              <TabsTrigger value="listings" className="h-full rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Listings Manager</TabsTrigger>
              <TabsTrigger value="orders" className="h-full rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Orders</TabsTrigger>
              <TabsTrigger value="configuration" className="h-full rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Pricing Configuration</TabsTrigger>
              <TabsTrigger value="buyback-pricing" className="h-full rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Buyback Pricing</TabsTrigger>
              <TabsTrigger value="scheduler" className="h-full rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">Scheduler Status</TabsTrigger>
              <TabsTrigger value="api-settings" className="h-full rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">API Settings</TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value="listings" className="space-y-4">
          <ListingsManager />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <OrdersManager />
        </TabsContent>
        
        <TabsContent value="configuration" className="space-y-4">
          <PricingConfiguration />
        </TabsContent>

        <TabsContent value="buyback-pricing" className="space-y-4">
          <BuybackPricingManager />
        </TabsContent>
        
        <TabsContent value="scheduler" className="space-y-4">
          <SchedulerDashboard />
        </TabsContent>

        <TabsContent value="api-settings" className="space-y-4">
          <ApiSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
