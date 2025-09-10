"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, ArrowLeft, ArrowRight, Check, Store, Loader2 } from 'lucide-react';
import { ShopForm, ShopFormValues } from './shop-form';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories } from '@/hooks/catalog/useCategories';
import { useBrands } from '@/hooks/catalog/useBrands';
import { useModelSeries } from '@/hooks/catalog/useModelSeries';
import { CatalogEntitySelector } from './catalog-entity-selector';
import { toast } from 'sonner';

// This interface should match the one in catalog-entity-selector.tsx
interface CatalogEntity {
  id: number;
  title: string;
  icon?: string;
  image?: string;
  [key: string]: unknown;
}

type Step = {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

type CatalogType = 'categories' | 'brands' | 'modelSeries';

interface ShopStepperProps {
  onComplete: (values: ShopFormValues, selectedEntities: SelectedEntities) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onLogoUpload: (file: File) => Promise<string>;
  onLogoRemove?: () => void;
  initialData?: Partial<ShopFormValues & { id?: number }>;
}

export interface SelectedEntities {
  categories: number[];
  brands: number[];
  modelSeries: number[];
}

export function ShopStepper({
  onComplete,
  onCancel,
  isLoading,
  onLogoUpload,
  onLogoRemove,
  initialData
}: ShopStepperProps) {
  // Define steps
  const steps: Step[] = [
    { 
      id: 'shop-info', 
      title: 'Shop Information', 
      icon: <Store className="h-5 w-5" />, 
      description: 'Enter basic shop details like name and organization' 
    },
    { 
      id: 'catalog-entities', 
      title: 'Catalog Selection', 
      icon: <Grid className="h-5 w-5" />, 
      description: 'Select which catalog items to publish to this shop' 
    },
  ];

  // State for current step and form data
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ShopFormValues>(initialData as ShopFormValues || {
    name: '',
    organization: '',
    phone: '',
    logo: null,
    active: true,
  });

  // State for selected entities
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntities>({
    categories: [],
    brands: [],
    modelSeries: [],
  });

  // State for current catalog type 
  const [currentCatalogType, setCurrentCatalogType] = useState<CatalogType>('categories');

  // Loading state for next button
  const [isNextLoading, setIsNextLoading] = useState(false);

  // Fetch entities for selection
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategories({});
  const { data: brandsResponse, isLoading: isLoadingBrands } = useBrands({});
  const { data: modelSeriesResponse, isLoading: isLoadingModelSeries } = useModelSeries({});

  // Handle form submission for the first step
  const handleShopInfoSubmit = (values: ShopFormValues) => {
    setFormData(values);
    setCurrentStep(currentStep + 1);
  };

  // Handle selection changes
  const handleCategorySelection = (selectedIds: number[]) => {
    setSelectedEntities(prev => ({ ...prev, categories: selectedIds }));
  };

  const handleBrandSelection = (selectedIds: number[]) => {
    setSelectedEntities(prev => ({ ...prev, brands: selectedIds }));
  };

  const handleModelSeriesSelection = (selectedIds: number[]) => {
    setSelectedEntities(prev => ({ ...prev, modelSeries: selectedIds }));
  };

  // Navigate between catalog types
  const handleNextCatalogType = () => {
    if (currentCatalogType === 'categories') setCurrentCatalogType('brands');
    else if (currentCatalogType === 'brands') setCurrentCatalogType('modelSeries');
  };

  const handlePrevCatalogType = () => {
    if (currentCatalogType === 'brands') setCurrentCatalogType('categories');
    else if (currentCatalogType === 'modelSeries') setCurrentCatalogType('brands');
  };

  // Handle final submission
  const handleFinish = async () => {
    setIsNextLoading(true);
    try {
      await onComplete(formData, selectedEntities);
    } catch (error) {
      console.error('Error completing shop setup:', error);
      
      // Extract specific error message
      let errorMessage = 'Failed to complete shop setup';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        if (typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
      }
      
      // Check if it's a session-related error and provide specific guidance
      if (errorMessage.includes('session') || errorMessage.includes('log in') || errorMessage.includes('authentication')) {
        toast.error('Session expired. Please refresh the page and log in again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsNextLoading(false);
    }
  };

  // Handle skip catalog selection
  const handleSkipCatalog = async () => {
    setIsNextLoading(true);
    try {
      // Reset selections but still proceed
      const emptySelections: SelectedEntities = {
        categories: [],
        brands: [],
        modelSeries: [],
      };
      await onComplete(formData, emptySelections);
    } catch (error) {
      console.error('Error completing shop setup with skipped catalog:', error);
      
      // Extract specific error message
      let errorMessage = 'Failed to create shop';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        if (typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
      }
      
      // Check if it's a session-related error and provide specific guidance
      if (errorMessage.includes('session') || errorMessage.includes('log in') || errorMessage.includes('authentication')) {
        toast.error('Session expired. Please refresh the page and log in again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsNextLoading(false);
    }
  };

  // Handle going back to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getTitleAndIcon = (type: CatalogType) => {
    switch(type) {
      case 'categories':
        return { 
          title: 'Select Categories', 
          description: 'Choose which device categories to publish to this shop',
          icon: <Grid className="h-5 w-5" />
        };
      case 'brands':
        return { 
          title: 'Select Brands', 
          description: 'Choose which brands to publish to this shop',
          icon: <Store className="h-5 w-5" />
        };
      case 'modelSeries':
        return { 
          title: 'Select Model Series', 
          description: 'Choose which model series to publish to this shop',
          icon: <Grid className="h-5 w-5" />
        };
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto relative">
      {/* Loading Overlay */}
      {isNextLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEntities.categories.length === 0 && 
                 selectedEntities.brands.length === 0 && 
                 selectedEntities.modelSeries.length === 0 
                  ? 'Creating shop...' 
                  : 'Creating shop with selected catalog items...'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please wait while we set up your shop
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex-1 flex items-center flex-col px-1">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index < currentStep 
                    ? 'bg-gray-100 border-gray-400 text-gray-600' 
                    : index === currentStep 
                      ? 'bg-gray-50 border-gray-500 text-gray-700' 
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="absolute -bottom-12 w-full text-center text-xs sm:text-sm font-medium text-gray-600">
                {step.title}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-sm text-gray-600 pt-12">
          {steps[currentStep].description}
        </div>
      </div>

      {/* Step Content */}
      <div className="mt-16">
        {currentStep === 0 && (
          <ShopForm
            initialData={formData}
            onSubmit={handleShopInfoSubmit}
            onCancel={onCancel}
            isLoading={isLoading}
            onLogoUpload={onLogoUpload}
            onLogoRemove={onLogoRemove}
          />
        )}

        {currentStep === 1 && (
          <div className="space-y-8">
            {/* Catalog Type Tabs */}
            <Tabs 
              value={currentCatalogType} 
              onValueChange={(value) => setCurrentCatalogType(value as CatalogType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="categories" className="flex items-center justify-center xs:justify-start">
                  <Grid className="h-4 w-4 xs:mr-2" />
                  <span className="hidden xs:inline">Categories</span>
                </TabsTrigger>
                <TabsTrigger value="brands" className="flex items-center justify-center xs:justify-start">
                  <Store className="h-4 w-4 xs:mr-2" />
                  <span className="hidden xs:inline">Brands</span>
                </TabsTrigger>
                <TabsTrigger value="modelSeries" className="flex items-center justify-center xs:justify-start">
                  <Grid className="h-4 w-4 xs:mr-2" />
                  <span className="hidden xs:inline">Model Series</span>
                </TabsTrigger>
              </TabsList>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCatalogType}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={containerVariants}
                  className="pt-6"
                >
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold flex items-center">
                      {getTitleAndIcon(currentCatalogType).icon}
                      <span className="ml-2">{getTitleAndIcon(currentCatalogType).title}</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {getTitleAndIcon(currentCatalogType).description}
                    </p>
                  </div>

                  <TabsContent value="categories" className="mt-0">
                    <CatalogEntitySelector
                      entities={(categoriesResponse?.data || []).filter(cat => cat.id !== undefined) as unknown as CatalogEntity[]}
                      isLoading={isLoadingCategories}
                      selectedIds={selectedEntities.categories}
                      onSelectionChange={handleCategorySelection}
                      imageKey="icon"
                      nameKey="title"
                      emptyMessage="No categories available"
                    />
                  </TabsContent>
                  
                  <TabsContent value="brands" className="mt-0">
                    <CatalogEntitySelector
                      entities={(brandsResponse?.data || []).filter(brand => brand.id !== undefined) as unknown as CatalogEntity[]}
                      isLoading={isLoadingBrands}
                      selectedIds={selectedEntities.brands}
                      onSelectionChange={handleBrandSelection}
                      imageKey="icon"
                      nameKey="title"
                      emptyMessage="No brands available"
                    />
                  </TabsContent>
                  
                  <TabsContent value="modelSeries" className="mt-0">
                    <CatalogEntitySelector
                      entities={(modelSeriesResponse?.data || []).filter(series => series.id !== undefined) as unknown as CatalogEntity[]}
                      isLoading={isLoadingModelSeries}
                      selectedIds={selectedEntities.modelSeries}
                      onSelectionChange={handleModelSeriesSelection}
                      imageKey="image"
                      nameKey="title"
                      emptyMessage="No model series available"
                    />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>

            <div className="flex justify-between pt-6">
              {currentCatalogType === 'categories' ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                  disabled={isNextLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Shop Info
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevCatalogType}
                  disabled={isNextLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              
              <div className="space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleSkipCatalog}
                  disabled={isNextLoading}
                >
                  Skip All
                </Button>
                
                {currentCatalogType !== 'modelSeries' ? (
                  <Button 
                    type="button"
                    onClick={handleNextCatalogType}
                    disabled={isNextLoading}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={handleFinish}
                    disabled={isNextLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isNextLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Shop
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 