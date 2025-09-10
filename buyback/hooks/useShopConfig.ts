import { useAtomValue, useAtom } from 'jotai';
import { 
  shopConfigAtom, 
  displayConfigAtom, 
  previewConfigAtom, 
  setShopConfigAction,
  backendShopConfigAtom,
  setBackendShopConfigAction,
  configIsDirtyAtom
} from '@/store/atoms';
import { ShopConfig } from '@/types/shop';

/**
 * Hook to access the current shop configuration (local changes)
 * @returns The current shop configuration
 */
export function useShopConfig(): ShopConfig {
  return useAtomValue(shopConfigAtom);
}

/**
 * Hook to access the display shop configuration (including preview if active)
 * @returns The display shop configuration (preview takes precedence if available)
 */
export function useDisplayShopConfig(): ShopConfig {
  return useAtomValue(displayConfigAtom);
}

/**
 * Hook to access the preview shop configuration
 * @returns The preview shop configuration or null if not in preview mode
 */
export function usePreviewShopConfig(): ShopConfig | null {
  return useAtomValue(previewConfigAtom);
}

/**
 * Hook to access the backend (saved) shop configuration
 * @returns The backend shop configuration
 */
export function useBackendShopConfig(): ShopConfig {
  return useAtomValue(backendShopConfigAtom);
}

/**
 * Hook to set the shop configuration (local changes)
 * @returns A function to set the shop configuration
 */
export function useSetShopConfig() {
  return useAtomValue(setShopConfigAction);
}

/**
 * Hook to set the backend shop configuration
 * @returns A function to set the backend shop configuration
 */
export function useSetBackendShopConfig() {
  return useAtomValue(setBackendShopConfigAction);
}

/**
 * Hook to check if there are unsaved changes
 * @returns Boolean indicating if local config differs from backend
 */
export function useConfigIsDirty(): boolean {
  return useAtomValue(configIsDirtyAtom);
}

/**
 * Hook to manage shop config changes and publishing
 * @returns Object with functions and state for shop config management
 */
export function useShopConfigManager() {
  const [localConfig, setLocalConfig] = useAtom(shopConfigAtom);
  const [backendConfig, setBackendConfig] = useAtom(backendShopConfigAtom);
  const isDirty = useConfigIsDirty();
  
  // Function to publish local changes to backend
  const publishChanges = async (updateCallback?: (config: ShopConfig) => Promise<void> | void) => {
    // If there's a callback to update the backend, call it
    if (updateCallback) {
      await updateCallback(localConfig);
    }
    
    // Update backend config to match local config
    setBackendConfig(localConfig);
  };
  
  // Function to discard local changes
  const discardChanges = () => {
    // Reset local config to match backend config
    setLocalConfig(backendConfig);
  };
  
  return {
    localConfig,
    backendConfig,
    setLocalConfig,
    isDirty,
    publishChanges,
    discardChanges
  };
}
