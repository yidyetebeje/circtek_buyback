"use client";

import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/homepage/HeroSection";
import { CategoryList } from "@/components/homepage/CategoryList";
import { FeaturedDevices } from "@/components/homepage/FeaturedDevices";
import { Testimonials } from "@/components/homepage/Testimonials";
import { Partners } from "@/components/homepage/Partners";
import { ConfigSidebar } from "@/components/config/ConfigSidebar";
import { ComponentEditor } from "@/components/config/ComponentEditor";
import { ConfigActionButtons } from "@/components/config/ConfigActionButtons";
import { ComponentType, ShopConfig } from "@/types/shop";
import { shopConfigAtom, previewConfigAtom, activeComponentAtom, displayConfigAtom, currentLanguageObjectAtom, editModeAtom } from "@/store/atoms";
import { getLocalizedText } from "@/utils/localization";
import { usePublishedCategories, useUpdateShopConfig } from "@/hooks/catalog/useShops";
import { useLanguage } from "@/hooks/useLanguage";
import { FAQSection } from "@/components/layout/FAQSection";
import { HelpSection } from "@/components/homepage/HelpSection";
import { StepProcessSection } from "@/components/homepage/StepProcessSection";
import { GlobalEarthSection } from "@/components/homepage/GlobalEarthSection";
import { FeedbackSection } from "@/components/homepage/FeedbackSection";
// If you need translations in this client component, you would import and use useTranslations here.
// import { useTranslations } from "next-intl";

interface HomePageClientProps {
  shopId: number;
}

export function HomePageClient({ shopId }: HomePageClientProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isEditMode = useAtomValue(editModeAtom);
  const canEdit = isAuthenticated && isEditMode;

  const [shopConfig, setShopConfig] = useAtom(shopConfigAtom);
  const [previewConfig, setPreviewConfig] = useAtom(previewConfigAtom);
  const [activeComponent, setActiveComponent] = useAtom(activeComponentAtom);
  const displayConfig = useAtomValue(displayConfigAtom);
  const currentLanguageObject = useAtomValue(currentLanguageObjectAtom);
  
  // Initialize language system
  useLanguage(); // This initializes the language system
  
  // Add loading state to control initial render
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  
  // Get the update shop config mutation
  const { mutate: updateShopConfig } = useUpdateShopConfig(shopId);
  
  // Get the shop owner ID from environment variable or from passed prop
  const shopOwnerId = shopId;
  
  // Fetch published categories from the backend API
  const { 
    data: publishedCategoriesData, 
    error: publishedCategoriesError, 
    isLoading: publishedCategoriesLoading 
  } = usePublishedCategories(shopOwnerId || 0, { limit: 20 });

  // Mark config as loaded after initial render
  useEffect(() => {
    // Mark config as loaded after a small delay to ensure all atoms are updated
    const timer = setTimeout(() => {
      setIsConfigLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get current locale from the language selection system
  const currentLocale = currentLanguageObject?.code || 'en';
  const fallbackLocale = 'en'; // Fallback if current locale's translation is missing

  // Debug: Log current language and translation values
  useEffect(() => {
    console.log('🌍 Current Language Object:', currentLanguageObject);
    console.log('🌍 Current Locale:', currentLocale);
    console.log('🌍 Category Section Title:', displayConfig.categorySectionTitle);
    console.log('🌍 Category Section Subtitle:', displayConfig.categorySectionSubtitle);
    console.log('🌍 Localized Title:', getLocalizedText(displayConfig.categorySectionTitle, currentLocale, fallbackLocale));
    console.log('🌍 Localized Subtitle:', getLocalizedText(displayConfig.categorySectionSubtitle, currentLocale, fallbackLocale));
  }, [currentLanguageObject, currentLocale, displayConfig.categorySectionTitle, displayConfig.categorySectionSubtitle, fallbackLocale]);

  // We no longer need the handleLivePreview and handleConfigChange methods
  // as they've been replaced with direct Jotai atom updates in the components

  const handleComponentEdit = (componentType: ComponentType) => {
    setActiveComponent(componentType);
    // Clear any previous preview when opening the editor
    setPreviewConfig(null);
  };

  // Handle saving config changes to the backend
  const handleSaveConfigToBackend = (config: ShopConfig) => {
    if (shopOwnerId) {
      updateShopConfig(config, {
        onSuccess: () => {
          console.log('Shop configuration updated successfully');
          // Optionally refetch shopConfig or update shopConfigAtom if backend returns the new config
          // For now, we assume the local state is the source of truth after save for immediate UI update
          setShopConfig(config); // Ensure local atom is updated to match saved config
        },
        onError: (error) => {
          console.error('Failed to update shop configuration:', error);
        }
      });
    }
  };

  // Determine which sections to show and in what order
  const sectionsOrder = displayConfig.sectionOrder || { 
    hero: 0, // Assuming hero is always first and not in sectionsOrder object in DB for now
    categories: 1, 
    featuredProducts: 2, 
    testimonials: 3, 
    partners: 4,
    stepProcess: 5, // Step Process section comes after partners
    globalEarth: 6, // Global Earth section comes after step process
    feedback: 7, // Feedback section comes after global earth
    faq: 8, // FAQ section comes after feedback
    help: 9 // Help section comes after FAQ
  };

  // Add locations link to navigation if not already present
  useEffect(() => {
    if (displayConfig.navigation?.showNavbar && 
        displayConfig.navigation.links &&
        !displayConfig.navigation.links.some(link => link.url.includes('/locations'))) {
      
      // Update navigation links to include the locations page
      const updatedNavConfig = {
        ...displayConfig.navigation,
        links: [
          ...displayConfig.navigation.links,
          { 
            label: getLocalizedText({ 
              en: "Our Locations", 
              nl: "Onze Locaties",
              de: "Unsere Standorte",
              fr: "Nos Emplacements",
              es: "Nuestras Ubicaciones"
            }, currentLocale, fallbackLocale), 
            url: `/${currentLocale}/locations` 
          }
        ]
      };
      
      // Update shop config with new navigation
      if (setShopConfig && shopConfig) {
        setShopConfig({
          ...shopConfig,
          navigation: updatedNavConfig
        });
      }
    }
  }, [displayConfig.navigation, currentLocale, fallbackLocale, setShopConfig, shopConfig]);

  // Get the categories from the API response or fallback to the config
  const categories = publishedCategoriesData?.data || displayConfig.categories;

  // Create an array of sections to render
  const sections = [
    { 
      id: 'categories' as ComponentType, 
      order: sectionsOrder.categories,
      component: (
        <div className="relative">
          <CategoryList 
            categories={categories} 
            primaryColor={displayConfig.theme.primary}
            variant={displayConfig.categoryVariant || 'default'}
            title={getLocalizedText(displayConfig.categorySectionTitle, currentLocale, fallbackLocale)}
            subtitle={getLocalizedText(displayConfig.categorySectionSubtitle, currentLocale, fallbackLocale)}
            isLoading={publishedCategoriesLoading}
            error={publishedCategoriesError}
          />
          {/* Edit button */}
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('categories')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Categories"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: true // Categories are always shown
    },
    { 
      id: 'featuredProducts' as ComponentType, 
      order: sectionsOrder.featuredProducts,
      component: (
        <div className="relative">
          <FeaturedDevices shopConfig={displayConfig} shopId={shopId} />
          {/* Edit button */}
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('featuredProducts')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Featured Products"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showFeaturedProducts
    },
    { 
      id: 'testimonials' as ComponentType, 
      order: sectionsOrder.testimonials,
      component: (
        <div className="relative">
          <Testimonials shopConfig={displayConfig} />
          {/* Edit button */}
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('testimonials')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Testimonials"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showTestimonials
    },
    { 
      id: 'partners' as ComponentType, 
      order: sectionsOrder.partners,
      component: (
        <div className="relative">
          <Partners shopConfig={displayConfig} />
          {/* Edit button */}
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('partners')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Partners"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showPartners
    },
    {
      id: 'stepProcess' as ComponentType,
      order: sectionsOrder.stepProcess || 5, // Appears after partners but before FAQ
      component: (
        <div className="relative">
          <StepProcessSection shopConfig={displayConfig} />
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('stepProcess')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Step Process Section"
              aria-label="Edit Step Process Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showStepProcess !== false // Show if not explicitly set to false
    },
    {
      id: 'globalEarth' as ComponentType,
      order: sectionsOrder.globalEarth || 93, // Appears after step process but before feedback
      component: (
        <div className="relative">
          <GlobalEarthSection />
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('globalEarth')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Global Earth Section"
              aria-label="Edit Global Earth Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showGlobalEarth !== false // Show if not explicitly set to false
    },
    {
      id: 'feedback' as ComponentType,
      order: sectionsOrder.feedback || 94, // Appears after global earth but before FAQ
      component: (
        <div className="relative">
          <FeedbackSection shopConfig={displayConfig} />
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('feedback')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Feedback Section"
              aria-label="Edit Feedback Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showFeedback !== false // Show if not explicitly set to false
    },
    {
      id: 'faq' as ComponentType,
      order: sectionsOrder.faq || 95, // Lower fallback order to ensure it appears before Help section
      component: (
        <div className="relative">
          <FAQSection shopConfig={displayConfig} shopId={shopOwnerId || 0} />
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('faq')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit FAQ Section"
              aria-label="Edit FAQ Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: displayConfig.faq?.showFAQ !== false // Show if not explicitly set to false
    },
    {
      id: 'help' as ComponentType,
      order: sectionsOrder.help || 97, // Higher than FAQ but still before footer
      component: (
        <div className="relative">
          <HelpSection shopConfig={displayConfig} />
          {canEdit && (
            <button 
              onClick={() => handleComponentEdit('help')}
              className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
              title="Edit Help Section"
              aria-label="Edit Help Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      ),
      show: shopConfig.showHelp !== false // Show if not explicitly set to false
    }
  ]
  .filter(section => section.show)
  .sort((a, b) => a.order - b.order);
  
  // Show loading state if config is not fully loaded
  if (!isConfigLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          
          
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <MainLayout shopConfig={displayConfig}>
        <div className="w-full">
          {/* Edit button for Hero Section is outside, HeroSection component does not need onEdit */}
          <div className="relative">
         
            <HeroSection 
              heroSection={displayConfig.heroSection} 
              primaryColor={displayConfig.theme.primary}
              shopId={shopOwnerId || 0} // Pass shopOwnerId as shopId, fallback to 0 if null
            />
            {/* Hero edit button */}
            {canEdit && (
              <button 
                onClick={() => handleComponentEdit('hero')}
                className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50"
                title="Edit Hero Section"
                aria-label="Edit Hero Section"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            )}
          </div>
        
          {sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <section key={section.id} id={section.id} className="w-full"> 
                {section.component}
              </section>
            ))}
        
          {canEdit && <ConfigSidebar onUpdateShopConfig={handleSaveConfigToBackend} />}
          
          {/* Action buttons that appear outside the sidebar */}
          {canEdit && <ConfigActionButtons onUpdateShopConfig={handleSaveConfigToBackend} />}

          {/* Component-specific editor */}
          {canEdit && (
            <ComponentEditor
              isOpen={activeComponent !== null}
              onClose={() => {
                // When closing the editor, apply any pending preview changes automatically
                if (previewConfig) {
                  // Apply preview changes to the local configuration only
                  // Do NOT save to backend - wait for user to click publish
                  setShopConfig(previewConfig);
                }
                // Clear the preview and close the editor
                setPreviewConfig(null);
                setActiveComponent(null);
              }}
              onUpdateShopConfig={handleSaveConfigToBackend}
            />
          )}
        </div>
      </MainLayout>
    </div>
  );
}