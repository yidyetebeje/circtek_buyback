'use client';

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { shopConfigAtom, backendShopConfigAtom } from '@/store/atoms';
import { ShopConfig } from '@/types/shop';

interface ShopConfigProviderProps {
  config: ShopConfig;
  children: React.ReactNode;
}

export function ShopConfigProvider({ config, children }: ShopConfigProviderProps) {
  const setShopConfig = useSetAtom(shopConfigAtom);
  const setBackendShopConfig = useSetAtom(backendShopConfigAtom);

  useEffect(() => {
    // Initialize both the local and backend configurations
    setShopConfig(config);
    setBackendShopConfig(config);
  }, [config, setShopConfig, setBackendShopConfig]);

  return <>{children}</>;
} 