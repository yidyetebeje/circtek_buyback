"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Globe, PenSquare } from 'lucide-react';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

import { Button } from '@/components/ui/button';
import { BrandForm, BrandFormValues } from '@/components/admin/catalog/brand-form';
import {  useBrand,useUpdateBrand, useDeleteBrand, useBrandTranslations } from '@/hooks/catalog/useBrands';
import { Brand, Language } from '@/types/catalog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TranslationManager, TranslationWithSpecs } from '@/components/admin/catalog/translation-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { languageService } from '@/lib/api/catalog/languageService';
import { brandService } from '@/lib/api/catalog/brandService';

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = parseInt(params.id as string);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);
  
  // Fetch brand data
  const { 
    data: brandResponse, 
    isLoading: isLoadingBrand, 
    isError 
  } = useBrand(brandId);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [initialValues, setInitialValues] = useState<BrandFormValues | null>(null);

  // Fetch brand translations
  const { 
    data: translationsData,
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations 
  } = useBrandTranslations(brandId);
  
  // Update and delete mutations
  const updateBrand = useUpdateBrand(brandId);
  const deleteBrand = useDeleteBrand();

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
  
  useEffect(() => {
    console.log(brandResponse, "brandResponse")
    if (brandResponse) {
      setBrand(brandResponse.data);
      
    }
    if(brandResponse && !initialValues) {
      setInitialValues({
        title: brandResponse.data?.title || '',
        description: brandResponse.data?.description || '',
        logo: brandResponse.data?.icon || '',
        seo_title: brandResponse.data?.meta_title || '',
        seo_description: brandResponse.data?.meta_description || '',
        seo_keywords: brandResponse?.data?.meta_keywords || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandResponse]);
  
  // Handle saving translations
  const handleSaveTranslations = async (updatedTranslations: TranslationWithSpecs[]) => {
    try {
      // Prepare translations for bulk API
      const translationsPayload = updatedTranslations.map(translation => ({
        language_id: translation.language_id,
            title: translation.title,
        description: translation.description || undefined,
        meta_title: translation.meta_title || undefined,
        meta_description: translation.meta_description || undefined,
        meta_keywords: translation.meta_keywords || undefined,
      }));

      // Use bulk upsert method - handles both create and update for all translations
      const result = await brandService.bulkUpsertBrandTranslations(
            brandId,
        translationsPayload
          );

      // Refetch translations to get updated data
      await refetchTranslations();

      // Show success message with details
      if (result.data?.errors && result.data.errors.length > 0) {
        toast.warning(
          `Translations partially saved: ${result.data.created} created, ${result.data.updated} updated, ${result.data.errors.length} failed`
        );
      } else {
        toast.success(
          `Translations saved successfully: ${result.data?.created || 0} created, ${result.data?.updated || 0} updated`
        );
      }
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error('Failed to save translations');
    }
  };
  
  // Handle form submission for brand update
  const handleSubmit = async (values: BrandFormValues) => {
    const updatedBrand: Partial<Brand> = {
      title: values.title,
      icon: values.logo || null,
      description: values.description || null,
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
    };

    try {
      await updateBrand.mutateAsync(updatedBrand);
      toast.success('Brand updated successfully');
      router.push('/admin/catalog/brands');
    } catch (error) {
      console.error('Error updating brand:', error);
      toast.error((error as Error).message || 'Failed to update brand');
    }
  };
  
  // Handle brand deletion
  const handleDelete = () => {
    setIsDeleting(true);
    deleteBrand.mutate(brandId, {
      onSuccess: () => {
        router.push('/admin/catalog/brands');
      },
      onSettled: () => {
        setIsDeleting(false);
      }
    });
  };

  // Access the actual translations from the API response and map to compatible format
  const translations = (() => {
    const translationList = (translationsData?.data || []).map(translation => ({
      language_id: translation.language_id,
      entity_id: translation.brand_id,
      title: translation.title,
      description: translation.description || '',
      meta_title: translation.meta_title || '',
      meta_description: translation.meta_description || '',
      meta_keywords: translation.meta_keywords || '',
      specifications: '' // Brands don't have specifications
    })) as TranslationWithSpecs[];

    // Check if there's already a translation for the default language
    const hasDefaultLanguageTranslation = defaultLanguage && 
      translationList.some(t => t.language_id === defaultLanguage.id);

    // If no default language translation exists, use the main brand data as fallback
    if (defaultLanguage && !hasDefaultLanguageTranslation && brand) {
      const defaultTranslation: TranslationWithSpecs = {
        language_id: defaultLanguage.id,
        entity_id: brandId,
        title: brand.title || '',
        description: brand.description || '',
        meta_title: brand.meta_title || '',
        meta_description: brand.meta_description || '',
        meta_keywords: brand.meta_keywords || '',
        specifications: ''
      };
      
      // Add the default translation to the beginning of the list
      translationList.unshift(defaultTranslation);
    }

    return translationList;
  })();
  
  if (isLoadingBrand || isLoadingTranslations) {
    return (
      <div className="p-4 md:p-6 space-y-6 flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading brand data...</span>
      </div>
    );
  }
  
  if (isError || !brand) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="p-6 bg-red-50 text-red-600 rounded-md flex flex-col">
          <p>Failed to load brand. It might have been deleted or you do not have permission to view it.</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/catalog/brands')}
            className="mt-4 self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Brands
          </Button>
        </div>
      </div>
    );
  }
  
  // Map brand data to form values
  
  
  // Delete button with confirmation dialog
  const deleteButton = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Brand</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the brand
            and all associated data including models and series.
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
      title={`Edit Brand: ${brand.title}`}
      description="Update brand information and translations"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/brands', label: 'Brands' },
        { label: brand.title, isCurrentPage: true }
      ]}
      actionButtons={deleteButton}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="edit" className="flex items-center">
            <PenSquare className="w-4 h-4 mr-2" /> Edit Brand
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center">
            <Globe className="w-4 h-4 mr-2" /> Translations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="p-0">
          <Separator/>
          
          {initialValues && (
            <BrandForm
              initialData={initialValues}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/admin/catalog/brands')}
              isLoading={updateBrand.isPending}
              brandId={brandId || 0}
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
                entityType="brand"
                entityId={brandId}
                defaultLanguage={defaultLanguage}
                availableLanguages={languages}
                initialTranslations={translations}
                onSave={handleSaveTranslations}
                hasSpecifications={false}
                fieldConfig={{
                  title: { label: 'Brand Name', type: 'text' },
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
    </AdminEditCard>
  );
}
