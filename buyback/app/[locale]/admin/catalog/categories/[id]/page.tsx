"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Globe, PenSquare } from 'lucide-react';
import { AdminEditCard } from '@/components/admin/AdminEditCard';

import { Button } from '@/components/ui/button';
import { CategoryForm, CategoryFormValues } from '@/components/admin/catalog/category-form';
import { useCategory, useUpdateCategory, useDeleteCategory, useCategoryTranslations, useUploadCategoryIcon } from '@/hooks/catalog/useCategories';
import { Category, Language } from '@/types/catalog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TranslationManager, TranslationWithSpecs } from '@/components/admin/catalog/translation-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { languageService } from '@/lib/api/catalog/languageService';
import { categoryService } from '@/lib/api/catalog/categoryService';


export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = parseInt(params.id as string);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);
  
  // Fetch category data
  const { 
    data: category, 
    isLoading: isLoadingCategory, 
    isError 
  } = useCategory(categoryId);

  const { 
    data: translationsData,
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations 
  } = useCategoryTranslations(categoryId);
  
  // Update and delete mutations
  const updateCategory = useUpdateCategory(categoryId);
  const deleteCategory = useDeleteCategory();
  const { mutateAsync: uploadIcon, isPending: isUploading } = useUploadCategoryIcon();
  const [initialValues, setInitialValues] = useState<CategoryFormValues>();

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
    const categoryData = category?.data;
    if (categoryData ) {
      setInitialValues({
        title: categoryData.title || '',
        description: categoryData.description || '',
        icon: categoryData.icon || '',
        seo_title: categoryData.meta_title || '',
        seo_description: categoryData.meta_description || '',
        seo_keywords: categoryData.meta_keywords || '',
      });
    }
  }, [category]);

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
      const result = await categoryService.bulkUpsertCategoryTranslations(
        categoryId,
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
  
  // Handle form submission for category update
  const handleSubmit = async (values: CategoryFormValues) => {
    const updatedCategoryPayload: Partial<Omit<Category, 'icon'>> = {
      title: values.title,
      description: values.description || null,
      meta_title: values.seo_title || null,
      meta_description: values.seo_description || null,
      meta_keywords: values.seo_keywords || null,
    };

    try {
      await updateCategory.mutateAsync(updatedCategoryPayload);
      if (iconFile) {
        await uploadIcon({ categoryId, file: iconFile });
        setIconFile(null);
      }
      toast.success('Category updated successfully');
      router.push('/admin/catalog/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error((error as Error).message || 'Failed to update category');
    }
  };
  
  // Handle category deletion
  const handleDelete = () => {
    setIsDeleting(true);
    deleteCategory.mutate(categoryId, {
      onSuccess: () => {
        router.push('/admin/catalog/categories');
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
      entity_id: translation.category_id,
      title: translation.title,
      description: translation.description || '',
      meta_title: translation.meta_title || '',
      meta_description: translation.meta_description || '',
      meta_keywords: translation.meta_keywords || '',
      specifications: '' // Categories don't have specifications
    })) as TranslationWithSpecs[];

    // Check if there's already a translation for the default language (English)
    const hasDefaultLanguageTranslation = defaultLanguage && 
      translationList.some(t => t.language_id === defaultLanguage.id);

    // If no default language translation exists, use the main category data as fallback
    if (defaultLanguage && !hasDefaultLanguageTranslation && category?.data) {
      const categoryData = category.data;
      const defaultTranslation: TranslationWithSpecs = {
        language_id: defaultLanguage.id,
        entity_id: categoryId,
        title: categoryData.title || '',
        description: categoryData.description || '',
        meta_title: categoryData.meta_title || '',
        meta_description: categoryData.meta_description || '',
        meta_keywords: categoryData.meta_keywords || '',
        specifications: ''
      };
      
      // Add the default translation to the beginning of the list
      translationList.unshift(defaultTranslation);
    }

    return translationList;
  })();
 
  
  if (isLoadingCategory || isLoadingTranslations) {
    return (
      <div className="p-4 md:p-6 space-y-6 flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading category data...</span>
      </div>
    );
  }
  
  if (isError || !category) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="p-6 bg-red-50 text-red-600 rounded-md flex flex-col">
          <p>Failed to load category. It might have been deleted or you don&apos;t have permission to view it.</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/catalog/categories')}
            className="mt-4 self-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
          </Button>
        </div>
      </div>
    );
  }
  
  // Delete button with confirmation dialog
  const deleteButton = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Category</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the category
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
      title={`Edit Category: ${category?.data?.title}`}
      description="Update category information and translations"
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/catalog', label: 'Catalog' },
        { href: '/admin/catalog/categories', label: 'Categories' },
        { label: category?.data?.title || '', isCurrentPage: true }
      ]}
      actionButtons={deleteButton}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="edit" className="flex items-center">
            <PenSquare className="w-4 h-4 mr-2" /> Edit Category
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center">
            <Globe className="w-4 h-4 mr-2" /> Translations
          </TabsTrigger>
        </TabsList>
       
        
        <TabsContent value="edit" className="p-0">
        <Separator/>
          {initialValues && (
          
            <CategoryForm 
              initialData={initialValues}
              onSubmit={handleSubmit} 
              onCancel={() => router.push('/admin/catalog/categories')} 
              onFileSelect={setIconFile} 
              isLoading={updateCategory.isPending || isUploading} 
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
                entityType="category"
                entityId={categoryId}
                defaultLanguage={defaultLanguage}
                availableLanguages={languages}
                initialTranslations={translations}
                onSave={handleSaveTranslations}
                hasSpecifications={false}
                fieldConfig={{
                  title: { label: 'Category Name', type: 'text' },
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
