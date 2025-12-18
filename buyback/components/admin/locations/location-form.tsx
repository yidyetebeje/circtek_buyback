"use client";

import React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Validation schema for a warehouse (location)
const formSchema = z.object({
  warehouseName: z
    .string()
    .trim()
    .min(2, { message: "Location name must be at least 2 characters." })
    .max(255, { message: "Location name must be 255 characters or less." })
    .refine((name) => /[a-zA-Z]/.test(name), {
      message: "Location name must contain at least one letter.",
    }),
  description: z
    .string()
    .trim()
    .max(500, { message: "Description must be 500 characters or less." }),
  status: z.boolean().optional(),
});

export type LocationFormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  initialData?: Partial<LocationFormValues>; // For editing existing
  onSubmit: (values: LocationFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LocationForm({ initialData, onSubmit, onCancel, isLoading }: LocationFormProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouseName: initialData?.warehouseName || "",
      description: initialData?.description || "",
      status: initialData?.status ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="warehouseName"
          render={({ field }: { field: ControllerRenderProps<LocationFormValues, "warehouseName"> }) => (
            <FormItem>
              <FormLabel className="font-medium">Location Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Amsterdam Location"
                  {...field}
                  disabled={isLoading}
                  className="border-gray-300 focus:border-primary focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description for this location..."
                  {...field}
                  disabled={isLoading}
                  className="border-gray-300 focus:border-primary focus:ring-primary/20 min-h-[80px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormLabel className="font-medium">Active</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
} 