import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { ShopConfig, ComponentType } from '@/types/shop';
import { defaultShopConfig } from '@/config/defaultShopConfig';
import { Model as CatalogModel } from '@/types/catalog';
import { isEqual } from 'lodash';

// Helper function to create properly typed storage for different atom types
function createBrowserStorage<T>() {
  return createJSONStorage<T>(() => {
    // Only use localStorage in browser environments
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    
    // Fallback for non-browser environments (SSR)
    return {
      getItem: (): string | null => null,
      setItem: (): void => { /* No-op for SSR */ },
      removeItem: (): void => { /* No-op for SSR */ }
    };
  });
} 

// Main shop configuration atom with localStorage persistence - this tracks the local changes
export const shopConfigAtom = atomWithStorage<ShopConfig>('shop-config', defaultShopConfig, createBrowserStorage<ShopConfig>());

// Backend shop configuration atom - this represents what's saved on the server
export const backendShopConfigAtom = atomWithStorage<ShopConfig>('backend-shop-config', defaultShopConfig, createBrowserStorage<ShopConfig>());

// Function to set shop config - useful for server components
export const setShopConfigAction = atom(
  null,
  (get, set, shopConfig: ShopConfig) => {
    set(shopConfigAtom, shopConfig);
  }
);

// Function to set backend shop config
export const setBackendShopConfigAction = atom(
  null,
  (get, set, shopConfig: ShopConfig) => {
    set(backendShopConfigAtom, shopConfig);
  }
);

// Preview configuration atom for live previews without saving (intentionally not persisted)
export const previewConfigAtom = atom<ShopConfig | null>(null);

// Atom for the active component being edited
export const activeComponentAtom = atom<ComponentType | null>(null);

// Computed atom that determines which config to use (preview takes precedence if available)
export const displayConfigAtom = atom((get) => {
  const previewConfig = get(previewConfigAtom);
  const shopConfig = get(shopConfigAtom);
  return previewConfig || shopConfig;
});

// Computed atom to check if local config differs from backend config
export const configIsDirtyAtom = atom((get) => {
  const localConfig = get(shopConfigAtom);
  const backendConfig = get(backendShopConfigAtom);
  return !isEqual(localConfig, backendConfig);
});

// Editor state atoms with localStorage persistence for better UX
export const activeHeroTabAtom = atomWithStorage<'basic' | 'translations'>(
  'active-hero-tab', 
  'basic', 
  createBrowserStorage<'basic' | 'translations'>()
);

export const activeCategoryTabAtom = atomWithStorage<'basic' | 'translations' | 'buttonTexts'>(
  'active-category-tab', 
  'basic', 
  createBrowserStorage<'basic' | 'translations' | 'buttonTexts'>()
);

export const configSidebarOpenAtom = atomWithStorage<boolean>(
  'config-sidebar-open', 
  false, 
  createBrowserStorage<boolean>()
);

export const configSidebarActiveTabAtom = atomWithStorage<'general' | 'design' | 'sections' | 'advanced'>(
  'config-sidebar-active-tab', 
  'general', 
  createBrowserStorage<'general' | 'design' | 'sections' | 'advanced'>()
);

// Atoms for Device Estimation Page
export const currentDeviceEstimationQuestionIndexAtom = atom<number>(0);
export const userDeviceAnswersAtom = atom<Record<string, string>>({}); // Stores answers as { questionId: value }
export const estimatedDevicePriceAtom = atom<number | null>(null);

// Atom for In-Progress Device Estimations (Cart)
export interface InProgressEstimation {
  deviceId: string; // Corresponds to modelSefUrl
  deviceModel: CatalogModel;
  answers: Record<string, string>;
  currentQuestionIndex: number;
  estimatedPrice?: number | null;
  lastUpdatedAt: number; // Timestamp
}

export const estimationCartAtom = atomWithStorage<InProgressEstimation[]>(
  'estimation-cart',
  [],
  createBrowserStorage<InProgressEstimation[]>()
);

// Language Management Atoms
export interface Language {
  id: string;
  code: string; // e.g., 'en', 'nl', 'fr', 'de'
  name: string; // e.g., 'English', 'Nederlands', 'Français', 'Deutsch'
  nativeName: string; // e.g., 'English', 'Nederlands', 'Français', 'Deutsch'
  flag?: string; // Optional flag emoji or URL
  isDefault: boolean;
  isActive: boolean;
}

// Available languages from the API
export const availableLanguagesAtom = atom<Language[]>([]);

// Simplified language state structure - no longer needs version tracking
export interface LanguageState {
  code: string;
}

// Current selected language without localStorage persistence
export const currentLanguageStateAtom = atom<LanguageState>(
  { code: '' } // Will be set to URL locale or detected language
);

// Simplified atom that just exposes the language code for easier access
export const currentLanguageAtom = atom<string, [string], void>(
  (get) => get(currentLanguageStateAtom).code,
  (get, set, code) => {
    set(currentLanguageStateAtom, { code });
  }
);

// Language loading state
export const languageLoadingAtom = atom<boolean>(false);

// Computed atom to get the current language object
export const currentLanguageObjectAtom = atom((get) => {
  const currentLangCode = get(currentLanguageAtom);
  const availableLanguages = get(availableLanguagesAtom);
  
  return availableLanguages.find(lang => lang.code === currentLangCode) || 
         availableLanguages.find(lang => lang.isDefault) ||
         availableLanguages[0] ||
         null;
});

// Action to set language
export const setLanguageAction = atom(
  null,
  (get, set, languageCode: string) => {
    const availableLanguages = get(availableLanguagesAtom);
    const language = availableLanguages.find(lang => lang.code === languageCode);
    
    if (language && language.isActive) {
      set(currentLanguageAtom, languageCode);
      // Optionally trigger any language change effects here
    }
  }
);

// Add an atom to track whether the admin is currently in "customize" mode (edit mode)
export const editModeAtom = atom<boolean>(false); 