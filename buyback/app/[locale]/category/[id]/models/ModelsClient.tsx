"use client";

import { ModelListPageClient } from '@/components/model-list/ModelListPageClient';
import { ModelListItemType } from '@/types/shop';

interface ModelsClientProps {
  initialModels: ModelListItemType[];
  currentLocale: string;
  defaultLocale: string;
  shopId: number;
  categorySlug: string;
}

export function ModelsClient({
  initialModels,
  currentLocale,
  defaultLocale,
  shopId,
  categorySlug,
}: ModelsClientProps) {
  // The main purpose of this client component is to receive server-fetched data
  // and pass it to ModelListPageClient, which might have its own client-side interactions.
  // If there were any client-specific logic for this page (e.g. complex state not inside ModelListPageClient)
  // it would go here.

  // The server component now handles the "no models found" and error states before rendering this component.
  // So, initialModels should typically be a non-empty array here if rendering proceeds.

  return (
    <ModelListPageClient
      initialModels={initialModels}
      currentLocale={currentLocale}
      defaultLocale={defaultLocale}
      shopId={shopId}
      categorySlug={categorySlug}
    />
  );
} 