"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ImageUpload } from '@/components/admin/image-upload';
import { Loader2 } from 'lucide-react';

// Define shop form schema
const shopFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Shop name is required and cannot be empty." })
    .max(255, { message: "Shop name must be 255 characters or less." }),
  organization: z.string()
    .trim()
    .min(1, { message: "Organization name is required and cannot be empty." })
    .max(255, { message: "Organization name must be 255 characters or less." }),
  phone: z.string()
    .trim()
    .min(1, { message: "Phone number is required and cannot be empty." })
    .max(255, { message: "Phone number must be 255 characters or less." })
    .refine((val) => {
      // Basic phone validation - at least 10 digits with possible formatting
      const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){10,}$/;
      return phoneRegex.test(val);
    }, { message: "Please enter a valid phone number (at least 10 digits)" }),
  logo: z.string().max(255, { message: "Logo URL must be 255 characters or less." }),
  active: z.boolean().optional(),
});

// Export the type derived from the schema
export type ShopFormValues = z.infer<typeof shopFormSchema>;

interface ShopFormProps {
  initialData?: Partial<ShopFormValues & { id?: number }>;
  onSubmit: (values: ShopFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onLogoUpload: (file: File) => Promise<string>;
  onLogoRemove?: () => void;
}

export function ShopForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  onLogoUpload,
  onLogoRemove,
}: ShopFormProps) {
  if(initialData){
    initialData.active = initialData.active ? true : false;
  }
  console.log(initialData);
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      organization: initialData?.organization || '',
      phone: initialData?.phone || '',
      logo: initialData?.logo || '',
      active: initialData?.active ?? true,
    }
  });

  // State for images
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialData?.logo || null
  );


  // Handle logo upload
  const handleLogoUpload = async (file: File): Promise<string> => {
    const tempUrl = URL.createObjectURL(file);
    setLogoUrl(tempUrl);
    try {
      // In a real implementation, you would upload the file to the server here
      await onLogoUpload(file);
      // The form value gets set via form.setValue in useEffect below
      return tempUrl;
    } catch (error) {
      console.error("Logo upload error:", error);
      setLogoUrl(null);
      return Promise.reject("Failed to upload logo");
    }
  };

  // Handle logo removal
  const handleLogoRemove = () => {
    setLogoUrl(null);
    if (onLogoRemove) onLogoRemove();
    form.setValue('logo', '');
  };

  // Update form value for logo when URL changes
  React.useEffect(() => {
    form.setValue('logo', logoUrl || '');
  }, [logoUrl, form]);

  const onFormSubmit = form.handleSubmit(
    (values) => {
      console.log("Validation passed, submitting:", values);
      onSubmit(values);
    },
    (errors) => {
      console.error("Form validation failed:", errors);
    }
  );

  return (
    <Form {...form}>
      <form onSubmit={onFormSubmit} className="space-y-6">
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Shop Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., My Shop" 
                      {...field} 
                      disabled={isLoading} 
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Organization *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Company Inc." 
                      {...field} 
                      disabled={isLoading} 
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Client ID and Owner ID fields removed as they are auto-set on creation */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Phone Number *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., +1 (123) 456-7890" 
                      {...field} 
                      disabled={isLoading} 
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-col xs:flex-row xs:items-start justify-between rounded-lg border p-4 shadow-sm gap-3 xs:gap-4">
                  <div className="space-y-1">
                    <FormLabel className="font-medium text-muted-foreground">Active Status</FormLabel>
                    <FormDescription className="text-xs text-gray-500">
                      Whether this shop is active and visible to users
                    </FormDescription>
                  </div>
                  <FormControl>
                    <div className="flex items-center space-x-2 xs:mt-1">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              control={form.control}
              name="logo"
              render={() => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Shop Logo {!initialData?.id && <span className="text-red-500">*</span>}</FormLabel>
                  <FormControl>
                    <ImageUpload 
                      initialImage={logoUrl}
                      onImageUpload={handleLogoUpload}
                      onImageRemove={handleLogoRemove} 
                      disabled={isLoading}
                      aspectRatio="square"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500 mt-2">
                    Upload a logo for the shop (recommended size: 512x512px)
                    {!initialData?.id && <span className="text-red-500"> - Required for new shops</span>}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shop Icon field removed */}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Saving..." : (initialData?.id ? "Update Shop" : "Create Shop")}
          </Button>
        </div>
      </form>
    </Form>
  );
} 