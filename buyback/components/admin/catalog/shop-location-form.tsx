"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrashIcon, PlusCircle, MapPin, Building2 } from 'lucide-react';

// Define phone type
type Phone = {
  id?: number;
  phoneNumber: string;
  phoneType: 'main' | 'mobile' | 'fax' | 'whatsapp';
  isPrimary: boolean;
};

// Define form values type
export type LocationFormValues = {
  name: string;
  address: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  warehouseId?: number | null;
  phones: Phone[];
};

// Create the schema
const locationFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(255, { message: "Name must be 255 characters or less." }),
  address: z.string().trim().min(1, { message: "Address is required" }),
  city: z.string().trim().min(1, { message: "City is required" }),
  state: z.string().trim().nullable(),
  postalCode: z.string().trim().nullable(),
  country: z.string().trim().min(1, { message: "Country is required" }),
  latitude: z.coerce.number({
    required_error: "Latitude is required",
    invalid_type_error: "Latitude must be a number",
  }).min(-90).max(90),
  longitude: z.coerce.number({
    required_error: "Longitude is required",
    invalid_type_error: "Longitude must be a number",
  }).min(-180).max(180),
  description: z.string().trim().nullable(),
  isActive: z.boolean(),
  displayOrder: z.coerce.number(),
  warehouseId: z.coerce.number().nullable().optional(),
  phones: z.array(
    z.object({
      id: z.number().optional(),
      phoneNumber: z.string().trim().min(1, { message: "Phone number is required" }),
      phoneType: z.enum(['main', 'mobile', 'fax', 'whatsapp']),
      isPrimary: z.boolean(),
    })
  ),
});

interface ShopLocationFormProps {
  initialData?: Partial<LocationFormValues>;
  onSubmit: (data: LocationFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ShopLocationForm({ initialData, onSubmit, onCancel, isLoading = false }: ShopLocationFormProps) {
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // Set up the default values
  const defaultValues: LocationFormValues = {
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || null,
    postalCode: initialData?.postalCode || null,
    country: initialData?.country || '',
    latitude: initialData?.latitude || 0,
    longitude: initialData?.longitude || 0,
    description: initialData?.description || null,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    displayOrder: initialData?.displayOrder !== undefined ? initialData.displayOrder : 0,
    warehouseId: initialData?.warehouseId || null,
    phones: initialData?.phones && initialData.phones.length > 0
      ? initialData.phones
      : [{ phoneNumber: '', phoneType: 'main', isPrimary: true }],
  };

  // Initialize form
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues,
  });

  // Setup field array for phone numbers
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phones",
  });

  // Handle getting current coordinates
  const handleGetCurrentLocation = () => {
    setUseCurrentLocation(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
          setUseCurrentLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUseCurrentLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setUseCurrentLocation(false);
    }
  };

  // Handle adding a new phone number
  const handleAddPhone = () => {
    append({
      phoneNumber: '',
      phoneType: 'mobile',
      isPrimary: fields.length === 0 // Make first phone primary by default
    });
  };

  // Handle selecting a phone as primary
  const handleSetPrimary = (index: number) => {
    // Update all phones to not be primary
    fields.forEach((_, i) => {
      form.setValue(`phones.${i}.isPrimary`, i === index);
    });
  };

  const handleFormSubmit: SubmitHandler<LocationFormValues> = (data) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Downtown Store" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this location"
                        className="resize-none h-24"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-4 mt-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Warehouse Info */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 size={16} />
                  <span>A warehouse will be automatically created with this location&apos;s name and description</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Address</h3>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coordinates */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Coordinates</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={useCurrentLocation}
                className="flex items-center gap-2"
              >
                <MapPin size={16} />
                {useCurrentLocation ? "Getting location..." : "Use my location"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude *</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude *</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phone Numbers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Phone Numbers</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPhone}
                className="flex items-center gap-2"
              >
                <PlusCircle size={16} />
                Add Phone
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No phone numbers added. Click &quot;Add Phone&quot; to add one.
              </div>
            ) : (
              fields.map((field, index) => (
                <div key={field.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">Phone #{index + 1}</h4>
                    {field.isPrimary && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-800">Primary</Badge>
                    )}
                    <div className="flex-1"></div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 w-8 p-0 text-red-500"
                      disabled={fields.length === 1}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <FormField
                      control={form.control}
                      name={`phones.${index}.phoneNumber`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-6">
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`phones.${index}.phoneType`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel>Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="main">Main</SelectItem>
                              <SelectItem value="mobile">Mobile</SelectItem>
                              <SelectItem value="fax">Fax</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem className="md:col-span-3 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                        disabled={form.getValues(`phones.${index}.isPrimary`)}
                        className="w-full h-10"
                      >
                        {form.getValues(`phones.${index}.isPrimary`)
                          ? "Primary Number"
                          : "Set as Primary"}
                      </Button>
                    </FormItem>
                  </div>

                  {index < fields.length - 1 && <Separator className="mt-4" />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Location"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 