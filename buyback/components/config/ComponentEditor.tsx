"use client";

import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { HeroSection, TranslatableText, DeviceEstimationConfig, DeviceEstimationQuestion, ShopConfig, CategoryTextConfig, StepProcessConfig, HelpConfig, FeedbackConfig, ThePhoneLabHeaderConfig, GlobalEarthConfig } from "@/types/shop";
import { HeroVariantSelector, HeroVariantType } from "./HeroVariantSelector";
import { CategoryVariantSelector } from "./CategoryVariantSelector";
import { ModelListVariantSelector, ModelListVariantType } from './ModelListVariantSelector';
import { CategoryVariantType } from "../homepage/category-variants";
import { HeroTranslationEditor } from "./HeroTranslationEditor";
import { CategoryTextTranslationEditor } from './CategoryTextTranslationEditor';
import { CategoryButtonTextEditor } from './CategoryButtonTextEditor';
import { HeaderVariantSelector } from './HeaderVariantSelector';
import { HeaderVariantType } from '../layout/header-variants';
import { previewConfigAtom, activeComponentAtom, activeHeroTabAtom, activeCategoryTabAtom } from "@/store/atoms";
import { useShopConfigManager } from "@/hooks/useShopConfig";
import { DeviceEstimationVariantSelector } from './DeviceEstimationVariantSelector';
import { DeviceEstimationVariantType } from '@/types/shop';
import { CheckoutVariantSelector } from '../checkout/CheckoutVariantSelector';
import { CheckoutVariantType } from '../checkout/checkout-variants';
import { FooterVariantSelector } from './FooterVariantSelector';
import { FooterVariantType } from '../layout/footer-variants';
import { FooterLinksEditor } from './FooterLinksEditor';
import { FooterVariant4LinksEditor } from './FooterVariant4LinksEditor';
import { FooterVariant4Props } from '../layout/footer-variants/FooterVariant4';
import { StepProcessTranslationEditor } from './StepProcessTranslationEditor';
import { GlobalEarthTranslationEditor } from './GlobalEarthTranslationEditor';
import { HelpTranslationEditor } from './HelpTranslationEditor';
import FeedbackTranslationEditor from './FeedbackTranslationEditor';
import { ThePhoneLabHeaderTranslationEditor } from './ThePhoneLabHeaderTranslationEditor';

// Type definitions for component config
type HeroConfig = HeroSection;
type CategoriesConfig = { 
  title?: TranslatableText, 
  subtitle?: TranslatableText, 
  variant?: CategoryVariantType,
  categoryTextConfig?: CategoryTextConfig
};
type PartnersConfig = { showPartners: boolean };
type TestimonialsConfig = { showTestimonials: boolean };
type FeaturedProductsConfig = { showFeaturedProducts: boolean };
type HeaderConfig = { 
  variant: HeaderVariantType;
  showBenefits: boolean;
  showNavbar: boolean;
  backgroundColor?: string;
  textColor?: string;
};
type ModelListConfig = {
  variant?: ModelListVariantType,
};
type CheckoutConfig = {
  variant: CheckoutVariantType,
};
type FooterConfig = {
  variant?: FooterVariantType;
  backgroundColor?: string;
  textColor?: string;
  showLogo?: boolean;
  logoPosition?: 'left' | 'center' | 'right';
  companyDescription?: TranslatableText;
  showCopyright?: boolean;
  copyrightText?: TranslatableText;
  footerLinks?: {
    title: string;
    titleColor?: string;
    links: Array<{ 
      label: string; 
      url: string;
      isExternal?: boolean;
      icon?: string;
    }>;
  }[];
  variant4Options?: FooterVariant4Props;
};

// Union type for all possible component configs
type ComponentConfig = 
  | HeroConfig 
  | CategoriesConfig 
  | PartnersConfig 
  | TestimonialsConfig 
  | FeaturedProductsConfig
  | HeaderConfig
  | ModelListConfig
  | DeviceEstimationConfig
  | CheckoutConfig
  | FooterConfig
  | StepProcessConfig
  | GlobalEarthConfig
  | HelpConfig
  | FeedbackConfig
  | ThePhoneLabHeaderConfig;

interface ComponentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateShopConfig?: (config: ShopConfig) => void;
}

export function ComponentEditor({ isOpen, onClose, onUpdateShopConfig }: ComponentEditorProps) {
  const { localConfig: shopConfig, setLocalConfig: setShopConfig } = useShopConfigManager();
  const [, setPreviewConfig] = useAtom(previewConfigAtom);
  const [componentType] = useAtom(activeComponentAtom);
  const [activeHeroTab, setActiveHeroTab] = useAtom(activeHeroTabAtom);
  const [activeCategoryTab, setActiveCategoryTab] = useAtom(activeCategoryTabAtom);
  const [localConfig, setLocalConfig] = useState<ComponentConfig>({} as ComponentConfig);
  const isVisible = isOpen && componentType !== null;

  // Default texts for category section editor inputs if no values are saved
  const DEFAULT_CATEGORY_SECTION_TITLE = "Find Your Device Type";
  const DEFAULT_CATEGORY_SECTION_SUBTITLE = "Select your device category to get started with an instant quote";

  useEffect(() => {
    if (!isVisible || !componentType) {
      // Optionally reset localConfig when modal is hidden, or retain for quicker re-open
      // setLocalConfig({}); // For now, let's not reset, to see if it helps with state retention if desired
      return;
    }

    // Initialize localConfig based on the current componentType and shopConfig
    if (componentType === 'hero') {
      setLocalConfig(shopConfig.heroSection || {}); // Default to empty object if heroSection is undefined
    } else if (componentType === 'categories') {
      setLocalConfig({
        title: shopConfig.categorySectionTitle || { en: DEFAULT_CATEGORY_SECTION_TITLE }, // Initialize as TranslatableText
        subtitle: shopConfig.categorySectionSubtitle || { en: DEFAULT_CATEGORY_SECTION_SUBTITLE }, // Initialize as TranslatableText
        variant: shopConfig.categoryVariant || 'default',
        categoryTextConfig: shopConfig.categoryTextConfig || {},
      });
    } else if (componentType === 'partners') {
      setLocalConfig({ 
        showPartners: shopConfig.showPartners === undefined ? true : shopConfig.showPartners 
      });
    } else if (componentType === 'testimonials') {
      setLocalConfig({ 
        showTestimonials: shopConfig.showTestimonials === undefined ? true : shopConfig.showTestimonials 
      });
    } else if (componentType === 'featuredProducts') {
      setLocalConfig({ 
        showFeaturedProducts: shopConfig.showFeaturedProducts === undefined ? true : shopConfig.showFeaturedProducts 
      });
    } else if (componentType === 'header') {
      // Get benefit visibility from config or default to true
      const showBenefits = shopConfig.benefits?.showBenefits !== undefined ? 
        shopConfig.benefits.showBenefits : true;
      
      // Assume navbar is visible by default if not specified
      const showNavbar = shopConfig.navigation?.showNavbar !== undefined ?
        shopConfig.navigation.showNavbar : true;
        
      setLocalConfig({ 
        variant: shopConfig.headerVariant || 'default',
        showBenefits,
        showNavbar,
        backgroundColor: shopConfig.headerStyle?.backgroundColor || '#ffffff',
        textColor: shopConfig.headerStyle?.textColor || '#000000',
      });
    } else if (componentType === 'modelList') {
      setLocalConfig({
        variant: shopConfig.modelListVariant || 'card',
      });
    } else if (componentType === 'deviceEstimation') {
      setLocalConfig(shopConfig.deviceEstimationConfig || {
        pageTitle: { en: 'Estimate Your Device Value' },
        questions: [],
        estimationResultTitle: { en: 'Your Estimated Value' },
        checkoutButtonText: { en: 'Sell Your Device Now' },
      });
    } else if (componentType === 'checkout') {
      setLocalConfig({
        variant: shopConfig.checkoutVariant || 'default',
      });
    } else if (componentType === 'footer') {
      // Initialize the footer configuration
      const defaultFooterLinks = [
        {
          title: "Quick Links",
          links: [
            { label: "Home", url: "/" },
            { label: "Our Locations", url: "/locations" }
          ]
        }
      ];
      
      setLocalConfig({
        variant: shopConfig.footerConfig?.variant || 'default',
        backgroundColor: shopConfig.footerConfig?.backgroundColor || shopConfig.theme.background,
        textColor: shopConfig.footerConfig?.textColor || shopConfig.theme.text,
        showLogo: shopConfig.footerConfig?.showLogo !== undefined ? shopConfig.footerConfig.showLogo : true,
        logoPosition: shopConfig.footerConfig?.logoPosition || 'left',
        companyDescription: shopConfig.footerConfig?.companyDescription || { en: 'The easiest way to sell your used electronics for the best price.' },
        showCopyright: shopConfig.footerConfig?.showCopyright !== undefined ? shopConfig.footerConfig.showCopyright : true,
        copyrightText: shopConfig.footerConfig?.copyrightText,
        footerLinks: shopConfig.footerLinks && shopConfig.footerLinks.length > 0 ? shopConfig.footerLinks : defaultFooterLinks
      });
    } else if (componentType === 'stepProcess') {
      setLocalConfig(shopConfig.stepProcessConfig || {
        step1Title: { en: "Sign up" },
        step1Description: { en: "Answer a few questions and receive your price proposal" },
        step2Title: { en: "Return" },
        step2Description: { en: "Return your device to one of our 13 stores or send it to us free of charge" },
        step3Title: { en: "Earn money" },
        step3Description: { en: "Paid directly in our stores, with no surprises. When sent within 24 hours" }
      });
    } else if (componentType === 'globalEarth') {
      setLocalConfig(shopConfig.globalEarthConfig || {
        heading: { en: "Reduce e-waste, make money with your old device" },
        subheading: { en: "Receive your personalized offer with a few clicks" },
        imageUrl: "https://verkopen.thephonelab.nl/assets/images/domain-6-globe-icon.png?v=1",
        imageAlt: { en: "Globe Icon" }
      });
    } else if (componentType === 'help') {
      setLocalConfig(shopConfig.helpConfig || {
        title: { en: "Need help?" },
        subtitle: { en: "Get in touch with one of our specialists" },
        whatsapp: { en: "Whatsapp" },
        email: { en: "Email" },
        stores: { en: "13 stores" },
        comeVisit: { en: "Feel free to visit" }
      });
    } else if (componentType === 'feedback') {
      setLocalConfig(shopConfig.feedbackConfig || {
        title: { en: "We score 9.5 out of 10 calculated from 10345 customer reviews" },
        altLogo: { en: "Feedback Company Logo" },
        ariaPrev: { en: "Previous review" },
        ariaNext: { en: "Next review" },
        review1Text: { en: "Very good" },
        review1Reviewer: { en: "Marten Bezemer" },
        review2Text: { en: "Fast and professional service!" },
        review2Reviewer: { en: "Haarlem Grote Houtstraat" },
        review3Text: { en: "Top services" },
        review3Reviewer: { en: "Schildersbedrijf verhoeven" },
        review4Text: { en: "Very satisfied!" },
        review4Reviewer: { en: "Anna K." },
        review5Text: { en: "Excellent service." },
        review5Reviewer: { en: "Peter V." },
        review6Text: { en: "Almost perfect, short waiting time." },
        review6Reviewer: { en: "Laura B." },
      });
    } else if (componentType === 'thePhoneLabHeader') {
      setLocalConfig(shopConfig.thePhoneLabHeaderConfig || {
        benefit1: { en: "Paid immediately" },
        benefit2: { en: "Sales in 1 of our 12 stores" },
        benefit3: { en: "No surprises" },
        repairs: { en: "Repairs" },
        stores: { en: "Stores" }
      });
    } else {
      // Default case or for other types, might initialize to empty or specific default
      setLocalConfig({});
    }
  }, [componentType, shopConfig, isVisible]);

  // Get title based on component type
  const getComponentTitle = () => {
    switch (componentType) {
      case 'hero': return 'Hero Section';
      case 'categories': return 'Categories';
      case 'featuredProducts': return 'Featured Products';
      case 'testimonials': return 'Testimonials';
      case 'partners': return 'Partners';
      case 'header': return 'Header';
      case 'modelList': return 'Model List Style';
      case 'deviceEstimation': return 'Device Estimation Settings';
      case 'checkout': return 'Checkout Style';
      case 'stepProcess': return 'Step Process Settings';
      case 'globalEarth': return 'Global Earth Section Settings';
      case 'help': return 'Help Section Settings';
      case 'feedback': return 'Feedback Section Settings';
      case 'thePhoneLabHeader': return 'ThePhoneLab Header Settings';
      default: return 'Component Editor';
    }
  };

  const handleTextChange = (field: string, value: string) => {
    if (componentType === 'categories' && activeCategoryTab === 'basic' && (field === 'title' || field === 'subtitle')) {
      const currentCategoriesConfig = localConfig as CategoriesConfig;
      const currentTranslatableText = currentCategoriesConfig[field as 'title' | 'subtitle'] || { en: '' };
      const newTranslatableText: TranslatableText = { ...currentTranslatableText, en: value };
      
      const updatedLocalConfig: CategoriesConfig = { 
        ...currentCategoriesConfig, 
        [field]: newTranslatableText 
      };
      setLocalConfig(updatedLocalConfig);

      setPreviewConfig(prevConfig => {
        const baseConfig = prevConfig || {...shopConfig};
        return {
          ...baseConfig,
          categorySectionTitle: updatedLocalConfig.title,
          categorySectionSubtitle: updatedLocalConfig.subtitle,
          categoryVariant: updatedLocalConfig.variant,
        };
      });
    } else if (componentType === 'deviceEstimation' && (field === 'pageTitle' || field === 'estimationResultTitle' || field === 'checkoutButtonText')) {
      const currentEstimationConfig = localConfig as DeviceEstimationConfig;
      const currentTranslatableText = currentEstimationConfig[field as 'pageTitle' | 'estimationResultTitle' | 'checkoutButtonText'] || { en: '' };
      const newTranslatableText: TranslatableText = { ...currentTranslatableText, en: value };

      const updatedLocalConfig: DeviceEstimationConfig = {
        ...currentEstimationConfig,
        [field]: newTranslatableText
      };
      setLocalConfig(updatedLocalConfig);
      
      setPreviewConfig(prevConfig => {
        const baseConfig = prevConfig || {...shopConfig};
        const currentDeviceEstimationConf = baseConfig.deviceEstimationConfig || {};
        const updatedEstimationConfig = { 
          ...currentDeviceEstimationConf, 
          [field]: newTranslatableText 
        };
        return {
          ...baseConfig,
          deviceEstimationConfig: updatedEstimationConfig
        };
      });

    } else if (componentType === 'header' && (field === 'backgroundColor' || field === 'textColor')) {
      const currentHeaderConfig = localConfig as HeaderConfig;
      const updatedHeaderConfig: HeaderConfig = {
        ...currentHeaderConfig,
        [field]: value,
      };
      setLocalConfig(updatedHeaderConfig);
      setPreviewConfig(prevConfig => {
        const baseConfig = prevConfig || { ...shopConfig };
        return {
          ...baseConfig,
          headerStyle: {
            ...baseConfig.headerStyle,
            [field]: value,
          },
        };
      });
    } else {
      const newLocalConfig = { ...localConfig, [field]: value };
      setLocalConfig(newLocalConfig);
      if (componentType === 'hero') {
        setPreviewConfig(prevConfig => {
          const baseConfig = prevConfig || {...shopConfig};
          return {
            ...baseConfig,
            heroSection: newLocalConfig as HeroConfig
          };
        });
      }
    }
  };

  const handleCategoryTranslationChange = (
    updatedTitleConfig: TranslatableText,
    updatedSubtitleConfig: TranslatableText
  ) => {
    const currentCategoriesConfig = localConfig as CategoriesConfig;
    const updatedLocalConfig: CategoriesConfig = {
      ...currentCategoriesConfig,
      title: updatedTitleConfig,
      subtitle: updatedSubtitleConfig,
    };
    setLocalConfig(updatedLocalConfig);

    // Use setPreviewConfig for live preview
    setPreviewConfig(prevConfig => {
      const baseConfig = prevConfig || {...shopConfig};
      return {
        ...baseConfig,
        categorySectionTitle: updatedLocalConfig.title,
        categorySectionSubtitle: updatedLocalConfig.subtitle,
        categoryVariant: updatedLocalConfig.variant,
      };
    });
  };

  const handleObjectChange = (field: string, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleChange = (field: string, value: boolean) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };
  
  // Handler for translatable text changes (used by Footer and other components)
  const handleTranslatableTextChange = (field: string, value: TranslatableText) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    
    // For footer component, update preview config
    if (componentType === 'footer') {
      setPreviewConfig(prevConfig => {
        const baseConfig = prevConfig || {...shopConfig};
        const currentFooterConfig = baseConfig.footerConfig || {};
        return {
          ...baseConfig,
          footerConfig: {
            ...currentFooterConfig,
            [field]: value
          }
        };
      });
    }
  };

  const handleHeaderVariantChange = (value: HeaderVariantType) => {
    setLocalConfig(prev => ({ 
      ...(prev as HeaderConfig), 
      variant: value 
    }) as ComponentConfig);
  };
  
  const handleBenefitsVisibilityChange = (visible: boolean) => {
    setLocalConfig(prev => ({ 
      ...(prev as HeaderConfig), 
      showBenefits: visible 
    }) as ComponentConfig);
  };
  
  const handleNavbarVisibilityChange = (visible: boolean) => {
    setLocalConfig(prev => ({ 
      ...(prev as HeaderConfig), 
      showNavbar: visible 
    }) as ComponentConfig);
  };

  // Handler for Model List variant change
  const handleModelListVariantChange = (variant: ModelListVariantType) => {
    const newConfig = { ...(localConfig as ModelListConfig), variant };
    setLocalConfig(newConfig as ComponentConfig);
    setPreviewConfig(prev => ({
      ...(prev || shopConfig),
      modelListVariant: variant,
    }));
  };

  const handleSave = () => {
    // Apply changes based on component type
    let updatedShopConfig = { ...shopConfig };

    if (componentType === 'hero') {
      updatedShopConfig = {
        ...updatedShopConfig,
        heroSection: localConfig as HeroSection 
      };
    } else if (componentType === 'categories') {
      const categoriesConfig = localConfig as CategoriesConfig;
      updatedShopConfig = {
        ...updatedShopConfig,
        categorySectionTitle: categoriesConfig.title,
        categorySectionSubtitle: categoriesConfig.subtitle,
        categoryVariant: categoriesConfig.variant,
        categoryTextConfig: categoriesConfig.categoryTextConfig
      };
    } else if (componentType === 'partners') {
      updatedShopConfig = {
        ...updatedShopConfig,
        showPartners: (localConfig as PartnersConfig).showPartners
      };
    } else if (componentType === 'testimonials') {
      updatedShopConfig = {
        ...updatedShopConfig,
        showTestimonials: (localConfig as TestimonialsConfig).showTestimonials
      };
    } else if (componentType === 'featuredProducts') {
      updatedShopConfig = {
        ...updatedShopConfig,
        showFeaturedProducts: (localConfig as FeaturedProductsConfig).showFeaturedProducts
      };
    } else if (componentType === 'header') {
      const headerConfig = localConfig as HeaderConfig;
      
      // Update both the headerVariant AND benefit visibility
      // Ensure benefits has all required properties including items array
      const currentBenefits = updatedShopConfig.benefits || {
        items: [],
        alignment: 'center',
        backgroundColor: updatedShopConfig.theme.primary,
        textColor: '#ffffff',
        iconColor: '#ffffff',
        showBenefits: true
      };

      // Ensure navigation has all required properties
      const currentNavigation = updatedShopConfig.navigation || {
        showNavbar: true,
        links: []
      };

      updatedShopConfig = {
        ...updatedShopConfig,
        headerVariant: headerConfig.variant,
        benefits: {
          ...currentBenefits,
          showBenefits: headerConfig.showBenefits
        },
        navigation: {
          ...currentNavigation,
          showNavbar: headerConfig.showNavbar
        },
        headerStyle: {
          ...updatedShopConfig.headerStyle,
          backgroundColor: headerConfig.backgroundColor,
          textColor: headerConfig.textColor,
        }
      };
    } else if (componentType === 'modelList') {
      const modelListConfig = localConfig as ModelListConfig;
      updatedShopConfig = {
        ...updatedShopConfig,
        modelListVariant: modelListConfig.variant,
      };
    } else if (componentType === 'deviceEstimation') {
      updatedShopConfig = { 
        ...updatedShopConfig, 
        deviceEstimationConfig: localConfig as DeviceEstimationConfig 
      };
    } else if (componentType === 'checkout') {
      const checkoutConfig = localConfig as CheckoutConfig;
      updatedShopConfig = {
        ...updatedShopConfig,
        checkoutVariant: checkoutConfig.variant,
      };
    } else if (componentType === 'footer') {
      const footerConfig = localConfig as FooterConfig;
      updatedShopConfig = {
        ...updatedShopConfig,
        footerConfig: {
          variant: (footerConfig.variant as unknown) as FooterVariantType, // Double type assertion to handle string to FooterVariantType
          backgroundColor: footerConfig.backgroundColor,
          textColor: footerConfig.textColor,
          showLogo: footerConfig.showLogo,
          logoPosition: footerConfig.logoPosition,
          companyDescription: footerConfig.companyDescription,
          showCopyright: footerConfig.showCopyright,
          copyrightText: footerConfig.copyrightText,
          // Include variant4Options if this is variant4 or if they already exist
          variant4Options: footerConfig.variant4Options || updatedShopConfig.footerConfig?.variant4Options
        },
        footerLinks: footerConfig.footerLinks || []
      };
    } else if (componentType === 'stepProcess') {
      updatedShopConfig = {
        ...updatedShopConfig,
        stepProcessConfig: localConfig as StepProcessConfig
      };
    } else if (componentType === 'globalEarth') {
      updatedShopConfig = {
        ...updatedShopConfig,
        globalEarthConfig: localConfig as GlobalEarthConfig
      };
    } else if (componentType === 'help') {
      updatedShopConfig = {
        ...updatedShopConfig,
        helpConfig: localConfig as HelpConfig
      };
    } else if (componentType === 'feedback') {
      updatedShopConfig = {
        ...updatedShopConfig,
        feedbackConfig: localConfig as FeedbackConfig
      };
    } else if (componentType === 'thePhoneLabHeader') {
      updatedShopConfig = {
        ...updatedShopConfig,
        thePhoneLabHeaderConfig: localConfig as ThePhoneLabHeaderConfig
      };
    }

    // Update the local shop config only - no backend updates
    setShopConfig(updatedShopConfig);
    
    onClose();
  };

  // Handler for changes within a question (text, type)
  const handleQuestionChange = (qIndex: number, field: 'text' | 'type', value: string | DeviceEstimationQuestion['type']) => {
    const currentEstimationConfig = localConfig as DeviceEstimationConfig;
    const updatedQuestions = [...(currentEstimationConfig.questions || [])];
    if (!updatedQuestions[qIndex]) return;

    if (field === 'text') {
      const currentText = updatedQuestions[qIndex].text;
      updatedQuestions[qIndex].text = typeof currentText === 'object' ? {...currentText, en: value as string} : {en: value as string};
    } else if (field === 'type') {
      updatedQuestions[qIndex].type = value as DeviceEstimationQuestion['type'];
      // If type changes from/to multiple-choice, options might need to be initialized or cleared
      if (value === 'multiple-choice' && !updatedQuestions[qIndex].options) {
        updatedQuestions[qIndex].options = [];
      } else if (value !== 'multiple-choice') {
        // delete updatedQuestions[qIndex].options; // Or set to undefined
      }
    }

    const updatedLocalConfig = { ...currentEstimationConfig, questions: updatedQuestions };
    setLocalConfig(updatedLocalConfig);
    setPreviewConfig(prev => ({...(prev || shopConfig), deviceEstimationConfig: updatedLocalConfig}));
  };

  // Handler for changes within an option of a question
  const handleOptionChange = (qIndex: number, oIndex: number, field: 'label' | 'value' | 'description' | 'icon', newValue: string) => {
    const currentEstimationConfig = localConfig as DeviceEstimationConfig;
    const updatedQuestions = [...(currentEstimationConfig.questions || [])];
    if (!updatedQuestions[qIndex] || !updatedQuestions[qIndex].options || !updatedQuestions[qIndex].options![oIndex]) return;

    const optionToUpdate = updatedQuestions[qIndex].options![oIndex];
    if (field === 'label' || field === 'description') { // Translatable fields
      const currentText = optionToUpdate[field];
      (optionToUpdate[field] as TranslatableText | string | undefined) = typeof currentText === 'object' ? {...currentText, en: newValue} : {en: newValue};
    } else { // Simple string fields like value or icon
      (optionToUpdate[field] as string | undefined) = newValue;
    }
    
    const updatedLocalConfig = { ...currentEstimationConfig, questions: updatedQuestions };
    setLocalConfig(updatedLocalConfig);
    setPreviewConfig(prev => ({...(prev || shopConfig), deviceEstimationConfig: updatedLocalConfig}));
  };

  // Specific handler for Device Estimation variant change
  const handleDeviceEstimationVariantChange = (variant: DeviceEstimationVariantType) => {
    const newConfig = { ...(localConfig as DeviceEstimationConfig), variant };
    setLocalConfig(newConfig as ComponentConfig);
    setPreviewConfig(prev => ({
      ...(prev || shopConfig),
      deviceEstimationConfig: {
        ...(prev?.deviceEstimationConfig || {}),
        variant,
      },
    }));
  };

  const handleCheckoutVariantChange = (variant: CheckoutVariantType) => {
    const newConfig = { ...(localConfig as CheckoutConfig), variant };
    setLocalConfig(newConfig as ComponentConfig);
    setPreviewConfig(prev => ({
      ...(prev || shopConfig),
      checkoutVariant: variant,
    }));
  };
  
  // Handler for footer variant change
  const handleFooterVariantChange = (variant: FooterVariantType) => {
    const newConfig = { ...(localConfig as FooterConfig), variant };
    setLocalConfig(newConfig as ComponentConfig);
    
    // Ensure we're using the correct type for variant in the preview config
    const typedVariant = variant as 'default' | 'minimal' | 'expanded';
    
    setPreviewConfig(prev => ({
      ...(prev || shopConfig),
      footerConfig: {
        ...(prev?.footerConfig || {}),
        variant: typedVariant,
      },
    }));
  };
  
  // Handler for footer links changes
  const handleFooterLinksChange = (links: any[]) => {
    const newConfig = { ...(localConfig as FooterConfig), footerLinks: links };
    setLocalConfig(newConfig as ComponentConfig);
    setPreviewConfig(prev => ({
      ...(prev || shopConfig),
      footerLinks: links,
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={onClose} />
      
      {/* Editor Panel */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 w-96 max-h-[90vh] bg-white rounded-xl shadow-2xl z-[100000] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{getComponentTitle()}</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Hero Section */}
            {componentType === 'hero' && (
              <>
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Hero Style</h3>
                  <HeroVariantSelector
                    selectedVariant={(localConfig as HeroConfig).variant as HeroVariantType || 'default'}
                    onChange={(variant) => handleTextChange('variant', variant)}
                    onVariantPreview={(variant) => {
                      // Live preview for hero variant change
                      if (componentType === 'hero') {
                        const updatedHeroConfig = {
                          ...localConfig as HeroConfig,
                          variant
                        };
                        setPreviewConfig(prevConfig => {
                          const baseConfig = prevConfig || {...shopConfig};
                          return {
                            ...baseConfig,
                            heroSection: updatedHeroConfig
                          };
                        });
                      }
                    }}
                    primaryColor={shopConfig.theme.primary}
                  />
                </div>

                {/* Tabs for Basic vs. Translations */}
                <div className="mb-6">
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      className={`px-4 py-2 font-medium text-sm border-b-2 ${activeHeroTab === 'basic' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveHeroTab('basic')}
                    >
                      Basic Settings
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm border-b-2 ${activeHeroTab === 'translations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveHeroTab('translations')}
                    >
                      Translations
                    </button>
                  </div>

                  {activeHeroTab === 'basic' ? (
                    <div className="space-y-6">
                      {/* Base hero fields that all variants have */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                          type="text"
                          value={(localConfig as HeroConfig).title || ''}
                          onChange={(e) => handleTextChange('title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={(localConfig as HeroConfig).subtitle || ''}
                          onChange={(e) => handleTextChange('subtitle', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={(localConfig as HeroConfig).description || ''}
                          onChange={(e) => handleTextChange('description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Button Text</label>
                        <input
                          type="text"
                          value={(localConfig as HeroConfig).buttonText || ''}
                          onChange={(e) => handleTextChange('buttonText', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Button Link</label>
                        <input
                          type="text"
                          value={(localConfig as HeroConfig).buttonLink || ''}
                          onChange={(e) => handleTextChange('buttonLink', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Background Image URL</label>
                        <input
                          type="text"
                          value={(localConfig as HeroConfig).backgroundImage || ''}
                          onChange={(e) => handleTextChange('backgroundImage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Variant-specific fields */}
                      {(localConfig as HeroConfig).variant === 'default' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Tagline (above title)</label>
                          <input
                            type="text"
                            value={(localConfig as HeroConfig).tagline || 'Trade In. Cash Out.'}
                            onChange={(e) => handleTextChange('tagline', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}

                      {(localConfig as HeroConfig).variant === 'split' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Featured Devices</label>
                          <p className="text-xs text-gray-500 mb-2">Add devices that will be featured in floating cards</p>
                          <button
                            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 mb-2"
                            onClick={() => {
                              const config = localConfig as HeroConfig;
                              const devices = config.featuredDevices || [];
                              handleObjectChange('featuredDevices', [...devices, { name: 'New Device', price: '$0', image: '' }]);
                            }}
                          >
                            Add Device
                          </button>
                          
                          <div className="space-y-4 mt-2">
                            {((localConfig as HeroConfig).featuredDevices || []).map((device, index) => (
                              <div key={index} className="p-3 border border-gray-200 rounded-md">
                                <div className="flex justify-between mb-2">
                                  <h4 className="font-medium text-sm">Device {index + 1}</h4>
                                  <button
                                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                                    onClick={() => {
                                      const config = localConfig as HeroConfig;
                                      const devices = [...(config.featuredDevices || [])];
                                      devices.splice(index, 1);
                                      handleObjectChange('featuredDevices', devices);
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-xs text-gray-500">Name</label>
                                    <input
                                      type="text"
                                      value={device.name}
                                      onChange={(e) => {
                                        const config = localConfig as HeroConfig;
                                        const devices = [...(config.featuredDevices || [])];
                                        devices[index] = { ...devices[index], name: e.target.value };
                                        handleObjectChange('featuredDevices', devices);
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500">Price</label>
                                    <input
                                      type="text"
                                      value={device.price}
                                      onChange={(e) => {
                                        const config = localConfig as HeroConfig;
                                        const devices = [...(config.featuredDevices || [])];
                                        devices[index] = { ...devices[index], price: e.target.value };
                                        handleObjectChange('featuredDevices', devices);
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500">Image URL</label>
                                    <input
                                      type="text"
                                      value={device.image}
                                      onChange={(e) => {
                                        const config = localConfig as HeroConfig;
                                        const devices = [...(config.featuredDevices || [])];
                                        devices[index] = { ...devices[index], image: e.target.value };
                                        handleObjectChange('featuredDevices', devices);
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(localConfig as HeroConfig).variant === 'centered' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Trust Badge Text</label>
                          <input
                            type="text"
                            value={(localConfig as HeroConfig).trustBadge || 'Trusted by 10,000+ customers'}
                            onChange={(e) => handleTextChange('trustBadge', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}

                      {(localConfig as HeroConfig).variant === 'gradient' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Gradient Start Color</label>
                              <input
                                type="text"
                                value={(localConfig as HeroConfig).gradientStart || '#111827'}
                                onChange={(e) => handleTextChange('gradientStart', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Gradient End Color</label>
                              <input
                                type="text"
                                value={(localConfig as HeroConfig).gradientEnd || shopConfig.theme.primary}
                                onChange={(e) => handleTextChange('gradientEnd', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {(localConfig as HeroConfig).variant === 'minimalist' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Tagline (above title)</label>
                          <input
                            type="text"
                            value={(localConfig as HeroConfig).taglineBefore || 'Sell Your Devices'}
                            onChange={(e) => handleTextChange('taglineBefore', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}

                      {(localConfig as HeroConfig).variant === 'video' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1">Video URL</label>
                            <input
                              type="text"
                              value={(localConfig as HeroConfig).videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-typing-on-smartphone-screen-close-up-4121-large.mp4'}
                              onChange={(e) => handleTextChange('videoUrl', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use MP4 format for best compatibility</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Live Badge Text</label>
                            <input
                              type="text"
                              value={(localConfig as HeroConfig).liveBadgeText || 'Live Pricing Updates'}
                              onChange={(e) => handleTextChange('liveBadgeText', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                        </>
                      )}

                      {(localConfig as HeroConfig).variant === 'simple' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Background Color</label>
                          <input
                            type="text"
                            value={(localConfig as HeroConfig).backgroundColor || '#F8F7F4'}
                            onChange={(e) => handleTextChange('backgroundColor', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., #F8F7F4 or lightblue"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-blue-900">AI-Powered Hero Translation ✨</h4>
                            <p className="text-sm text-blue-700">
                              Automatically generate engaging hero translations that maintain marketing appeal and context. 
                              Perfect for creating compelling localized content that converts visitors across different languages.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🎯 Marketing-Focused
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🌍 Multi-Language
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ⚡ Instant Generation
                          </span>
                        </div>
                      </div>
                      
                      <HeroTranslationEditor
                        heroSection={localConfig as HeroSection}
                        onChange={(translations) => handleObjectChange('translations', translations)}
                        locales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ModelList Section - Simplified */}
            {componentType === 'modelList' && (
              <div className="space-y-6">
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Model List Style</h3>
                  <ModelListVariantSelector
                    selectedVariant={(localConfig as ModelListConfig).variant || 'card'}
                    onChange={handleModelListVariantChange}
                    onVariantPreview={handleModelListVariantChange}
                    primaryColor={shopConfig.theme.primary}
                  />
                </div>
              </div>
            )}

            {/* Categories Section */}
            {componentType === 'categories' && (
              <div className="space-y-6">
                <div className="mb-4 border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setActiveCategoryTab('basic')}
                      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                        activeCategoryTab === 'basic'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Basic
                    </button>
                    <button
                      onClick={() => setActiveCategoryTab('translations')}
                      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                        activeCategoryTab === 'translations'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Translations
                    </button>
                    <button
                      onClick={() => setActiveCategoryTab('buttonTexts')}
                      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                        activeCategoryTab === 'buttonTexts'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Button Texts
                    </button>
                  </nav>
                </div>

                {activeCategoryTab === 'basic' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Section Title (EN)</label>
                      <input
                        type="text"
                        value={((localConfig as CategoriesConfig).title?.en) || ''}
                        onChange={(e) => handleTextChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Browse Our Categories"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Section Subtitle (EN)</label>
                      <input
                        type="text"
                        value={((localConfig as CategoriesConfig).subtitle?.en) || ''}
                        onChange={(e) => handleTextChange('subtitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Find the perfect device for your needs"
                      />
                    </div>
                  </>
                )}
                {activeCategoryTab === 'translations' && (
                  <div>
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-blue-900">AI-Powered Translation ✨</h4>
                          <p className="text-sm text-blue-700">
                            Automatically generate translations from English to multiple languages using advanced AI. 
                            Perfect for creating localized content that maintains context and cultural appropriateness.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🤖 Context-Aware
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          🌍 Multi-Language
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ⚡ Instant Generation
                        </span>
                      </div>
                    </div>
                    
                    <CategoryTextTranslationEditor 
                      titleConfig={(localConfig as CategoriesConfig).title || {}}
                      subtitleConfig={(localConfig as CategoriesConfig).subtitle || {}}
                      onChange={handleCategoryTranslationChange}
                      availableLocales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                    />
                  </div>
                )}
                {activeCategoryTab === 'buttonTexts' && (
                  <div>
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-green-900">Smart Button Text Translation 🎯</h4>
                          <p className="text-sm text-green-700">
                            Generate culturally appropriate button texts and UI labels with AI. 
                            Supports placeholder variables and maintains consistent terminology across all languages.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🎯 UI-Focused
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🔤 Variable Preservation
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          📦 Bulk Generation
                        </span>
                      </div>
                    </div>

                    <CategoryButtonTextEditor 
                      categoryTextConfig={(localConfig as CategoriesConfig).categoryTextConfig}
                      onChange={(updatedConfig) => {
                        const currentCategoriesConfig = localConfig as CategoriesConfig;
                        const updatedLocalConfig: CategoriesConfig = {
                          ...currentCategoriesConfig,
                          categoryTextConfig: updatedConfig,
                        };
                        setLocalConfig(updatedLocalConfig);
                        
                        // Update preview config
                        setPreviewConfig(prevConfig => {
                          const baseConfig = prevConfig || {...shopConfig};
                          return {
                            ...baseConfig,
                            categoryTextConfig: updatedConfig,
                          };
                        });
                      }}
                      availableLocales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                    />
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Category Display Style</label>
                  <CategoryVariantSelector 
                    selectedVariant={(localConfig as CategoriesConfig).variant || 'default'}
                    onChange={(variant) => handleTextChange('variant', variant)} // This will now also trigger live preview if set up for 'variant'
                    primaryColor={shopConfig.theme.primary}
                    onVariantPreview={(variant) => {
                      if (componentType === 'categories') {
                        const updatedCategoryConfig = {
                          title: (localConfig as CategoriesConfig).title,       // from current localConfig
                          subtitle: (localConfig as CategoriesConfig).subtitle, // from current localConfig
                          variant
                        };
                        setPreviewConfig(prevConfig => {
                          const baseConfig = prevConfig || {...shopConfig};
                          return {
                            ...baseConfig,
                            categoryVariant: updatedCategoryConfig.variant,
                            categorySectionTitle: updatedCategoryConfig.title,
                            categorySectionSubtitle: updatedCategoryConfig.subtitle
                          };
                        });
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Partners */}
            {componentType === 'partners' && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Partners Section</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(localConfig as PartnersConfig).showPartners}
                      onChange={(e) => handleToggleChange('showPartners', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    In this demo, you can edit partner data and additional settings in the database.
                  </p>
                  
                  <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                    Partners section demonstrates how components can be toggled on/off.
                  </div>
                </div>
              </>
            )}

            {/* Testimonials */}
            {componentType === 'testimonials' && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Testimonials Section</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(localConfig as TestimonialsConfig).showTestimonials}
                      onChange={(e) => handleToggleChange('showTestimonials', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                  Testimonials section demonstrates how components can be toggled on/off.
                </div>
              </>
            )}

            {/* Featured Products */}
            {componentType === 'featuredProducts' && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Featured Products Section</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(localConfig as FeaturedProductsConfig).showFeaturedProducts}
                      onChange={(e) => handleToggleChange('showFeaturedProducts', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                  Featured Products section demonstrates how components can be toggled on/off.
                </div>
              </>
            )}
            
            {/* Checkout Styles */}
            {componentType === 'checkout' && (
              <div className="space-y-6">
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Checkout Style</h3>
                  <CheckoutVariantSelector
                    selectedVariant={(localConfig as CheckoutConfig).variant || 'default'}
                    onChange={handleCheckoutVariantChange}
                    onVariantPreview={(variant) => { 
                      setPreviewConfig(prev => ({
                        ...(prev || shopConfig),
                        checkoutVariant: variant,
                      }));
                    }}
                    primaryColor={shopConfig.theme.primary}
                  />
                </div>
                
                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-4">
                  Select a checkout style that aligns with your brand and provides the best user experience. 
                  Each variant offers different layouts and navigational elements.
                </div>
              </div>
            )}

            {/* Header Customization */}
            {componentType === 'header' && (
              <>
                <h3 className="text-lg font-medium mb-4">Header Style</h3>
                <HeaderVariantSelector 
                  value={(localConfig as HeaderConfig).variant} 
                  onChange={handleHeaderVariantChange} 
                />
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Header Components</h3>
                  
                  {/* Benefits Bar Toggle */}
                  <div className="mb-4 flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                    <div>
                      <h4 className="font-medium">Benefits Bar</h4>
                      <p className="text-sm text-gray-600">Show a bar with key benefits at the top of the header</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={(localConfig as HeaderConfig).showBenefits}
                        onChange={(e) => handleBenefitsVisibilityChange(e.target.checked)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {/* Navigation Bar Toggle */}
                  <div className="mb-4 flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                    <div>
                      <h4 className="font-medium">Navigation Bar</h4>
                      <p className="text-sm text-gray-600">Show navigation links in the header</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={(localConfig as HeaderConfig).showNavbar}
                        onChange={(e) => handleNavbarVisibilityChange(e.target.checked)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-4">
                  Select a header variant that best fits your website&apos;s style and brand.
                  Toggle components to customize your header&apos;s appearance and functionality.
                </div>

                {/* Color settings */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Background Color</label>
                    <input
                      type="text"
                      value={(localConfig as HeaderConfig).backgroundColor || ''}
                      onChange={(e) => handleTextChange('backgroundColor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="#ffffff or transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Text Color</label>
                    <input
                      type="text"
                      value={(localConfig as HeaderConfig).textColor || ''}
                      onChange={(e) => handleTextChange('textColor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Footer Editor */}
            {componentType === 'footer' && (
              <div className="space-y-6">
                {/* Variant Selector */}
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Footer Style</h3>
                  <FooterVariantSelector
                    selectedVariant={(localConfig as FooterConfig).variant as FooterVariantType || 'default'}
                    onChange={handleFooterVariantChange}
                    onVariantPreview={(variant) => {
                      // Live preview for footer variant change
                      setPreviewConfig(prev => ({
                        ...(prev || shopConfig),
                        footerConfig: {
                          ...(prev?.footerConfig || {}),
                          variant: variant as 'default' | 'minimal' | 'expanded',
                        },
                      }));
                    }}
                    primaryColor={shopConfig.theme.primary}
                  />
                </div>

                {/* Basic Settings */}
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Basic Settings</h3>
                  
                  {/* Color Settings */}
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Background Color</label>
                      <input
                        type="text"
                        value={(localConfig as FooterConfig).backgroundColor || shopConfig.theme.background}
                        onChange={(e) => handleTextChange('backgroundColor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., #f8f9fa or white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Text Color</label>
                      <input
                        type="text"
                        value={(localConfig as FooterConfig).textColor || shopConfig.theme.text}
                        onChange={(e) => handleTextChange('textColor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., #212529 or black"
                      />
                    </div>
                  </div>
                  
                  {/* Logo and Copyright Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Logo</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(localConfig as FooterConfig).showLogo}
                          onChange={(e) => handleToggleChange('showLogo', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {(localConfig as FooterConfig).showLogo && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Logo Position</label>
                        <select
                          value={(localConfig as FooterConfig).logoPosition || 'left'}
                          onChange={(e) => handleTextChange('logoPosition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Copyright</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(localConfig as FooterConfig).showCopyright}
                          onChange={(e) => handleToggleChange('showCopyright', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Company Description */}
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-3">Company Description</h3>
                  <textarea
                    value={((localConfig as FooterConfig).companyDescription as TranslatableText)?.en || ''}
                    onChange={(e) => {
                      const currentDesc = (localConfig as FooterConfig).companyDescription || {};
                      handleTranslatableTextChange('companyDescription', { ...currentDesc, en: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                    placeholder="Enter a brief description of your company"
                  />
                </div>

                {/* Footer Links Editor - Show appropriate editor based on variant */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">Footer Links</h3>
                  
                  {(localConfig as FooterConfig).variant === 'variant4' ? (
                    // Use FooterVariant4LinksEditor for variant4
                    <FooterVariant4LinksEditor 
                      initialConfig={shopConfig.footerConfig?.variant4Options || {}}
                      onConfigChange={(updatedConfig: FooterVariant4Props) => {
                        // Update preview immediately
                        setPreviewConfig(prev => ({
                          ...(prev || shopConfig),
                          footerConfig: {
                            ...(prev?.footerConfig || {}),
                            variant4Options: updatedConfig,
                          },
                        }));
                        
                        // Update local config
                        setLocalConfig(prev => ({
                          ...(prev as FooterConfig),
                          variant4Options: updatedConfig,
                        }));
                      }}
                    />
                  ) : (
                    // Use standard FooterLinksEditor for other variants
                    <FooterLinksEditor
                      footerLinks={(localConfig as FooterConfig).footerLinks || []}
                      onChange={handleFooterLinksChange}
                      primaryColor={shopConfig.theme.primary}
                    />
                  )}
                </div>
                
                <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800 mt-4">
                  Customize your footer to match your brand style and provide relevant links to important pages.
                  You can add, edit, or remove link sections and individual links.
                </div>
              </div>
            )}
            
            {/* Step Process Section Editor */}
            {componentType === 'stepProcess' && (
              <div className="space-y-6">
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-green-900">AI-Powered Step Process Translation ✨</h4>
                      <p className="text-sm text-green-700">
                        Generate compelling step process content that guides users through your buyback process. 
                        Perfect for creating localized, action-oriented content that converts visitors across different languages.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🎯 Process-Focused
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🌍 Multi-Language
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      ⚡ Instant Generation
                    </span>
                  </div>
                </div>

                <StepProcessTranslationEditor
                  stepProcessConfig={localConfig as StepProcessConfig}
                  onChange={(updatedConfig) => {
                    setLocalConfig(updatedConfig);
                    setPreviewConfig(prevConfig => {
                      const baseConfig = prevConfig || {...shopConfig};
                      return {
                        ...baseConfig,
                        stepProcessConfig: updatedConfig,
                      };
                    });
                  }}
                  availableLocales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                />
              </div>
            )}
            
            {/* Global Earth Section Editor */}
            {componentType === 'globalEarth' && (
              <div className="space-y-6">
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-cyan-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-green-900">AI-Powered Global Earth Section ✨</h4>
                      <p className="text-sm text-green-700">
                        Generate compelling environmental messaging for your global earth section that emphasizes sustainability and e-waste reduction. 
                        Perfect for creating localized content that resonates with environmentally conscious customers across different languages.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🌍 Eco-Focused
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                      🌱 Sustainability
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ⚡ Instant Generation
                    </span>
                  </div>
                </div>

                <GlobalEarthTranslationEditor
                  globalEarthConfig={localConfig as GlobalEarthConfig}
                  onChange={(updatedConfig) => {
                    setLocalConfig(updatedConfig);
                    setPreviewConfig(prevConfig => {
                      const baseConfig = prevConfig || {...shopConfig};
                      return {
                        ...baseConfig,
                        globalEarthConfig: updatedConfig,
                      };
                    });
                  }}
                  availableLocales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                />
              </div>
            )}
            
            {/* Help Section Editor */}
            {componentType === 'help' && (
              <div className="space-y-6">
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-purple-900">AI-Powered Help Section Translation ✨</h4>
                      <p className="text-sm text-purple-700">
                        Generate helpful and supportive content for your help section that guides customers to connect with your team. 
                        Perfect for creating localized customer support content that builds trust across different languages.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      🆘 Support-Focused
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🌍 Multi-Language
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ⚡ Instant Generation
                    </span>
                  </div>
                </div>

                <HelpTranslationEditor
                  helpConfig={localConfig as HelpConfig}
                  onChange={(updatedConfig) => {
                    setLocalConfig(updatedConfig);
                    setPreviewConfig(prevConfig => {
                      const baseConfig = prevConfig || {...shopConfig};
                      return {
                        ...baseConfig,
                        helpConfig: updatedConfig,
                      };
                    });
                  }}
                  availableLocales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                />
              </div>
            )}
            
            {/* Feedback Section Editor */}
            {componentType === 'feedback' && (
              <div className="space-y-6">
                <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-orange-900">AI-Powered Feedback Section Translation ✨</h4>
                      <p className="text-sm text-orange-700">
                        Generate authentic customer reviews and feedback content that builds trust and credibility. 
                        Perfect for creating localized testimonials that resonate with customers in different markets.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ⭐ Review-Focused
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🌍 Multi-Language
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ⚡ Instant Generation
                    </span>
                  </div>
                </div>

                <FeedbackTranslationEditor
                  feedbackConfig={localConfig as FeedbackConfig}
                  onChange={(updatedConfig) => {
                    setLocalConfig(updatedConfig);
                    setPreviewConfig(prevConfig => {
                      const baseConfig = prevConfig || {...shopConfig};
                      return {
                        ...baseConfig,
                        feedbackConfig: updatedConfig,
                      };
                    });
                  }}
                  availableLocales={['en', 'nl', 'de', 'es', 'fr', 'pt']}
                />
              </div>
            )}
            
            {/* ThePhoneLab Header Section Editor */}
            {componentType === 'thePhoneLabHeader' && (
              <div className="space-y-6">
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900">AI-Powered Header Translation ✨</h4>
                      <p className="text-sm text-blue-700">
                        Customize and translate your header benefits bar and navigation links. 
                        Generate localized content that builds trust and guides users effectively.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🎯 Header-Focused
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🌍 Multi-Language
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      ⚡ Instant Generation
                    </span>
                  </div>
                </div>

                <ThePhoneLabHeaderTranslationEditor
                  config={localConfig as ThePhoneLabHeaderConfig}
                  onConfigChange={(updatedConfig) => {
                    setLocalConfig(updatedConfig);
                    setPreviewConfig(prevConfig => {
                      const baseConfig = prevConfig || {...shopConfig};
                      return {
                        ...baseConfig,
                        thePhoneLabHeaderConfig: updatedConfig,
                      };
                    });
                  }}
                  onSave={handleSave}
                  onCancel={onClose}
                />
              </div>
            )}
            
            {/* Device Estimation Section Editor */}
            {componentType === 'deviceEstimation' && (
              <div className="space-y-6">
                {/* Variant Selector */} 
                <div className="border-b pb-4 mb-4">
                  <DeviceEstimationVariantSelector
                    selectedVariant={(localConfig as DeviceEstimationConfig).variant || 'default'}
                    onChange={handleDeviceEstimationVariantChange} // Use specific handler
                    onVariantPreview={handleDeviceEstimationVariantChange} // Preview on hover/select
                    primaryColor={shopConfig.theme.primary}
                  />
                </div>

                {/* Page Texts Editor */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Page Texts (English)</h3>
                  <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium mb-1">Page Title</label>
                      <input
                        type="text"
                        value={((localConfig as DeviceEstimationConfig).pageTitle?.en) || ''}
                        onChange={(e) => handleTextChange('pageTitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estimation Result Title</label>
                      <input
                        type="text"
                        value={((localConfig as DeviceEstimationConfig).estimationResultTitle?.en) || ''}
                        onChange={(e) => handleTextChange('estimationResultTitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Checkout Button Text</label>
                      <input
                        type="text"
                        value={((localConfig as DeviceEstimationConfig).checkoutButtonText?.en) || ''}
                        onChange={(e) => handleTextChange('checkoutButtonText', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Questions Editor (Read-only structure) */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Questions (Read-only Structure)</h3>
                  <p className="text-xs text-gray-500 mb-3 italic">Question structure is defined in the configuration. You can edit text and options below.</p>
                  <div className="space-y-4">
                    {((localConfig as DeviceEstimationConfig).questions || []).map((question, qIndex) => (
                      <div key={question.id || qIndex} className="p-4 border rounded-md bg-white space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-md">Question {qIndex + 1} (ID: {question.id})</h4>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Question Text (EN)</label>
                          <textarea
                            value={typeof question.text === 'object' ? question.text.en || '' : question.text || ''}
                            onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Question Type</label>
                          <select
                            value={question.type}
                            onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value as DeviceEstimationQuestion['type'])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          >
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="slider">Slider</option>
                            <option value="text-input">Text Input</option>
                          </select>
                        </div>

                        {/* Options Editor (for multiple-choice) */}
                        {question.type === 'multiple-choice' && (
                          <div className="pl-4 mt-3 border-l-2 border-gray-200 space-y-3">
                            <h5 className="text-sm font-medium text-gray-700">Options</h5>
                            {(question.options || []).map((option, oIndex) => (
                              <div key={oIndex} className="p-3 border rounded-md bg-gray-50 space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-xs font-medium">Option {oIndex + 1}</label>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-0.5">Label (EN)</label>
                                  <input 
                                    type="text"
                                    value={typeof option.label === 'object' ? option.label.en || '' : option.label || ''}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'label', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-0.5">Value</label>
                                  <input 
                                    type="text"
                                    value={option.value || ''}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'value', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-0.5">Description (EN)</label>
                                  <input 
                                    type="text"
                                    value={typeof option.description === 'object' ? option.description.en || '' : typeof option.description === 'string' ? option.description : ''}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'description', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-0.5">Icon (e.g., emoji or slug)</label>
                                  <input 
                                    type="text"
                                    value={option.icon || ''}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, 'icon', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}