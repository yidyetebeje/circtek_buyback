"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Globe, PenSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ModelSeriesForm, ModelSeriesFormValues } from '@/components/admin/catalog/model-series-form';
import { useModelSeriesById, useUpdateModelSeries, useDeleteModelSeries, useModelSeriesTranslations, useUploadModelSeriesImage } from '@/hooks/catalog/useModelSeries';
import { ModelSeries, Language } from '@/types/catalog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TranslationManager, TranslationWithSpecs } from '@/components/admin/catalog/translation-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { languageService } from '@/lib/api/catalog/languageService';
import { modelSeriesService } from '@/lib/api/catalog/modelSeriesService';

export default function ModelSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = parseInt(params.id as string);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);
  
  // Fetch model series data
  const { 
    data: modelSeries,
    isLoading: isLoadingModelSeries,
    isError 
  } = useModelSeriesById(seriesId);
  
  // Fetch model series translations
  const {
    data: translationsData,
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations
  } = useModelSeriesTranslations(seriesId);
  
  // Update and delete mutations
  const { mutateAsync: updateModelSeries } = useUpdateModelSeries(seriesId);
  const deleteModelSeries = useDeleteModelSeries();
  const { mutateAsync: uploadImage } = useUploadModelSeriesImage();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch languages on component mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoadingLanguages(true);
        const response = await languageService.getLanguages(1, 100); // Get all languages
        if (response.data) {
          const languageData = response.data;
          setLanguages(languageData);
          const defaultLang = languageData.find((lang: Language) => lang.is_default === true);
          if (defaultLang) {
            setDefaultLanguage(defaultLang);
          } else if (languageData.length > 0) {
            setDefaultLanguage(languageData[0]); // Fallback to first language
          }
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        toast.error('Failed to load languages');
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    fetchLanguages();
  }, []);
  
  // --- Image Handlers ---
  // This function is passed to ImageUpload. It updates our local file state
  // and returns a temporary URL for preview. The actual upload happens in handleSubmit.
  const handleImageUpload = async (file: File): Promise<string> => {
    setImageFile(file);
    // Return a local object URL for immediate preview
    return URL.createObjectURL(file); 
  };

  const handleImageRemove = () => {
    setImageFile(null);
    // Optionally, if you need to clear the image field in the form immediately:
    // form.setValue('image', ''); // Assuming form is accessible here, might need refactoring
  };

  // Handle saving translations
  const handleSaveTranslations = async (updatedTranslations: TranslationWithSpecs[]) => {
    setIsSaving(true);
    try {
      type TranslationPayload = {
        language_id: number;
        title: string;
        description?: string;
        meta_title?: string;
        meta_description?: string;
        meta_keywords?: string;
      };

      const translationsPayload: TranslationPayload[] = updatedTranslations.map(t => {
        const payload: TranslationPayload = {
          language_id: t.language_id,
          title: t.title,
          description: t.description || '',
          meta_title: t.meta_title || '',
          meta_description: t.meta_description || '',
          meta_keywords: t.meta_keywords || '',
        };
        if (t.description && t.description.trim()) payload.description = t.description;
        if (t.meta_title && t.meta_title.trim()) payload.meta_title = t.meta_title;
        if (t.meta_description && t.meta_description.trim()) payload.meta_description = t.meta_description;
        if (t.meta_keywords && t.meta_keywords.trim()) payload.meta_keywords = t.meta_keywords;
        return payload;
      });

      await modelSeriesService.upsertBulkModelSeriesTranslations(seriesId, translationsPayload);

      await refetchTranslations();
      toast.success('Translations updated successfully');
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error('Failed to save translations');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle form submission for model series update
  const handleSubmit = async (values: ModelSeriesFormValues) => {
    setIsSaving(true);
    try {
      const updatePayload: Partial<Omit<ModelSeries, 'image' | 'brand_id'>> = {
        title: values.name,
        description: values.description || null,
        meta_title: values.seo_title || null,
        meta_description: values.seo_description || null,
        meta_keywords: values.seo_keywords || null,
      };

      // 1. Update series details
      await updateModelSeries(updatePayload);

      // 2. Upload image if needed
      if (imageFile) {
        await uploadImage({ seriesId, file: imageFile });
        setImageFile(null);
      }

      toast.success('Model series updated successfully');
      router.push('/admin/catalog/model-series');
    } catch (error) {
      console.error('Error updating model series:', error);
      toast.error((error as Error).message || 'Error updating model series');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle model series deletion
  const handleDelete = () => {
    setIsDeleting(true);
    deleteModelSeries.mutate(seriesId, {
      onSuccess: () => {
        toast.success('Model series deleted successfully');
        router.push('/admin/catalog/model-series');
      },
      onError: (error: Error) => {
        toast.error(error.message || "An unexpected error occurred while deleting.");
        setIsDeleting(false);
      }
    });
  };

  // Access the actual translations from the API response and map to compatible format
  const translations = (() => {
    const translationList = (translationsData?.data || []).map(translation => ({
      language_id: translation.language_id,
      entity_id: translation.model_series_id,
      title: translation.title,
      description: translation.description || '',
      meta_title: translation.meta_title || '',
      meta_description: translation.meta_description || '',
      meta_keywords: translation.meta_keywords || '',
      specifications: '' // Model series don't have specifications
    })) as TranslationWithSpecs[];

    // Check if there's already a translation for the default language
    const hasDefaultLanguageTranslation = defaultLanguage && 
      translationList.some(t => t.language_id === defaultLanguage.id);

    // If no default language translation exists, use the main model series data as fallback
    if (defaultLanguage && !hasDefaultLanguageTranslation && modelSeries?.data) {
      const modelSeriesData = modelSeries.data;
      const defaultTranslation: TranslationWithSpecs = {
        language_id: defaultLanguage.id,
        entity_id: seriesId,
        title: modelSeriesData.title || '',
        description: modelSeriesData.description || '',
        meta_title: modelSeriesData.meta_title || '',
        meta_description: modelSeriesData.meta_description || '',
        meta_keywords: modelSeriesData.meta_keywords || '',
        specifications: ''
      };
      
      // Add the default translation to the beginning of the list
      translationList.unshift(defaultTranslation);
    }

    return translationList;
  })();
  
  // Combine loading states
  const isPageLoading = isLoadingModelSeries || isLoadingTranslations;

  if (isPageLoading) {
    return (
      <div className="w-full py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading model series data...</span>
      </div>
    );
  }
  
  if (isError || !modelSeries) {
    return (
      <div className="w-full py-10">
        <div className="text-red-500">Failed to load model series. It might have been deleted or you don&apos;t have permission to view it.</div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/catalog/model-series')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Model Series
        </Button>
      </div>
    );
  }
  
  // Map model series data to form values
  const modelSeriesData = modelSeries?.data;
  const initialValues: ModelSeriesFormValues = {
    id: seriesId.toString(), // Add ID for image upload functionality
    name: modelSeriesData?.title || '',
    description: modelSeriesData?.description || '',
    image: modelSeriesData?.image || '', // Add image field
    seo_title: modelSeriesData?.meta_title || '',
    seo_description: modelSeriesData?.meta_description || '',
    seo_keywords: modelSeriesData?.meta_keywords || '',
  };
  
  return (
    <div className="w-full py-10">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/admin/catalog/model-series')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Edit Model Series: {modelSeriesData?.title}</h1>
        </div>
        
        {/* Delete Button with Confirmation Dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Model Series</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the model series
                and may affect related models.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Tabs for form and translations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="edit" className="flex items-center">
            <PenSquare className="w-4 h-4 mr-2" /> Edit Series
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center">
            <Globe className="w-4 h-4 mr-2" /> Translations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit">
          {initialValues && (
            <ModelSeriesForm 
              initialData={initialValues}
              onSubmit={handleSubmit} 
              onCancel={() => router.push('/admin/catalog/model-series')}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              isLoading={isSaving}
            />
          )}
        </TabsContent>
        
        <TabsContent value="translations" className="space-y-4">
          {isLoadingTranslations || isLoadingLanguages ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading translations...</span>
            </div>
          ) : defaultLanguage ? (
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
                      Use the &ldquo;Generate with AI&rdquo; button to automatically translate content from {defaultLanguage.name} to other languages. 
                      The AI will maintain technical accuracy and SEO optimization while adapting the content for each target language.
                    </p>
                  </div>
                </div>
              </div>
              
              <TranslationManager
                entityType="model_series"
                entityId={seriesId}
                defaultLanguage={defaultLanguage}
                availableLanguages={languages}
                initialTranslations={translations}
                onSave={handleSaveTranslations}
                hasSpecifications={false}
                fieldConfig={{
                  title: { label: 'Series Name', type: 'text' },
                  description: { label: 'Description', type: 'textarea' },
                  meta_title: { label: 'SEO Title', type: 'text' },
                  meta_description: { label: 'SEO Description', type: 'textarea' },
                  meta_keywords: { label: 'SEO Keywords', type: 'text' }
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center p-8">
              <span className="text-gray-500">No languages available. Please add languages first.</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
