"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

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

import { ImageUpload } from '@/components/admin/image-upload';
import { TipTapEditor } from '@/components/ui/tiptap-editor';

const modelSeriesFormSchema = z.object({
  id: z.string().optional(), // Optional ID for edit mode
  name: z.string().trim().min(1, { message: "Series name is required." }).max(255, { message: "Series name must be 255 characters or less." }),
  description: z.string().trim().optional(),
  image: z.union([
    z.string().url({ message: "Please provide a valid image URL." }),
    z.instanceof(File),
    z.string().length(0)
  ]).optional(),
  seo_title: z.string().trim().optional(),
  seo_description: z.string().trim().optional(),
  seo_keywords: z.string().trim().optional(),
});

// Export the type derived from the schema
export type ModelSeriesFormValues = z.infer<typeof modelSeriesFormSchema>;

interface ModelSeriesFormProps {
  initialData?: ModelSeriesFormValues;
  onSubmit: (values: ModelSeriesFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  // Use ImageUpload's props
  onImageUpload: (file: File) => Promise<string>; 
  onImageRemove?: () => void; 
}

export function ModelSeriesForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  // Destructure correct props
  onImageUpload,
  onImageRemove,
}: ModelSeriesFormProps) {
  const form = useForm<ModelSeriesFormValues>({
    resolver: zodResolver(modelSeriesFormSchema),
    defaultValues: initialData || { // Set default values for create or edit
      name: '',
      description: '',
      image: '',
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
    },
  });

  const handleSubmit = (values: ModelSeriesFormValues) => {
    console.log("Submitting Model Series Form:", values);
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6">
          {/* Name and Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., iPhone 15 Series" 
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
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Series Image</FormLabel>
                  <FormControl>
                    <div className="min-h-[100px] w-full mx-auto md:mx-0">
                      <ImageUpload
                        initialImage={typeof field.value === 'string' ? field.value : null}
                        onImageUpload={async (file) => {
                          const imageUrl = await onImageUpload(file); 
                          field.onChange(imageUrl);
                          return imageUrl;
                        }} 
                        onImageRemove={() => {
                          if (onImageRemove) {
                            onImageRemove();
                          }
                          field.onChange('');
                        }}
                        disabled={isLoading}
                        aspectRatio="square"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <FormField
              control={form.control}
              name="seo_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">SEO Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="SEO Title" 
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
              name="seo_keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">SEO Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="keyword1, keyword2, keyword3"
                      {...field}
                      disabled={isLoading}
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Comma-separated keywords
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seo_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">SEO Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="SEO Description"
                      {...field}
                      disabled={isLoading}
                      className="min-h-[100px] border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description at the end */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-muted-foreground">Description (Optional)</FormLabel>
                <FormControl>
                  <TipTapEditor
                    content={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Add a description for this model series..."
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
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Series')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
