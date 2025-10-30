"use client";
import React, { useState, useEffect } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import { toast } from "sonner";
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
import { useUploadBrandLogo } from "@/hooks/catalog/useBrands"; // Import the upload hook

// Define the Zod schema for brand form validation
// Adjust fields based on the Brand model requirements
const brandFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required." })
    .max(255, { message: "Title must be 255 characters or less." }),
  description: z.string().optional(),
  logo: z.string().optional(), // URL or blob URL
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
});

// Export the type
export type BrandFormValues = z.infer<typeof brandFormSchema>;

interface BrandFormProps {
  initialData?: Partial<BrandFormValues> & { id?: number }; // Add numeric ID
  brandId?: number; // Add brandId prop specifically for editing
  onSubmit: (values: BrandFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  // Keep onFileSelect for create mode
  onFileSelect?: (file: File | null) => void;
}

export function BrandForm({ 
  initialData,
  brandId, // Destructure brandId
  onSubmit, 
  onCancel, 
  isLoading, 
  onFileSelect 
}: BrandFormProps) {
  console.log(brandId, "brand id")
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initialData?.logo || null);

  const { mutate: uploadLogo, isPending: isUploadingLogo } = useUploadBrandLogo();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      logo: '', // Initialize logo field
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
    },
  });

  // Update form and preview when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        logo: initialData.logo || '' // Ensure logo field is set
      });
      setLogoPreviewUrl(initialData.logo || null);
    } else {
      form.reset({
        title: '',
        description: '',
        logo: '',
        seo_title: '',
        seo_description: '',
        seo_keywords: '',
      });
      setLogoPreviewUrl(null);
    }
  }, [initialData, form]);

  // Function called by ImageUpload when a file is selected
  const handleFileSelectAndPreview = async (file: File): Promise<string> => {
    if (!file) return '';

    const objectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(objectUrl); // Set preview immediately
    form.setValue('logo', objectUrl); // Update form for preview temporarily

    if (brandId) { // EDIT MODE: Upload immediately
      onFileSelect?.(null); // Ensure parent knows file is handled
      
      return new Promise((resolve, reject) => {
        uploadLogo({ brandId, file }, {
          onSuccess: (data) => {
            console.log("data", data);
            const actualUrl = data.data?.iconUrl;
            if (actualUrl) {
              console.log("Upload successful, Server URL:", actualUrl);
              setLogoPreviewUrl(actualUrl); // Update preview with actual URL
              form.setValue('logo', actualUrl); // Update form value with actual URL
              if (objectUrl) URL.revokeObjectURL(objectUrl); // Clean up blob URL
              toast.success("Brand logo uploaded successfully.");
              resolve(actualUrl);
            } else {
              console.error("Upload succeeded but no URL returned");
              toast.error('Upload completed but failed to get logo URL.');
              if (objectUrl) URL.revokeObjectURL(objectUrl); // Clean up blob URL
              setLogoPreviewUrl(initialData?.logo || null); // Revert preview
              form.setValue('logo', initialData?.logo || ''); // Revert form
              reject(new Error("No URL returned from server"));
            }
          },
          onError: (error) => {
            console.error('Error uploading brand logo:', error);
            toast.error(`Failed to upload brand logo: ${error.message}`);
            if (objectUrl) URL.revokeObjectURL(objectUrl); // Clean up blob URL
            setLogoPreviewUrl(initialData?.logo || null); // Revert preview on error
            form.setValue('logo', initialData?.logo || ''); // Revert form value
            reject(error);
          }
        });
      });

    } else { // CREATE MODE: Just update state and notify parent
      onFileSelect?.(file);
      console.log('Create mode: Passing file up, using object URL for preview:', objectUrl);
      return Promise.resolve(objectUrl); // Return blob URL for immediate preview in ImageUpload
    }
  };
  
  // Function called by ImageUpload when the image is removed
  const handleFileRemove = () => {
    console.log('Removing image');
    if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoPreviewUrl(null);
    form.setValue('logo', '');

    if (brandId) { // EDIT MODE: Need to potentially update the brand to remove logo
      console.log("Edit mode: Image removed. Parent onSubmit should handle update.");
      form.setValue('logo', ''); // Ensure form value is cleared
    } else { // CREATE MODE: Notify parent
      onFileSelect?.(null);
    }
  };

  // Handle final form submission (text fields mainly)
  const handleFormSubmit = (values: BrandFormValues) => {
    console.log('Submitting form values:', values);
    // In edit mode, logo URL should already be the actual server URL if changed.
    // In create mode, parent component handles the file via onFileSelect.
    onSubmit(values);
  };

  const effectiveIsLoading = isLoading || isUploadingLogo;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Consolidated Information Section */}
        <div className="py-6">
        
          
          <div className="grid gap-6">
            {/* First Row: Title and Logo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <FormField
                control={form.control}
                name="title"
                render={({ field }: { field: ControllerRenderProps<BrandFormValues, 'title'> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Title*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter brand title (e.g., Apple)" 
                        {...field} 
                        className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        disabled={effectiveIsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="font-medium">Brand Logo*</FormLabel>
                <FormControl>
                  <div className="h-[100px] w-full mx-auto md:mx-0">
                    <ImageUpload
                      initialImage={logoPreviewUrl} // Display preview URL
                      disabled={effectiveIsLoading} // Disable based on combined loading state
                      onImageUpload={handleFileSelectAndPreview} // Handles selection and upload (in edit mode)
                      onImageRemove={handleFileRemove}          // Handles removal
                      aspectRatio="square" 
                      maxSizeMB={5}       
                    />
                  </div>
                </FormControl>
                {/* Optional: Add FormMessage here if you want to show form-level errors for the logo */}
                {/* <FormMessage>{form.formState.errors.logo?.message}</FormMessage> */}
              </FormItem>
            </div>

            {/* Second Row: SEO Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <FormField
                control={form.control}
                name="seo_title"
                render={({ field }: { field: ControllerRenderProps<BrandFormValues, 'seo_title'> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">SEO Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter SEO title" 
                        {...field} 
                        className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        disabled={effectiveIsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seo_keywords"
                render={({ field }: { field: ControllerRenderProps<BrandFormValues, 'seo_keywords'> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">SEO Keywords</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="keyword1, keyword2, keyword3" 
                        {...field} 
                        className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        disabled={effectiveIsLoading}
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
                render={({ field }: { field: ControllerRenderProps<BrandFormValues, 'seo_description'> }) => (
                  <FormItem>
                    <FormLabel className="font-medium">SEO Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter SEO description" 
                        {...field} 
                        className="min-h-[100px] border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                        disabled={effectiveIsLoading}
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
              render={({ field }: { field: ControllerRenderProps<BrandFormValues, 'description'> }) => (
                <FormItem>
                  <FormLabel className="font-medium">Description</FormLabel>
                  <FormControl>
                    <TipTapEditor 
                      content={field.value || ''} 
                      onChange={field.onChange} 
                      disabled={effectiveIsLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={effectiveIsLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={effectiveIsLoading}>
            {effectiveIsLoading ? "Saving..." : (brandId ? "Update Brand" : "Create Brand")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
