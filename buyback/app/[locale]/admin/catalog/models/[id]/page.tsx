"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Settings, Globe, Banknote } from 'lucide-react';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

import { Button } from '@/components/ui/button';
import { ModelForm, ModelFormValues } from '@/components/admin/catalog/model-form';
import { ShopPriceManager } from '@/components/admin/catalog/shop-price-manager';
import { useModel, useUpdateModel, useDeleteModel, useModelTranslations, useUploadModelImage } from '@/hooks/catalog/useModels';
import { useQuestionSetsForModel, useAssignQuestionSetToModel, useDeleteAssignment } from '@/hooks/catalog/useDeviceQuestionSets';
import { Model, Language } from '@/types/catalog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranslationManager, TranslationWithSpecs } from '@/components/admin/catalog/translation-manager';
import { languageService } from '@/lib/api/catalog/languageService';
import { modelService } from '@/lib/api/catalog/modelService';

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = parseInt(params.id as string);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUpdatingAssignments, setIsUpdatingAssignments] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);
  
  // Fetch model data
  const { 
    data: modelResponse, 
    isLoading: isLoadingModel, 
    isError 
  } = useModel(modelId);
  const [model, setModel] = useState<Model | null>(null);
  useEffect(() => {
    if(modelResponse?.data) {
      setModel(modelResponse.data);
    }
  }, [modelResponse]);
  
  // Fetch translations
  const {
    data: translationsResponse,
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations
  } = useModelTranslations(modelId);
  
  // Fetch currently assigned question sets
  const {
    data: questionSetsResponse,
    isLoading: isLoadingQuestionSets
  } = useQuestionSetsForModel(modelId);
  
  // Mutations for question set assignments
  const assignQuestionSet = useAssignQuestionSetToModel();
  const deleteAssignment = useDeleteAssignment();
  
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
  
  // Access the actual translations from the API response and map to compatible format
  const translations = (() => {
    const translationList = (translationsResponse?.data || []).map(translation => ({
      language_id: translation.language_id,
      entity_id: translation.model_id,
      title: translation.title,
      description: translation.description || '',
      meta_title: translation.meta_title || '',
      meta_description: translation.meta_description || '',
      meta_keywords: translation.meta_keywords || '',
      specifications: translation.specifications ? 
        JSON.stringify(translation.specifications) : ''
    })) as TranslationWithSpecs[];

    // Check if there's already a translation for the default language
    const hasDefaultLanguageTranslation = defaultLanguage && 
      translationList.some(t => t.language_id === defaultLanguage.id);

    // If no default language translation exists, use the main model data as fallback
    if (defaultLanguage && !hasDefaultLanguageTranslation && model) {
      const defaultTranslation: TranslationWithSpecs = {
        language_id: defaultLanguage.id,
        entity_id: modelId,
        title: model.title || '',
        description: model.description || '',
        meta_title: model.meta_title || '',
        meta_description: model.meta_description || '',
        meta_keywords: model.meta_keywords || '',
        specifications: model.specifications ? JSON.stringify(model.specifications) : ''
      };
      
      // Add the default translation to the beginning of the list
      translationList.unshift(defaultTranslation);
    }

    return translationList;
  })();
  
  // Update and delete mutations
  const updateModel = useUpdateModel(modelId);
  const deleteModel = useDeleteModel();
  const { mutate: uploadImage, isPending: isUploading } = useUploadModelImage();
  
  // Handle form submission for model update
  const handleSubmit = async (values: ModelFormValues) => {
    const seriesIdNumber = values.series_id ? parseInt(values.series_id, 10) : NaN;
    // Convert form values to Model type
    const updatedModelPayload = {
      title: values.title,
      category_id: parseInt(values.category_id, 10),
      brand_id: parseInt(values.brand_id, 10),
      base_price: parseFloat(values.base_price),
      model_series_id: !isNaN(seriesIdNumber) ? seriesIdNumber : null,
      description: values.description || null,
      specifications: values.specifications ? JSON.parse(values.specifications) : null,
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
      price_drops: values.priceDrops?.map(pd => ({
        test_name: pd.testName,
        price_drop: parseFloat(pd.priceDrop) || 0
      })).filter(pd => pd.price_drop > 0)
    };
    
    updateModel.mutate(updatedModelPayload, {
      onSuccess: async () => {
        let assignmentsDoneSuccessfully = true;
        let imageUploadedSuccessfully = true; // Assume true if no imageFile or if upload succeeds
        console.log("assignmentsDoneSuccessfully", assignmentsDoneSuccessfully);
        try {
          const currentAssignedSets = questionSetsResponse?.data || [];
          const currentIds = currentAssignedSets.map(qs => qs.id?.toString() || '').filter(Boolean);
          const newQuestionSetIds: string[] = (values as ModelFormValues).questionSetIds || [];

          const setsToAdd = newQuestionSetIds.filter((id: string) => !currentIds.includes(id));
          const setsToRemove = currentIds.filter((id: string) => !newQuestionSetIds.includes(id));

          if (setsToAdd.length > 0 || setsToRemove.length > 0) {
            setIsUpdatingAssignments(true);
            try {
              const assignmentPromises: Promise<unknown>[] = [];

              setsToRemove.forEach((qsId: string) => {
                if (typeof qsId !== 'string' || !qsId.trim()) {
                  console.error(`Invalid questionSetId for removal: ${qsId}`);
                  assignmentsDoneSuccessfully = false;
                  return; 
                }
                const numericQsId = parseInt(qsId, 10);
                if (isNaN(numericQsId)) {
                  console.error(`Non-numeric questionSetId for removal: ${qsId}`);
                  assignmentsDoneSuccessfully = false;
                  return; 
                }
                assignmentPromises.push(
                  deleteAssignment.mutateAsync({ modelId, questionSetId: numericQsId })
                    .catch((err) => {
                      assignmentsDoneSuccessfully = false;
                      toast.error(`Failed to remove Question Set ID ${qsId}: ${err.message}`);
                      return Promise.reject(err); // Ensure Promise.allSettled sees this as rejected
                    })
                );
              });

              setsToAdd.forEach((qsId: string, index: number) => {
                if (typeof qsId !== 'string' || !qsId.trim()) {
                  console.error(`Invalid questionSetId for addition: ${qsId}`);
                  assignmentsDoneSuccessfully = false;
                  return; 
                }
                const numericQsId = parseInt(qsId, 10);
                if (isNaN(numericQsId)) {
                  console.error(`Non-numeric questionSetId for addition: ${qsId}`);
                  assignmentsDoneSuccessfully = false;
                  return; 
                }
                assignmentPromises.push(
                  assignQuestionSet.mutateAsync({ modelId, questionSetId: numericQsId, assignmentOrder: index })
                    .catch((err) => {
                      assignmentsDoneSuccessfully = false;
                      toast.error(`Failed to assign Question Set ID ${qsId}: ${err.message}`);
                      return Promise.reject(err); // Ensure Promise.allSettled sees this as rejected
                    })
                );
              });
              
              if (assignmentPromises.length > 0) {
                  const results = await Promise.allSettled(assignmentPromises);
                  // Ensure assignmentsDoneSuccessfully is false if any operation failed.
                  // Individual .catch blocks already set this, but this is a safeguard.
                  if (results.some(result => result.status === 'rejected')) {
                      assignmentsDoneSuccessfully = false;
                  }
              }

            } catch (batchProcessingError) { // Catches errors from the setup of promises or other unexpected issues in this block
              console.error("Error during batch question set assignment processing:", batchProcessingError);
              assignmentsDoneSuccessfully = false; 
              toast.error("An error occurred while processing question set changes.");
            } finally {
              setIsUpdatingAssignments(false);
            }
          }
          
          if (imageFile) {
            try {
              await new Promise<void>((resolve, reject) => {
                uploadImage(
                  { modelId: modelId, file: imageFile },
                  {
                    onSuccess: () => {
                      setImageFile(null);
                      resolve();
                    },
                    onError: (uploadError) => {
                      imageUploadedSuccessfully = false;
                      toast.error(`Model updated, but failed to upload new image: ${uploadError.message}`);
                      reject(uploadError); 
                    },
                  }
                );
              });
            } catch (imageUploadErrorInternal) {
              console.error("Image upload failed:", imageUploadErrorInternal);
            }
          }

          if (assignmentsDoneSuccessfully && imageUploadedSuccessfully) {
            toast.success('Model updated successfully!');
          } else {
            const warningMessages: string[] = [];
            if (!assignmentsDoneSuccessfully) warningMessages.push("some question set assignments failed");
            if (!imageUploadedSuccessfully && imageFile) warningMessages.push("image upload failed");
            
            toast.warning(`Model details updated, but ${warningMessages.join(" and ")}.`);
          }
          
        } catch (outerError) { 
          console.error("Outer error in handleSubmit onSuccess:", outerError);
          toast.error(`An unexpected error occurred during update: ${(outerError as Error).message}`);
          assignmentsDoneSuccessfully = false; 
          imageUploadedSuccessfully = imageFile ? false : true; 
        } finally {
          setIsUpdatingAssignments(false); 
          // Schedule navigation for the next tick to allow state updates to render
          setTimeout(() => {
            router.push('/admin/catalog/models');
          }, 0);
        }
      },
      onError: (error) => {
        console.error("Error in handleSubmit onError:", error);
        toast.error(`Error updating model details: ${error.message}`);
        setIsUpdatingAssignments(false); 
      }
    });
  };
  
  // Handle model deletion
  const handleDelete = () => {
    setIsDeleting(true);
    deleteModel.mutate(modelId, {
      onSuccess: () => {
        toast.success('Model deleted successfully');
        router.push('/admin/catalog/models');
      },
      onError: (error) => {
        toast.error(`Error deleting model: ${error.message}`);
        setIsDeleting(false);
      }
    });
  };
  
  // Handle translation saving
  const handleTranslationSave = async (updatedTranslations: TranslationWithSpecs[]) => {
    try {
      const translationsPayload = updatedTranslations.map(t => {
        let specifications = null;
        try {
          if (t.specifications) {
            specifications = JSON.parse(t.specifications as string);
          }
        } catch (e) {
          console.error("Error parsing specifications JSON", e);
          toast.error(`Invalid JSON in specifications for language ID ${t.language_id}.`);
          // throw new Error(`Invalid JSON in specifications for language ID ${t.language_id}.`);
        }

        return {
          language_id: t.language_id,
          title: t.title,
          description: t.description || '',
          meta_title: t.meta_title || '',
          meta_description: t.meta_description || '',
          meta_keywords: t.meta_keywords || '',
          specifications: specifications || '',
        };
      });

      await modelService.upsertBulkModelTranslations(modelId, translationsPayload);

      await refetchTranslations();
      toast.success('Translations updated successfully');
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error('An error occurred while saving translations.');
    }
  };
  
  const isPageLoading = isLoadingModel || isLoadingLanguages || isUpdatingAssignments || isLoadingQuestionSets;

  if (isPageLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading model details...</span>
      </div>
    );
  }
  
  if (isError || !model) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="p-6 bg-red-50 text-red-600 rounded-md flex flex-col">
          <p>Failed to load model. It might have been deleted or you don&apos;t have permission to view it.</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/catalog/models')}
            className="mt-4 self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Models
          </Button>
        </div>
      </div>
    );
  }

  // Convert specifications to string if they exist
  const specificationsString = model.specifications 
    ? JSON.stringify(model.specifications, null, 2) 
    : '';
  
  // Get currently assigned question set IDs
  const currentQuestionSetIds = (questionSetsResponse?.data || []).map(qs => 
    qs.id ? qs.id.toString() : ''
  ).filter(Boolean);
  
  // Map model data to form values
  const initialValues: ModelFormValues = {
    id: modelId.toString(),
    title: model.title,
    category_id: model.category_id.toString(),
    brand_id: model.brand_id.toString(),
    series_id: model.model_series_id ? model.model_series_id.toString() : '',
    base_price: model.base_price?.toString() || '',
    image: model.model_image || '',
    description: model.description || '',
    specifications: specificationsString,
    seo_title: model.meta_title || '',
    seo_description: model.meta_description || '',
    seo_keywords: model.meta_keywords || '',
    questionSetIds: currentQuestionSetIds,
    priceDrops: model.testPriceDrops?.map(pd => ({
        testName: pd.testName,
        priceDrop: String(pd.priceDrop)
    }))
  };
  
  // Delete button with confirmation dialog
  const deleteButton = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Model</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this model
            and all associated data.
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
  );

  return (
    <AdminEditCard
      title={`Edit Model: ${model.title}`}
      description="Update model information, translations, and pricing"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/models', label: 'Models' },
        { label: model.title, isCurrentPage: true }
      ]}
      actionButtons={deleteButton}
    >

      {/* Tabs for general info and translations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General Information
          </TabsTrigger>
          <TabsTrigger value="translations">
            <Globe className="mr-2 h-4 w-4" />
            Translations
          </TabsTrigger>
          <TabsTrigger value="price">
            <Banknote className="mr-2 h-4 w-4" />
            Price Management
          </TabsTrigger>
        </TabsList>
        
        {/* General Info Tab */}
        <TabsContent value="general" className="space-y-4">
          <div className=" p-6 rounded-md border">
            <ModelForm
              initialData={initialValues}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/admin/catalog/models')}
              isLoading={updateModel.isPending || isUploading || isUpdatingAssignments}
              onFileSelect={setImageFile}
            />
          </div>
        </TabsContent>
        
        {/* Translations Tab */}
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
                entityType="model"
                entityId={modelId}
                defaultLanguage={defaultLanguage}
                availableLanguages={languages}
                initialTranslations={translations}
                onSave={handleTranslationSave}
                hasSpecifications={true}
                fieldConfig={{
                  title: { label: 'Model Name', type: 'text' },
                  description: { label: 'Description', type: 'textarea' },
                  meta_title: { label: 'SEO Title', type: 'text' },
                  meta_description: { label: 'SEO Description', type: 'textarea' },
                  meta_keywords: { label: 'SEO Keywords', type: 'text' },
                  specifications: { label: 'Specifications', type: 'textarea' }
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center p-8">
              <span className="text-gray-500">No languages available. Please add languages first.</span>
            </div>
          )}
        </TabsContent>
        
        {/* Price Management Tab */}
        <TabsContent value="price" className="space-y-4">
          <ShopPriceManager
            modelId={modelId}
            modelTitle={model.title}
            defaultPrice={model.base_price}
          />
        </TabsContent>
      </Tabs>
    </AdminEditCard>
  );
}
