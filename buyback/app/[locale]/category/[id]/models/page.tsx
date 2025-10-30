// Removed "use client";

// Removed: import { ModelListPageClient } from '@/components/model-list/ModelListPageClient';
// Removed: import { usePublishedModelsByCategorySlug } from '@/hooks/catalog/useShops';
// Removed: import { useState, useEffect } from 'react';
import { Metadata } from "next";
import { ModelListItemType } from '@/types/shop';
import { Model } from '@/types/catalog';
import { ModelsClient } from '@/app/[locale]/category/[id]/models/ModelsClient';
import { shopService } from '@/lib/api/catalog/shopService';

// Define the proper interface for the page component props with Next.js 15
interface ModelsByCategoryPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for the category models page
export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "buyback.example.com";
  let shopName = "Buyback Service";
  let categoryName = id;
  
  try {
    // Get shop info for the shop name
    if (shopId) {
      const shopInfo = await shopService.getShopById(shopId);
      shopName = shopInfo.data.name || "Buyback Service";
      
      // Since we don't have a direct getCategories method, we'll use the category slug as the name
      // This is a simpler approach that doesn't require additional API calls
      // In a production environment, you'd want to fetch the actual category name from an API
      try {
        // Format the category slug to be more readable
        categoryName = id
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } catch (categoryError) {
        console.error('Error formatting category name for metadata:', categoryError);
      }
    }
  } catch (error) {
    console.error("Error fetching shop info for category page metadata:", error);
  }
  
  // Format category name for display (convert slug to readable text if needed)
  const formattedCategoryName = categoryName
    .split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return {
    title: `${formattedCategoryName} Devices | Sell at ${shopName}`,
    description: `Get the best trade-in value for your ${formattedCategoryName}. Instant quotes, fast payment, and secure service at ${shopName}.`,
    keywords: [formattedCategoryName, "sell devices", "trade in", "buyback", "cash for electronics", shopName],
    alternates: {
      canonical: `/${locale}/category/${id}/models`,
      languages: {
        'en': `/en/category/${id}/models`,
        'nl': `/nl/category/${id}/models`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale,
      url: `https://${domain}/${locale}/category/${id}/models`,
      title: `${formattedCategoryName} Devices | Sell at ${shopName}`,
      description: `Get the best trade-in value for your ${formattedCategoryName}. Instant quotes, fast payment, and secure service at ${shopName}.`,
      siteName: shopName,
    },
    twitter: {
      card: "summary",
      title: `${formattedCategoryName} Devices | Sell at ${shopName}`,
      description: `Get the best trade-in value for your ${formattedCategoryName}. Instant quotes, fast payment, and secure service at ${shopName}.`,
    },
  };
}

// Utility to map backend models to frontend ModelListItemType
const mapBackendModelsToFrontend = (
  backendModels: Model[]
): ModelListItemType[] => {
  return backendModels.map(model => ({
    id: (model.id ?? '').toString(),
    name: model.title ?? '',
    sef_url: model.sef_url ?? '',
    description: model.description || '',
    price: model.base_price || 0,
    imageUrl: model.model_image || '',
    categoryId: (model.category_id ?? '').toString(),
    categoryName: '', // This can be populated separately if needed
    badges: [],
    detailsLink: `/model/${model.sef_url ?? ''}`
  }));
};

// Actual server-side data fetching logic using shopService
async function fetchPublishedModelsData(
  shopId: number,
  categorySlug: string,
  options: { orderBy: string; order: 'asc' | 'desc'; limit: number }
): Promise<Model[]> {
  try {
    
    const response = await shopService.getPublishedModelsByCategorySlug(shopId, categorySlug, options);
    // Assuming the actual models are in response.data based on PaginatedResponse<Model>
    console.log("response.data", response.data, response);
    return response.data; 
  } catch (error) {
    console.error('Error fetching published models via shopService:', error);
    // You might want to throw a more specific error or handle it based on type
    if (error instanceof Error) {
      throw new Error(`Failed to fetch models from service: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching models.');
  }
}

// Helper to get category name from ID (simple version for demo)
// const getCategoryNameFromId = (categoryId: string): string => {
// ... (keep existing commented out code or remove if not needed)
// };

export default async function ModelsByCategoryPage({ 
  params
}: ModelsByCategoryPageProps) {
  // Use await to unpack the promise
  const { locale, id: categorySlug } = await params;
  
  // Use NEXT_PUBLIC_SHOP_ID as requested
  const shopOwnerIdString = process.env.NEXT_PUBLIC_SHOP_ID;
  
  if (!shopOwnerIdString) {
    console.error('NEXT_PUBLIC_SHOP_ID is not defined in environment variables.');
    // Handle the error appropriately - perhaps return an error page or throw
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <p className="text-red-500">Configuration error: Shop owner ID is not set.</p>
      </div>
    );
  }
  const shopId = parseInt(shopOwnerIdString);
  
  let models: ModelListItemType[] = [];
  let errorFetching: string | null = null;
  
  

  try {
    const backendModels = await fetchPublishedModelsData(
      shopId, 
      categorySlug,
      {
        orderBy: 'title',
        order: 'asc' as 'asc' | 'desc',
        limit: 50
      }
    );


    models = mapBackendModelsToFrontend(backendModels);
    
  } catch (error) {
    console.error('Error fetching models on server page:', error);
    errorFetching = error instanceof Error ? error.message : 'Unknown error fetching models';
    models = []; // Ensure models is an empty array on error
  }

  if (errorFetching) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <p className="text-red-500">Error loading models: {errorFetching}</p>
        <p>Please try again later.</p>
      </div>
    );
  }

  if (models.length === 0 && !errorFetching) { // Check !errorFetching to distinguish from an error case
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p>No models found in this category.</p>
      </div>
    );
  }

  return (
    <ModelsClient
      initialModels={models} 
      currentLocale={locale} 
      defaultLocale="en" 
      shopId={shopId}
      categorySlug={categorySlug}
    />
  );
} 