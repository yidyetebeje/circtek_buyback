"use client";

import React, { useEffect, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Path } from "react-hook-form";

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
import { useBrands } from '@/hooks/catalog/useBrands';
import { useCategories } from '@/hooks/catalog/useCategories';
import { useModelSeries } from '@/hooks/catalog/useModelSeries';
import { useDeviceQuestionSets } from '@/hooks/catalog/useDeviceQuestionSets';
import { ImageUpload } from '@/components/admin/image-upload';
import { TipTapEditor } from '@/components/ui/tiptap-editor';
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge";

// List of diagnostic tests that can influence the price
const DIAGNOSTIC_TESTS = [
  "Locked",
  "Panic log",
  "Gyroscope",
  "Accelerometer",
  "Proximity",
  "Compass",
  "Barometer",
  "Apple Pay (NFC) Module",
  "WiFi Module",
  "Bluetooth Module",
  "Location Co-Processor (Rose)",
  "Vibrator Module (Taptic Engine)",
  "Display Multi-Touch Module",
  "Ambient Light Sensor",
  "Face ID",
  "Baseband",
  "Back camera",
  "Back super wide camera",
  "Telephoto camera",
  "Front camera",
  "LiDAR"
] as const;

const modelFormSchema = z.object({
  title: z.string().trim().min(1, { message: "Model name is required." }).max(255, { message: "Model name must be 255 characters or less." }),
  category_id: z.string().min(1, { message: "Category is required." }),
  brand_id: z.string().min(1, { message: "Brand is required." }),
  series_id: z.string().optional(), // Optional series ID
  base_price: z.string().min(1, { message: "Base price is required." }).refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: "Base price must be a positive number." }
  ),
  image: z.string().min(1, { message: "Image is required." }), // Image URL
  description: z.string().trim().optional(),
  specifications: z.string().trim().optional(), // JSON stringified specifications
  // SEO fields
  seo_title: z.string().trim().optional(),
  seo_description: z.string().trim().optional(),
  seo_keywords: z.string().trim().max(255).optional(),
  // Update questionSetIds to be optional without a default in the schema itself.
  // The default to an empty array is handled by react-hook-form's defaultValues.
  questionSetIds: z.array(z.string()).optional(),
  priceDrops: z.array(z.object({
    testName: z.string(),
    priceDrop: z.string().refine((val) => {
      if (val === '') return true; // treat empty as zero
      return !isNaN(parseFloat(val)) && parseFloat(val) >= 0;
    }, {
      message: "Price drop must be a valid non-negative number"
    })
  })).optional()
});

// Export the type derived from the schema
// Now, ModelFormValues will have questionSetIds?: string[] | undefined
export type ModelFormValues = z.infer<typeof modelFormSchema> & {
  id?: string; // Optional ID for editing existing models
};

interface ModelFormProps {
  initialData?: Partial<ModelFormValues>;
  onSubmit: (values: ModelFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onFileSelect: (file: File | null) => void;
}

export function ModelForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  onFileSelect,
}: ModelFormProps) {
  // Prepare default values, ensuring questionSetIds is always string[]
  const preparedDefaultValues: ModelFormValues = {
    title: initialData?.title || '',
    category_id: initialData?.category_id || '',
    brand_id: initialData?.brand_id || '',
    series_id: initialData?.series_id || '', // Optional fields default to empty string or as needed
    base_price: initialData?.base_price || '',
    image: initialData?.image || '',
    description: initialData?.description || '',
    specifications: initialData?.specifications || '',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    seo_keywords: initialData?.seo_keywords || '',
    questionSetIds: initialData?.questionSetIds || [], // Ensure it's always string[]
    priceDrops: DIAGNOSTIC_TESTS.map(testName => {
      const savedDrop = initialData?.priceDrops?.find(pd => pd.testName === testName);
      return {
        testName: testName,
        priceDrop: savedDrop ? savedDrop.priceDrop : ''
      };
    }),
    ...(initialData?.id && { id: initialData.id }), // Conditionally add id
  };

  // Log initial data and prepared defaults



  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: preparedDefaultValues,
  });

  // Reset the form if initialData changes, ensuring async loaded defaults are applied
  // form.reset should be stable, initialData is the key dependency

  // Log form's initial questionSetIds value after initialization or reset
  useEffect(() => {

  }, [form, initialData]); // Re-log if form or initialData changes

  // State for image management
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.image || null);

  // State for comboboxes
  const [openSeriesCombobox, setOpenSeriesCombobox] = React.useState(false);
  const [openBrandCombobox, setOpenBrandCombobox] = React.useState(false);
  const [openCategoryCombobox, setOpenCategoryCombobox] = React.useState(false);

  // Fetch required data for dropdowns
  const { data: brandsResponse } = useBrands();
  const { data: categoriesResponse } = useCategories();
  const { data: seriesResponse, isLoading: isLoadingSeries } = useModelSeries({});
  // Fetch available question sets
  const { data: questionSetsResponse, isLoading: isLoadingQuestionSets } = useDeviceQuestionSets({ limit: 1000 });

  // Extract data arrays
  const brands = brandsResponse?.data ?? [];
  const categories = categoriesResponse?.data ?? [];
  const modelSeries = seriesResponse?.data ?? [];
  const availableQuestionSets = questionSetsResponse?.data ?? [];

  /**
   * Reset the form only when `initialData` changes.
   * Including `availableQuestionSets` in the dependency list was causing this
   * effect to run on every render because React Query returns a new array
   * reference on every state update. That, in turn, called `form.reset`, which
   * triggered another render → new array reference → infinite loop ⇒
   * "Maximum update depth exceeded".
   */
  useEffect(() => {

    form.reset(preparedDefaultValues);
  }, [initialData]);

  /**
   * When creating a new model, this effect pre-selects all available question sets by default.
   * It is specifically gated to run only when `initialData.id` is not present,
   * ensuring it doesn't overwrite user selections on the edit page.
   */
  useEffect(() => {
    // Only pre-populate for new models, which won't have an initialData.id.
    if (initialData?.id) {
      return;
    }

    const currentQsIds = form.getValues("questionSetIds") || [];
    // If we have sets to choose from and none are selected yet, select them all.
    if (availableQuestionSets.length > 0 && currentQsIds.length === 0) {
      form.setValue(
        "questionSetIds",
        availableQuestionSets.map((qs) => String(qs.id)),
        { shouldValidate: true, shouldDirty: true }
      );
    }
  }, [availableQuestionSets, initialData, form]);

  // Keep form value in sync with image URL state
  useEffect(() => {
    form.setValue('image', imageUrl || '');
  }, [imageUrl, form]);

  // Handle image upload - make async and return Promise<string>
  const handleImageUpload = async (file: File | null): Promise<string> => {
    if (!file) {
      onFileSelect(null); // Notify parent if file is deselected via component
      return Promise.resolve(''); // Return empty promise
    }

    onFileSelect(file); // Pass the file to the parent
    const tempUrl = URL.createObjectURL(file);
    setImageUrl(tempUrl); // Update preview
    return Promise.resolve(tempUrl);
  };

  // Handle image removal
  const handleImageRemove = () => {
    setImageUrl(null);
    form.setValue('image', '');
    onFileSelect(null); // Notify parent that the image was removed
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.handleSubmit(onSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="font-medium">Category</FormLabel>
                  <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCategoryCombobox}
                          className={cn(
                            "w-full justify-between border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading} // Apply disabled state here
                        >
                          {field.value
                            ? categories.find((category) => String(category.id) === field.value)?.title
                            : "Select category"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command filter={(value, search) => {
                        if (!search) return 1;
                        const category = categories.find(c => String(c.id) === value || c.title.toLowerCase() === value.toLowerCase());
                        return category?.title.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="Search category..." />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                key={category.id}
                                value={category.title} // Use title for display and searching
                                onSelect={(currentValue) => {
                                  const selectedCategory = categories.find(c => c.title.toLowerCase() === currentValue.toLowerCase());
                                  const newValue = selectedCategory ? String(selectedCategory.id) : "";
                                  form.setValue("category_id", newValue === field.value ? "" : newValue);
                                  setOpenCategoryCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === String(category.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {category.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the category for this model.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="font-medium">Brand</FormLabel>
                  <Popover open={openBrandCombobox} onOpenChange={setOpenBrandCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openBrandCombobox}
                          className={cn(
                            "w-full justify-between border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading} // Apply disabled state here
                        >
                          {field.value
                            ? brands.find((brand) => String(brand.id) === field.value)?.title
                            : "Select brand"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command filter={(value, search) => {
                        if (!search) return 1;
                        const brand = brands.find(b => String(b.id) === value || b.title.toLowerCase() === value.toLowerCase());
                        return brand?.title.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="Search brand..." />
                        <CommandList>
                          <CommandEmpty>No brand found.</CommandEmpty>
                          <CommandGroup>
                            {brands.map((brand) => (
                              <CommandItem
                                key={brand.id}
                                value={brand.title} // Use title for display and searching
                                onSelect={(currentValue) => {
                                  const selectedBrand = brands.find(b => b.title.toLowerCase() === currentValue.toLowerCase());
                                  const newValue = selectedBrand ? String(selectedBrand.id) : "";
                                  form.setValue("brand_id", newValue === field.value ? "" : newValue);
                                  // Reset series if brand changes? (Decided against this, series are independent now)
                                  // form.setValue("series_id", "");
                                  setOpenBrandCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === String(brand.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {brand.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the brand for this model.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="series_id"
              render={({ field }) => (
                <FormItem className="flex flex-col"> {/* Use flex-col for spacing */}
                  <FormLabel className="font-medium">Model Series (Optional)</FormLabel>
                  <Popover open={openSeriesCombobox} onOpenChange={setOpenSeriesCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openSeriesCombobox}
                          className={cn(
                            "w-full justify-between border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading || isLoadingSeries} // Apply disabled state here
                        >
                          {field.value
                            ? modelSeries.find(
                              (series) => String(series.id) === field.value
                            )?.title
                            : "Select model series"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command filter={(value, search) => {
                        // Custom filter function for better matching (case-insensitive)
                        if (!search) return 1; // Show all if no search
                        const series = modelSeries.find(s => String(s.id) === value || s.title.toLowerCase() === value.toLowerCase());
                        return series?.title.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="Search model series..." />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingSeries ? "Loading series..." : "No model series found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {modelSeries.map((series) => (
                              <CommandItem
                                key={series.id}
                                value={series.title} // Use title for display and searching
                                onSelect={(currentValue) => {
                                  // Find the series by title to get the ID
                                  const selectedSeries = modelSeries.find(s => s.title.toLowerCase() === currentValue.toLowerCase());
                                  const newValue = selectedSeries ? String(selectedSeries.id) : "";
                                  // Use form.setValue to update
                                  form.setValue("series_id", newValue === field.value ? "" : newValue);
                                  setOpenSeriesCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === String(series.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {series.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the model series for this model.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., iPhone 15 Pro Max"
                      {...field}
                      disabled={isLoading}
                      className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-muted-foreground">Base Price *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g., 699.99"
                      {...field}
                      disabled={isLoading}
                      className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Enter the base price for this model.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem>
                  <FormLabel className="font-medium">Model Image <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <ImageUpload
                      initialImage={imageUrl}
                      onImageUpload={handleImageUpload}
                      onImageRemove={handleImageRemove}
                      disabled={isLoading} // Disable only based on general form loading
                    />
                  </FormControl>
                  <FormDescription>
                    Upload the main image for this device model. Required.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <FormField
              control={form.control}
              name="seo_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">SEO Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SEO Title"
                      {...field}
                      disabled={isLoading}
                      className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
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
                  <FormLabel className="font-medium">SEO Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Comma-separated keywords"
                      {...field}
                      disabled={isLoading}
                      className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seo_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">SEO Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="SEO Description"
                      {...field}
                      disabled={isLoading}
                      className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Description (Optional)</FormLabel>
                <FormControl>
                  <TipTapEditor
                    content={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Add a detailed description of the model..."
                    disabled={isLoading}
                    minHeight="150px"
                    className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Specifications (JSON Format - Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='e.g., { "Screen Size": "6.7 inches", "Camera": "48MP Main" }'
                    {...field}
                    disabled={isLoading}
                    rows={5}
                    className="font-mono border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                  />
                </FormControl>
                <FormDescription>
                  Enter specifications as a valid JSON object.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price Drop per Failed Test Section */}
        <div className="space-y-4 pt-4 mt-6 border-t">
          <h3 className="text-lg font-medium">Price Deductions for Failed Diagnostic Tests</h3>
          <FormDescription>
            Specify the amount (in €) to deduct from the base price when each corresponding diagnostic test fails.
          </FormDescription>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DIAGNOSTIC_TESTS.map((test, index) => (
              <FormField
                key={test}
                control={form.control}
                name={`priceDrops.${index}.priceDrop` as Path<ModelFormValues>}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-sm">{test}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value as string}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={isLoading}
                        className="border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {/* Question Set Assignment Section */}
        <div className="space-y-2 pt-4 mt-6 border-t">
          <h3 className="text-lg font-medium">Assign Question Sets</h3>
          <FormDescription>
            Select question sets to be asked when on buyback website when the user want to sell the model.
          </FormDescription>
          <FormField
            control={form.control}
            name="questionSetIds"
            render={({ field }) => {
              // Log field value for questionSetIds whenever it renders/changes


              return (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200",
                            !field.value?.length && "text-muted-foreground"
                          )}
                          disabled={isLoading || isLoadingQuestionSets}
                        >
                          {field.value && field.value.length > 0
                            ? `${field.value.length} selected`
                            : "Select question sets"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command>
                        <CommandInput placeholder="Search question sets..." />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingQuestionSets ? "Loading question sets..." : "No question sets found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {availableQuestionSets.map((qs) => {
                              const isSelected = field.value?.includes(String(qs.id));
                              return (
                                <CommandItem
                                  key={qs.id}
                                  value={`${qs.displayName} ${qs.internalName} ${qs.id}`} // Enhanced search value
                                  onSelect={() => {
                                    const currentValues = field.value || [];
                                    if (isSelected) {
                                      field.onChange(
                                        currentValues.filter(
                                          (value) => value !== String(qs.id)
                                        )
                                      );
                                    } else {
                                      field.onChange([...currentValues, String(qs.id)]);
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {qs.displayName} ({qs.internalName})
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    You can select multiple question sets.
                  </FormDescription>
                  {/* Optional: Display selected items as Badges for better UX */}
                  {field.value && field.value.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1">
                      {field.value.map((qsId) => {
                        const questionSet = availableQuestionSets.find(qs => String(qs.id) === qsId);
                        return (
                          <Badge
                            variant="secondary"
                            key={qsId}
                            className="flex items-center gap-1"
                          >
                            {questionSet ? `${questionSet.displayName} (${questionSet.internalName})` : `ID: ${qsId}`}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                              onClick={() => {
                                field.onChange(
                                  (field.value || []).filter(
                                    (value) => value !== qsId
                                  )
                                );
                              }}
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : (initialData ? "Update Model" : "Create Model")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
