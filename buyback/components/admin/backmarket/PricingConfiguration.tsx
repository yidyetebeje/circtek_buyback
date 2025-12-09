"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { backMarketService, PricingParameters } from "@/lib/api/backMarketService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Search, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function PricingConfiguration() {
  const [sku, setSku] = useState("");
  const [openSku, setOpenSku] = useState(false);
  const [grade, setGrade] = useState("12"); // Default to Good (12)
  const [country, setCountry] = useState("nl-nl"); // Default to NL
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Fetch listings to populate SKU dropdown
  const { data: listingsData } = useQuery({
    queryKey: ['backmarket-listings-all'],
    queryFn: () => backMarketService.getListings({ page: 1, limit: 1000 }),
  });

  const skus = listingsData?.results?.map(l => l.sku).filter((v, i, a) => a.indexOf(v) === i) || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['backmarket-params', sku, grade, country],
    queryFn: () => backMarketService.getParameters(sku, parseInt(grade), country),
    enabled: false, // Don't fetch automatically
  });

  const updateMutation = useMutation({
    mutationFn: backMarketService.updateParameters,
    onSuccess: () => {
      toast.success("Parameters updated successfully");
    },
    onError: () => {
      toast.error("Failed to update parameters");
    }
  });

  const handleSearch = () => {
    if (!sku) {
      toast.error("Please enter a SKU");
      return;
    }
    setSearchTriggered(true);
    refetch();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const params: PricingParameters = {
      sku,
      grade: parseInt(grade),
      country_code: country,
      c_refurb: formData.get('c_refurb') as string,
      c_op: formData.get('c_op') as string,
      c_risk: formData.get('c_risk') as string,
      m_target: formData.get('m_target') as string,
      f_bm: formData.get('f_bm') as string,
      price_step: formData.get('price_step') as string,
      min_price: formData.get('min_price') as string,
      max_price: formData.get('max_price') as string,
      triggerReprice: formData.get('triggerReprice') === 'on',
    };

    updateMutation.mutate(params);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Configuration</CardTitle>
          <CardDescription>Find pricing parameters for a specific product.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Popover open={openSku} onOpenChange={setOpenSku}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSku}
                    className="w-full justify-between"
                  >
                    {sku ? sku : "Select SKU..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search SKU..." />
                    <CommandList>
                      <CommandEmpty>No SKU found.</CommandEmpty>
                      <CommandGroup>
                        {skus.map((s) => (
                          <CommandItem
                            key={s}
                            value={s}
                            onSelect={(currentValue) => {
                              setSku(currentValue === sku ? "" : currentValue);
                              setOpenSku(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                sku === s ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-[150px] items-center gap-1.5">
              <Label htmlFor="grade">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Mint (10)</SelectItem>
                  <SelectItem value="11">Very Good (11)</SelectItem>
                  <SelectItem value="12">Good (12)</SelectItem>
                  <SelectItem value="14">Fair (14)</SelectItem>
                  <SelectItem value="15">Stallone (15)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full max-w-[150px] items-center gap-1.5">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl-nl">Netherlands</SelectItem>
                  <SelectItem value="de-de">Germany</SelectItem>
                  <SelectItem value="fr-fr">France</SelectItem>
                  <SelectItem value="es-es">Spain</SelectItem>
                  <SelectItem value="it-it">Italy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchTriggered && data && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Parameters</CardTitle>
            <CardDescription>
              Update pricing logic for {sku} (Grade {grade}, {country})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c_refurb">Refurbishment Cost (c_refurb)</Label>
                  <Input 
                    id="c_refurb" 
                    name="c_refurb" 
                    defaultValue={data.data?.c_refurb || "0"} 
                    type="number" 
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c_op">Operational Cost (c_op)</Label>
                  <Input 
                    id="c_op" 
                    name="c_op" 
                    defaultValue={data.data?.c_op || "0"} 
                    type="number" 
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c_risk">Risk Cost (c_risk)</Label>
                  <Input 
                    id="c_risk" 
                    name="c_risk" 
                    defaultValue={data.data?.c_risk || "0"} 
                    type="number" 
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m_target">Target Margin (e.g. 0.15 for 15%)</Label>
                  <Input 
                    id="m_target" 
                    name="m_target" 
                    defaultValue={data.data?.m_target || "0"} 
                    type="number" 
                    step="0.0001"
                  />
                  <p className="text-xs text-gray-500">Used for calculating fallback max price</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f_bm">Back Market Fee (f_bm)</Label>
                  <Input 
                    id="f_bm" 
                    name="f_bm" 
                    defaultValue={data.data?.f_bm || "0"} 
                    type="number" 
                    step="0.01"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-4">Strategy Settings (Overcut)</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="price_step">Overcut Amount</Label>
                        <Input 
                            id="price_step" 
                            name="price_step" 
                            defaultValue={data.data?.price_step || "1.00"} 
                            type="number" 
                            step="0.01"
                        />
                        <p className="text-xs text-gray-500">Amount to pay ABOVE competitor</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="min_price">Min Price (Lower Bound)</Label>
                        <Input 
                            id="min_price" 
                            name="min_price" 
                            defaultValue={data.data?.min_price || "0"} 
                            type="number" 
                            step="0.01"
                        />
                        <p className="text-xs text-gray-500">Minimum offer amount</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="max_price">Max Price (Upper Bound)</Label>
                        <Input 
                            id="max_price" 
                            name="max_price" 
                            defaultValue={data.data?.max_price || "0"} 
                            type="number" 
                            step="0.01"
                        />
                        <p className="text-xs text-gray-500">Maximum offer amount (Ceiling)</p>
                    </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="triggerReprice" name="triggerReprice" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                <Label htmlFor="triggerReprice">Trigger Repricing Immediately</Label>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {searchTriggered && !isLoading && !data?.data && (
        <div className="text-center p-8 text-gray-500">
          No parameters found for this combination. You can create them by saving.
        </div>
      )}
    </div>
  );
}
