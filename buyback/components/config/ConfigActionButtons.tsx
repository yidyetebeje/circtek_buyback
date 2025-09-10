'use client';

import { useSession } from 'next-auth/react';
import { useShopConfigManager } from '@/hooks/useShopConfig';
import { useAtomValue } from "jotai";
import { editModeAtom } from "@/store/atoms";
import { ShopConfig } from "@/types/shop";

interface ConfigActionButtonsProps {
  onUpdateShopConfig?: (config: ShopConfig) => void;
}

export function ConfigActionButtons({ onUpdateShopConfig }: ConfigActionButtonsProps) {
  const { 
    isDirty,
    publishChanges,
    discardChanges
  } = useShopConfigManager();
  
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isEditMode = useAtomValue(editModeAtom);
  
  // Don't show anything if there are no changes or user is not authenticated
  if (!isDirty || !isAuthenticated || !isEditMode) {
    return null;
  }
  
  // Handle publishing changes to the backend
  const handlePublishChanges = async () => {
    await publishChanges(async (config) => {
      if (onUpdateShopConfig) {
        await onUpdateShopConfig(config);
      }
    });
  };
  
  // Handle discarding changes
  const handleDiscardChanges = () => {
    discardChanges();
  };
  
  return (
    <div className="fixed bottom-24 right-6 z-50 flex space-x-2 bg-white shadow-lg rounded-lg p-3 border border-gray-200">
      <div className="flex flex-col items-start mr-2">
        <span className="text-sm font-medium text-gray-700">Unsaved changes</span>
        <span className="text-xs text-gray-500">Publish to save your changes</span>
      </div>
      <button
        onClick={handlePublishChanges}
        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Publish
      </button>
      <button
        onClick={handleDiscardChanges}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
      >
        Discard
      </button>
    </div>
  );
}
