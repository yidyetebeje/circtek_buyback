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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  console.log(initialData);
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      organization: initialData?.organization || '',
      phone: initialData?.phone || '',
      logo: initialData?.logo || '',

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
        <div className="grid gap-8">
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Basic details about the shop.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Downtown Electronics" {...field} disabled={isLoading} />
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
                          <FormLabel>Organization</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., CircTek BV" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="max-w-[50%]">
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+31 6 12345678" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>
                    Upload the shop's logo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="logo"
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            initialImage={logoUrl}
                            onImageUpload={handleLogoUpload}
                            onImageRemove={handleLogoRemove}
                            disabled={isLoading}
                            aspectRatio="wide"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Recommended size: 512x512px.
                          {!initialData?.id && <span className="text-red-500 block">Required for new shops.</span>}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
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