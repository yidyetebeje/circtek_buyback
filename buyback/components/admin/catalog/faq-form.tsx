"use client";

import React, { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { FAQ, Language } from "@/types/catalog";
import { FAQTranslationManager, FAQTranslation } from "@/components/admin/catalog/faq-translation-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFAQTranslations,
  useUpsertFAQTranslation,
} from "@/hooks/catalog/useFAQs";
import { Loader2, Settings, Globe } from "lucide-react";

// Define the Zod schema for FAQ form validation
const formSchema = z.object({
  question: z.string().trim().min(5, { message: "Question must be at least 5 characters." }),
  answer: z.string().trim().min(10, { message: "Answer must be at least 10 characters." }),
  order_no: z.number().min(0, { message: "Order must be 0 or greater." }).optional(),
  is_published: z.boolean().optional(),
});

export type FAQFormValues = z.infer<typeof formSchema>;

interface FAQFormProps {
  initialData?: Partial<FAQ>;
  onSubmit: (values: FAQFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  faqId?: number;
  availableLanguages: Language[];
  defaultLanguage: Language | null;
  defaultFAQData?: { question: string; answer: string };
}

export function FAQForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  faqId,
  availableLanguages,
  defaultLanguage,
  defaultFAQData,
}: FAQFormProps) {
  const form = useForm<FAQFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: initialData?.question || "",
      answer: initialData?.answer || "",
      order_no: initialData?.order_no || 0,
      is_published: initialData?.is_published || false,
    },
  });

  const [activeTab, setActiveTab] = useState<string>("general");

  const {
    data: translationsResponse,
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations
  } = useFAQTranslations(faqId || 0);

  const upsertFAQTranslation = useUpsertFAQTranslation();

  const handleSubmit = (values: FAQFormValues) => {
    onSubmit(values);
  };

  const handleTranslationSave = async (updatedTranslations: FAQTranslation[]) => {
    if (!faqId) return;
    try {
     
      for (const translation of updatedTranslations) {
        const language = availableLanguages.find(l => l.id === translation.language_id);
        if (!language) {
          toast.error(`Language with ID ${translation.language_id} not found for saving.`);
          console.error(`[FAQForm] Language not found for ID:`, translation.language_id, updatedTranslations);
          continue;
        }

        const payloadToSend = {
          faqId,
          languageId: translation.language_id,
          translation: {
            question: translation.question,
            answer: translation.answer,
          },
        };
       

        await upsertFAQTranslation.mutateAsync(payloadToSend);
      }
      await refetchTranslations();
      toast.success('Translations updated successfully');
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error('Failed to save translations');
    }
  };

  const mappedTranslations: FAQTranslation[] = (translationsResponse?.data || []).map(t => ({
    language_id: t.language_id,
    entity_id: t.faq_id,
    question: t.question,
    answer: t.answer,
  }));

  if (!faqId && activeTab === "translations") {
    setActiveTab("general");
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General Information
          </TabsTrigger>
          {faqId && (
            <TabsTrigger value="translations" disabled={!defaultLanguage || availableLanguages.length === 0}>
              <Globe className="mr-2 h-4 w-4" />
              Translations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="question"
                    render={({ field }: { field: ControllerRenderProps<FAQFormValues, "question"> }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Question</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., How long does shipping take?"
                            {...field}
                            disabled={isLoading || upsertFAQTranslation.isPending}
                            className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          The frequently asked question (in the default language: {defaultLanguage?.name || 'N/A'}).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="answer"
                    render={({ field }: { field: ControllerRenderProps<FAQFormValues, "answer"> }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Answer</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide a detailed answer to the question..."
                            {...field}
                            disabled={isLoading || upsertFAQTranslation.isPending}
                            className="min-h-[120px] border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                            rows={5}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          The answer to the frequently asked question (in the default language: {defaultLanguage?.name || 'N/A'}).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <FormField
                    control={form.control}
                    name="order_no"
                    render={({ field }: { field: ControllerRenderProps<FAQFormValues, "order_no"> }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Display Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            disabled={isLoading || upsertFAQTranslation.isPending}
                            className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Order in which this FAQ appears (0 = first).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_published"
                  render={({ field }: { field: ControllerRenderProps<FAQFormValues, "is_published"> }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">Published</FormLabel>
                        <FormDescription>
                          Make this FAQ visible to customers on the website.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value!}
                          onCheckedChange={field.onChange}
                          disabled={isLoading || upsertFAQTranslation.isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading || upsertFAQTranslation.isPending}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isLoading || upsertFAQTranslation.isPending}>
                  {isLoading ? "Saving..." : initialData?.id ? "Save Changes" : "Create FAQ"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {faqId && (
          <TabsContent value="translations" className="space-y-4">
            {isLoadingTranslations || !defaultLanguage || availableLanguages.length === 0 ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading translation data or languages not available...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Translation Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">AI Translation Available</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Use the &ldquo;Generate with AI&rdquo; button to automatically translate FAQ questions and answers from {defaultLanguage.name} to other languages. 
                        The AI will maintain context and provide natural translations for customer support content.
                      </p>
                    </div>
                  </div>
                </div>
                
                <FAQTranslationManager
                  faqId={faqId}
                  defaultLanguage={defaultLanguage}
                  availableLanguages={availableLanguages}
                  initialTranslations={mappedTranslations}
                  onSave={handleTranslationSave}
                  defaultFAQData={defaultFAQData}
                />
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 