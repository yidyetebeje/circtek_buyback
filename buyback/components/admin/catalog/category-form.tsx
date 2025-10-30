"use client";

import React from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";

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
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/image-upload";
import { TipTapEditor } from "@/components/ui/tiptap-editor";

// Define the Zod schema for category form validation
const formSchema = z.object({
  title: z.string().trim().min(2, { message: "Title must be at least 2 characters." }).max(255, { message: "Title must be 255 characters or less." }),
  description: z.string().trim().optional(),
  icon: z.string().min(1, { message: "Icon is required." }),
  seo_title: z.string().trim().optional(),
  seo_description: z.string().trim().optional(),
  seo_keywords: z.string().trim().optional(),
});

export type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  initialData?: Partial<CategoryFormValues>; // For editing existing category
  onSubmit: (values: CategoryFormValues) => void; // Callback on successful submit
  onCancel: () => void; // Callback for cancel action
  isLoading?: boolean; // To disable form during submission
  onFileSelect: (file: File | null) => void; // Callback for file selection
}

export function CategoryForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  onFileSelect,
}: CategoryFormProps) {
  // Store the originally provided icon URL for display
  const initialIconUrl = initialData?.icon;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      icon: initialData?.icon || "",
      seo_title: initialData?.seo_title || "",
      seo_description: initialData?.seo_description || "",
      seo_keywords: initialData?.seo_keywords || "",
    },
  });

  const handleSubmit = (values: CategoryFormValues) => {
   
    if (!values.icon && initialIconUrl) {
      values.icon = initialIconUrl;
    }
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Consolidated Information Section */}
        <div className="py-6">
          <div className="grid gap-6">
            {/* First Row: Title and Icon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <FormField
                control={form.control}
                name="title"
                render={({ field }: { field: ControllerRenderProps<CategoryFormValues, "title"> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Smartphones"
                        {...field}
                        disabled={isLoading}
                        className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      The main name of the category (default language).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-medium block">Category Icon</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="h-[100px] w-full mx-auto md:mx-0">
                          <ImageUpload
                            // Use initialIconUrl from props for display
                            initialImage={initialIconUrl}
                            // Call onFileSelect prop and update form for validation only
                            onImageUpload={async (file) => {
                              onFileSelect(file);
                              const tempUrl = URL.createObjectURL(file); // Create temp URL for preview
                              field.onChange(tempUrl); // Set value for validation
                              return tempUrl;
                            }}
                            // Call onFileSelect prop with null
                            onImageRemove={() => {
                              onFileSelect(null);
                              field.onChange(""); // Clear value for validation
                            }}
                            disabled={isLoading} // Only disable based on overall form loading state
                            aspectRatio="square" // Categories usually have square icons
                          />
                        </div>
                       
                      </div>
                     
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Second Row: SEO Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <FormField
                control={form.control}
                name="seo_title"
                render={({ field }: { field: ControllerRenderProps<CategoryFormValues, "seo_title"> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">SEO Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SEO optimized title"
                        {...field}
                        value={field.value ?? ""}
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
                name="seo_keywords"
                render={({ field }: { field: ControllerRenderProps<CategoryFormValues, "seo_keywords"> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">SEO Keywords</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="keyword1, keyword2, keyword3"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLoading}
                        className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Comma-separated keywords.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seo_description"
                render={({ field }: { field: ControllerRenderProps<CategoryFormValues, "seo_description"> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">SEO Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="SEO optimized description"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isLoading}
                        className="min-h-[100px] border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description Field Moved Last */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }: { field: ControllerRenderProps<CategoryFormValues, "description"> }) => (
                <FormItem>
                  <FormLabel className="font-medium">Description (Optional)</FormLabel>
                  <FormControl>
                    <TipTapEditor
                      content={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Add a description for this category..."
                      disabled={isLoading}
                      minHeight="150px"
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : (initialData ? "Save Changes" : "Create Category")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
