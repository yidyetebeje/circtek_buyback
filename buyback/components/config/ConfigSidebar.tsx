"use client";

import { useAtom } from "jotai";
import { ShopConfig, SectionOrdering } from "@/types/shop";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { configSidebarOpenAtom, configSidebarActiveTabAtom, editModeAtom } from "@/store/atoms";
import { useShopConfigManager } from "@/hooks/useShopConfig";
import { defaultShopConfig } from "@/config/defaultShopConfig";

interface ConfigSidebarProps {
  // Component still receives onConfigChange prop for compatibility, though we'll use Jotai internally
  onConfigChange?: (updatedConfig: Partial<ShopConfig>) => void;
  // New prop for updating the shop config on the backend
  onUpdateShopConfig?: (config: ShopConfig) => void;
}

export function ConfigSidebar({ onConfigChange }: ConfigSidebarProps) {
  const { 
    localConfig: shopConfig, 
    setLocalConfig: setShopConfig
  } = useShopConfigManager();
  const [isOpen, setIsOpen] = useAtom(configSidebarOpenAtom);
  const [activeTab, setActiveTab] = useAtom(configSidebarActiveTabAtom);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isEditMode] = useAtom(editModeAtom);

  // Prevent background scrolling/interaction when sidebar is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Hide entire sidebar (including gear button) if not in edit mode or not authenticated
  if (!isAuthenticated || !isEditMode) {
    return null;
  }

  const handleColorChange = (key: "primary" | "secondary" | "accent", value: string) => {
    const updatedConfig = {
      ...shopConfig,
      theme: {
        ...shopConfig.theme,
        [key]: value
      }
    };
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  const handleToggleFeature = (key: "showFeaturedProducts" | "showTestimonials" | "showPartners" | "showHelp" | "showStepProcess" | "showGlobalEarth" | "showFeedback" | "showFAQ", value: boolean) => {
    let updatedConfig: ShopConfig;

    if (key === "showFAQ") {
      // Toggle nested faq.showFAQ
      updatedConfig = {
        ...shopConfig,
        faq: {
          ...(shopConfig.faq || {}),
          showFAQ: value
        }
      } as ShopConfig;
    } else {
      updatedConfig = {
        ...shopConfig,
        [key]: value
      } as ShopConfig;
    }
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  const handleTextChange = (field: string, value: string) => {
    // Handle nested properties for hero section
    if (field.startsWith("hero")) {
      const heroField = field.split(".")[1];
      const updatedConfig = {
        ...shopConfig,
        heroSection: {
          ...shopConfig.heroSection,
          [heroField]: value
        }
      };
      
      setShopConfig(updatedConfig);
      // No longer calling onConfigChange here as we want changes to be local
      return;
    }

    // For shop name or other direct properties
    const updatedConfig = {
      ...shopConfig,
      [field]: value
    };
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  const handleDesignChange = (field: string, value: string | boolean) => {
    // Get the path to the property
    const path = field.split('.');
    
    // Make a deep copy of the design object
    const updatedDesign = shopConfig.design ? 
      JSON.parse(JSON.stringify(shopConfig.design)) : 
      {
        borderRadius: { button: "0.5rem", card: "1rem", input: "0.375rem" },
        spacing: { sectionPadding: "5rem" },
        layout: "default",
        darkMode: false
      };
    
    // Navigate to the right property and set its value
    let current = updatedDesign;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    const updatedConfig = {
      ...shopConfig,
      design: updatedDesign
    };
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  const handleSectionOrderChange = (section: keyof SectionOrdering, value: number) => {
    const updatedSectionOrder = {
      ...(shopConfig.sectionOrder || {
        categories: 1,
        featuredProducts: 2,
        testimonials: 3,
        partners: 4
      }),
      [section]: value
    };
    
    const updatedConfig = {
      ...shopConfig,
      sectionOrder: updatedSectionOrder
    };
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  const handleLayoutChange = (layout: 'default' | 'compact' | 'spacious') => {
    const updatedDesign = {
      ...(shopConfig.design || {
        borderRadius: { button: "0.5rem", card: "1rem", input: "0.375rem" },
        spacing: { sectionPadding: "5rem" },
        darkMode: false
      }),
      layout
    };
    
    const updatedConfig = {
      ...shopConfig,
      design: updatedDesign
    };
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  const handleDarkModeToggle = (isDarkMode: boolean) => {
    const updatedDesign = {
      ...(shopConfig.design || {
        borderRadius: { button: "0.5rem", card: "1rem", input: "0.375rem" },
        spacing: { sectionPadding: "5rem" },
        layout: "default"
      }),
      darkMode: isDarkMode
    };
    
    const updatedConfig = {
      ...shopConfig,
      design: updatedDesign
    };
    
    setShopConfig(updatedConfig);
    // No longer calling onConfigChange here as we want changes to be local
  };

  return (
    <>
      {/* Floating Action Button */}
      {isAuthenticated && (
        <button
          onClick={handleToggle}
          className="fixed bottom-24 left-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: shopConfig.theme.primary, color: "#fff" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      {isAuthenticated && (
        <div 
          className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Configuration</h2>
              <div className="flex items-center space-x-2">
                {/* Publish/discard buttons have been moved outside the sidebar */}
                <button 
                  onClick={handleToggle}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('general')}
              >
                General
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'design' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('design')}
              >
                Design
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'sections' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('sections')}
              >
                Sections
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'advanced' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('advanced')}
              >
                Advanced
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {/* General Tab */}
              {activeTab === 'general' && (
                <>
                  {/* Shop Name */}
                  <div>
                    <h3 className="font-medium mb-2">Shop Name</h3>
                    <input
                      type="text"
                      value={shopConfig.shopName}
                      onChange={(e) => handleTextChange("shopName", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Theme Colors */}
                  <div>
                    <h3 className="font-medium mb-2">Theme Colors</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Primary</label>
                        <input
                          type="color"
                          value={shopConfig.theme.primary}
                          onChange={(e) => handleColorChange("primary", e.target.value)}
                          className="w-full h-10 rounded border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Secondary</label>
                        <input
                          type="color"
                          value={shopConfig.theme.secondary}
                          onChange={(e) => handleColorChange("secondary", e.target.value)}
                          className="w-full h-10 rounded border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Accent</label>
                        <input
                          type="color"
                          value={shopConfig.theme.accent}
                          onChange={(e) => handleColorChange("accent", e.target.value)}
                          className="w-full h-10 rounded border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero Section */}
                  <div>
                    <h3 className="font-medium mb-2">Hero Section</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-1">Title</label>
                        <input
                          type="text"
                          value={shopConfig.heroSection.title}
                          onChange={(e) => handleTextChange("hero.title", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={shopConfig.heroSection.subtitle}
                          onChange={(e) => handleTextChange("hero.subtitle", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Description</label>
                        <textarea
                          value={shopConfig.heroSection.description || ""}
                          onChange={(e) => handleTextChange("hero.description", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Design Tab */}
              {activeTab === 'design' && (
                <>
                  {/* Layout Options */}
                  <div>
                    <h3 className="font-medium mb-2">Layout Style</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        className={`p-3 border rounded-md flex flex-col items-center ${(shopConfig.design?.layout || 'default') === 'default' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => handleLayoutChange('default')}
                      >
                        <div className="w-full h-12 bg-gray-200 rounded-md mb-2 flex flex-col">
                          <div className="h-3 w-full bg-gray-300 rounded-t-md"></div>
                          <div className="flex-1 flex flex-col justify-around p-1">
                            <div className="h-1 bg-gray-300 rounded w-full"></div>
                            <div className="h-1 bg-gray-300 rounded w-full"></div>
                          </div>
                        </div>
                        <span className="text-xs font-medium">Default</span>
                      </button>
                      <button
                        className={`p-3 border rounded-md flex flex-col items-center ${(shopConfig.design?.layout || 'default') === 'compact' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => handleLayoutChange('compact')}
                      >
                        <div className="w-full h-12 bg-gray-200 rounded-md mb-2 flex flex-col">
                          <div className="h-2 w-full bg-gray-300 rounded-t-md"></div>
                          <div className="flex-1 flex flex-col justify-around p-1">
                            <div className="h-1 bg-gray-300 rounded w-full"></div>
                            <div className="h-1 bg-gray-300 rounded w-full"></div>
                            <div className="h-1 bg-gray-300 rounded w-full"></div>
                          </div>
                        </div>
                        <span className="text-xs font-medium">Compact</span>
                      </button>
                      <button
                        className={`p-3 border rounded-md flex flex-col items-center ${(shopConfig.design?.layout || 'default') === 'spacious' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => handleLayoutChange('spacious')}
                      >
                        <div className="w-full h-12 bg-gray-200 rounded-md mb-2 flex flex-col">
                          <div className="h-4 w-full bg-gray-300 rounded-t-md"></div>
                          <div className="flex-1 flex flex-col justify-around p-1">
                            <div className="h-1 bg-gray-300 rounded w-full"></div>
                          </div>
                        </div>
                        <span className="text-xs font-medium">Spacious</span>
                      </button>
                    </div>
                  </div>

                  {/* Border Radius */}
                  <div>
                    <h3 className="font-medium mb-2">Corner Roundness</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-1">Buttons</label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={parseFloat((shopConfig.design?.borderRadius?.button || "0.5rem").replace("rem", "")) * 10}
                          onChange={(e) => handleDesignChange("borderRadius.button", `${Number(e.target.value) / 10}rem`)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Square</span>
                          <span>Rounded</span>
                          <span>Pill</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Cards</label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={parseFloat((shopConfig.design?.borderRadius?.card || "1rem").replace("rem", "")) * 10}
                          onChange={(e) => handleDesignChange("borderRadius.card", `${Number(e.target.value) / 10}rem`)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Square</span>
                          <span>Rounded</span>
                          <span>Very Rounded</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spacing */}
                  <div>
                    <h3 className="font-medium mb-2">Section Spacing</h3>
                    <div>
                      <input
                        type="range"
                        min="2"
                        max="12"
                        value={parseFloat((shopConfig.design?.spacing?.sectionPadding || "5rem").replace("rem", ""))}
                        onChange={(e) => handleDesignChange("spacing.sectionPadding", `${e.target.value}rem`)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Compact</span>
                        <span>Standard</span>
                        <span>Spacious</span>
                      </div>
                    </div>
                  </div>

                  {/* Dark Mode */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Dark Mode</h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={shopConfig.design?.darkMode || false}
                          onChange={(e) => handleDarkModeToggle(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Sections Tab */}
              {activeTab === 'sections' && (
                <>
                  {/* Feature Toggles */}
                  <div>
                    <h3 className="font-medium mb-2">Sections</h3>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 italic">Enable or disable sections:</p>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="categories" className="flex-1">Categories</label>
                        <span className="text-sm text-gray-500">Always shown</span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="featuredProducts" className="flex-1">Featured Products</label>
                        <input
                          type="checkbox"
                          id="featuredProducts"
                          checked={shopConfig.showFeaturedProducts}
                          onChange={(e) => handleToggleFeature("showFeaturedProducts", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="testimonials" className="flex-1">Testimonials</label>
                        <input
                          type="checkbox"
                          id="testimonials"
                          checked={shopConfig.showTestimonials}
                          onChange={(e) => handleToggleFeature("showTestimonials", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="partners" className="flex-1">Partners</label>
                        <input
                          type="checkbox"
                          id="partners"
                          checked={shopConfig.showPartners}
                          onChange={(e) => handleToggleFeature("showPartners", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="stepProcessSection" className="flex-1">Step Process</label>
                        <input
                          type="checkbox"
                          id="stepProcessSection"
                          checked={shopConfig.showStepProcess !== false}
                          onChange={(e) => handleToggleFeature("showStepProcess", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="globalEarthSection" className="flex-1">Global Earth</label>
                        <input
                          type="checkbox"
                          id="globalEarthSection"
                          checked={shopConfig.showGlobalEarth !== false}
                          onChange={(e) => handleToggleFeature("showGlobalEarth", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="feedbackSection" className="flex-1">Feedback Section</label>
                        <input
                          type="checkbox"
                          id="feedbackSection"
                          checked={shopConfig.showFeedback !== false}
                          onChange={(e) => handleToggleFeature("showFeedback", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="helpSection" className="flex-1">Help Section</label>
                        <input
                          type="checkbox"
                          id="helpSection"
                          checked={shopConfig.showHelp !== false}
                          onChange={(e) => handleToggleFeature("showHelp", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <label htmlFor="faqSection" className="flex-1">FAQ Section</label>
                        <input
                          type="checkbox"
                          id="faqSection"
                          checked={shopConfig.faq?.showFAQ !== false}
                          onChange={(e) => handleToggleFeature("showFAQ", e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Order */}
                  <div>
                    <h3 className="font-medium mb-2">Section Order</h3>
                    <p className="text-xs text-gray-500 italic mb-3">Drag to reorder sections:</p>
                    <div className="space-y-2">
                      <div className="flex items-center bg-gray-50 p-3 rounded-md">
                        <span className="mr-2 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </span>
                        <span className="flex-1">Categories</span>
                        <select 
                          value={shopConfig.sectionOrder?.categories || 1}
                          onChange={(e) => handleSectionOrderChange("categories", parseInt(e.target.value))}
                          className="bg-white border border-gray-300 rounded px-2 py-1"
                        >
                          {Array.from({length:10}, (_,i)=>i+1).map(n=> (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      {shopConfig.showFeaturedProducts && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Featured Products</span>
                          <select 
                            value={shopConfig.sectionOrder?.featuredProducts || 2}
                            onChange={(e) => handleSectionOrderChange("featuredProducts", parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {shopConfig.showTestimonials && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Testimonials</span>
                          <select 
                            value={shopConfig.sectionOrder?.testimonials || 3}
                            onChange={(e) => handleSectionOrderChange("testimonials", parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {shopConfig.showPartners && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Partners</span>
                          <select 
                            value={shopConfig.sectionOrder?.partners || 4}
                            onChange={(e) => handleSectionOrderChange("partners", parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {shopConfig.showStepProcess !== false && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Step Process</span>
                          <select
                            value={shopConfig.sectionOrder?.stepProcess || 5}
                            onChange={(e)=>handleSectionOrderChange("stepProcess",parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                      )}
                      {shopConfig.showGlobalEarth !== false && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Global Earth</span>
                          <select
                            value={shopConfig.sectionOrder?.globalEarth || 6}
                            onChange={(e)=>handleSectionOrderChange("globalEarth",parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                      )}
                      {shopConfig.showFeedback !== false && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Feedback</span>
                          <select
                            value={shopConfig.sectionOrder?.feedback || 7}
                            onChange={(e)=>handleSectionOrderChange("feedback",parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                      )}
                      {shopConfig.faq?.showFAQ !== false && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">FAQ</span>
                          <select
                            value={shopConfig.sectionOrder?.faq || 8}
                            onChange={(e)=>handleSectionOrderChange("faq",parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                      )}
                      {shopConfig.showHelp !== false && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-md">
                          <span className="mr-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </span>
                          <span className="flex-1">Help</span>
                          <select
                            value={shopConfig.sectionOrder?.help || 9}
                            onChange={(e)=>handleSectionOrderChange("help",parseInt(e.target.value))}
                            className="bg-white border border-gray-300 rounded px-2 py-1"
                          >
                            {Array.from({length:10}, (_,i)=>i+1).map(n=> (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Advanced Tab */}
              {activeTab === 'advanced' && (
                <>
                  <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md mb-4">
                    <p className="text-sm text-yellow-800">Advanced settings let you fine-tune your shop experience.</p>
                  </div>

                  {/* Export Config Button */}
                  <div>
                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shopConfig, null, 2));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", `shop-config-${shopConfig.shopId}.json`);
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Configuration
                    </button>
                  </div>

                  {/* Reset Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to reset all settings to default?")) {
                          // Only update local config, don't send to backend
                          // The user will need to press publish to save these changes
                          setShopConfig(defaultShopConfig);
                          if (onConfigChange) {
                            onConfigChange(defaultShopConfig);
                          }
                          // Don't save to backend - wait for explicit publish
                        }
                      }}
                      className="w-full py-2 px-4 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Reset All Settings
                    </button>
                  </div>
                  
                  {/* Close Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-full py-2 rounded-lg text-white hover:bg-opacity-90 transition-colors"
                      style={{ backgroundColor: shopConfig.theme.primary }}
                    >
                      Close Settings
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && isAuthenticated && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={handleToggle}
        />
      )}
    </>
  );
} 