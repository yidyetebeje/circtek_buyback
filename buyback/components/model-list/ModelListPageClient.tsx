"use client";

import { useAtomValue, useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ModelListItemType, ComponentType, ShopConfig } from '@/types/shop';
import { Model } from '@/types/catalog';
import { 
  displayConfigAtom, 
  activeComponentAtom,
  previewConfigAtom,
  shopConfigAtom,
  editModeAtom
} from '@/store/atoms';
import { Header } from '@/components/layout/Header';
import { AutocompleteSearch } from '@/components/shared/AutocompleteSearch';
import { CardModelListVariant } from './variants/CardModelListVariant';
import { GridModelListVariant } from './variants/GridModelListVariant';
import { CardMinimalistVariant } from './variants/CardMinimalistVariant';
import { CardGradientAccentVariant } from './variants/CardGradientAccentVariant';
import { CardCenteredFocusVariant } from './variants/CardCenteredFocusVariant';
import { CardSplitViewVariant } from './variants/CardSplitViewVariant';
import { CardFloatingVariant } from './variants/CardFloatingVariant';
import { CardClassicElegantVariant } from './variants/CardClassicElegantVariant';
import { FeaturedModelListVariant } from './variants/FeaturedModelListVariant';
import { ConfigSidebar } from '@/components/config/ConfigSidebar';
import { ComponentEditor } from '@/components/config/ComponentEditor';
import { ConfigActionButtons } from '@/components/config/ConfigActionButtons';
import { useUpdateShopConfig } from '@/hooks/catalog/useShops';
// Import other variants here as they are created, e.g.:
// import { ListModelListVariant } from './variants/ListModelListVariant';

interface ModelListPageClientProps {
  initialModels: ModelListItemType[];
  currentLocale?: string;
  defaultLocale?: string;
  shopId: number;
  categorySlug: string;
}

export function ModelListPageClient({
  initialModels,
  currentLocale = 'en',
  defaultLocale = 'en',
  shopId,
  categorySlug,
}: ModelListPageClientProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isEditMode = useAtomValue(editModeAtom);
  const canEdit = isAuthenticated && isEditMode;

  const displayConfig = useAtomValue(displayConfigAtom);
  const activeComponent = useAtomValue(activeComponentAtom);
  const previewConfValue = useAtomValue(previewConfigAtom);
  const setActiveComponentSetter = useAtom(activeComponentAtom)[1];
  const setPreviewConfigSetter = useAtom(previewConfigAtom)[1];
  const setShopConfigSetter = useAtom(shopConfigAtom)[1];
  const router = useRouter();
  
  // Add the mutation hook for updating shop config
  const { mutate: updateShopConfig } = useUpdateShopConfig(shopId);

  const handleEditModelList = () => {
    setPreviewConfigSetter(null);
    setActiveComponentSetter('modelList' as ComponentType);
  };

  const handleModelSelect = (model: Model) => {
    console.log("Model selected, navigating to estimation page:", model);
    if (model.sef_url) {
      router.push(`/${currentLocale}/sell/${model.sef_url}/estimate`);
    } else {
      console.warn(`Model ${model.id} does not have a sef_url. Cannot navigate.`);
      // Optionally, redirect to a generic error page or show a notification
    }
  };

  const renderVariant = () => {
    switch (displayConfig.modelListVariant) {
      case 'classicElegant':
        return <CardClassicElegantVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'card':
        return <CardModelListVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'grid':
        return <GridModelListVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'minimalist':
        return <CardMinimalistVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'gradientAccent':
        return <CardGradientAccentVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'centeredFocus':
        return <CardCenteredFocusVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'splitView':
        return <CardSplitViewVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'floating':
        return <CardFloatingVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      case 'featured':
        return <FeaturedModelListVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
      default:
        return <CardClassicElegantVariant models={initialModels} theme={displayConfig.theme} design={displayConfig.design} currentLocale={currentLocale} defaultLocale={defaultLocale} />;
    }
  };

  // Handle saving config changes to the backend
  const handleSaveConfigToBackend = (config: ShopConfig) => {
    if (shopId) {
      updateShopConfig(config, {
        onSuccess: () => {
          console.log('Shop configuration updated successfully');
        },
        onError: (error) => {
          console.error('Failed to update shop configuration:', error);
        }
      });
    }
  };

  // Update handleCloseEditor to only update local config, not backend
  const handleCloseEditor = () => {
    if (previewConfValue) {
      // Only update local config - do NOT save to backend
      // Wait for user to explicitly publish changes
      setShopConfigSetter(previewConfValue);
    }
    setPreviewConfigSetter(null);
    setActiveComponentSetter(null);
  };

  return (
    <div style={{ backgroundColor: displayConfig.theme.background }} className="flex flex-col min-h-screen">
      <Header shopConfig={displayConfig} />

      <div className="container mx-auto px-4 py-8 md:py-12 relative flex-grow">
        <div className="mb-8 max-w-xl mx-auto">
          <AutocompleteSearch 
            shopId={shopId} 
            categorySlug={categorySlug} 
            onSelectModel={handleModelSelect}
            primaryColor={displayConfig.theme.primary}
            placeholder={`Search in ${categorySlug.replace(/-/g, ' ')}...`}
          />
        </div>

        {canEdit && (
          <button 
            onClick={handleEditModelList}
            className="absolute top-0 right-4 md:top-2 md:right-8 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all z-50 w-10 h-10 flex items-center justify-center"
            title="Edit Model List Style"
            aria-label="Edit Model List Style"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}

        {renderVariant()}
      </div>

      {canEdit && <ConfigSidebar onUpdateShopConfig={handleSaveConfigToBackend} />}
      {canEdit && <ConfigActionButtons onUpdateShopConfig={handleSaveConfigToBackend} />}
      {canEdit && (
        <ComponentEditor
          isOpen={activeComponent !== null}
          onClose={handleCloseEditor}
          onUpdateShopConfig={handleSaveConfigToBackend}
        />
      )}
    </div>
  );
} 