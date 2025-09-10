import { DeviceEstimationPageClient } from '@/components/device-estimation/DeviceEstimationPageClient';
// Remove DeviceInformation from @/types/shop, as we'll use the richer Model from catalog
// import { DeviceInformation } from '@/types/shop'; 
import { defaultShopConfig } from '@/config/defaultShopConfig';
import { shopService } from '@/lib/api/catalog/shopService'; // Import shopService
import { Model } from '@/types/catalog'; // Import the updated Model type
import { notFound } from 'next/navigation'; // For 404 handling
import { Metadata } from 'next';

interface DeviceEstimatePageProps {
  params: Promise<{
    deviceId: string; // This is the modelSefUrl
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for the device estimation page
export async function generateMetadata({ params }: { params: Promise<{ locale: string, deviceId: string }> }): Promise<Metadata> {
  const { locale, deviceId: modelSefUrl } = await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "buyback.example.com";
  
  let deviceDetails: Model | null = null;
  let shopName = "Buyback Service";
  
  try {
    // Get shop info for metadata
    const shopInfo = await shopService.getShopById(shopId);
    shopName = shopInfo.data.name || "Buyback Service";
    
    // Get device details for the title and description
    const deviceResponse = await shopService.getPublishedModelDetailsBySefUrl(shopId, modelSefUrl);
    if (deviceResponse.data) {
      deviceDetails = deviceResponse.data;
    }
  } catch (error) {
    console.error(`Error fetching data for device estimation page metadata:`, error);
  }
  
  // Create a device name for the title
  let deviceName = modelSefUrl
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // If we have device details, use the actual title
  if (deviceDetails) {
    deviceName = deviceDetails.title || deviceName;
  }
  
  // Generate appropriate description based on device details
  let description = `Get an instant quote for your ${deviceName}. Sell it for the best price at ${shopName}.`;
  if (deviceDetails && deviceDetails.description) {
    description = `${deviceDetails.description.substring(0, 100)}... Get a quote and sell your ${deviceName} at ${shopName}.`;
  }
  
  return {
    title: `Sell Your ${deviceName} | Get an Instant Quote`,
    description,
    keywords: [deviceName, "sell device", "trade in", "price quote", "instant estimate", shopName],
    alternates: {
      canonical: `/${locale}/sell/${modelSefUrl}/estimate`,
      languages: {
        'en': `/en/sell/${modelSefUrl}/estimate`,
        'nl': `/nl/sell/${modelSefUrl}/estimate`,
      },
    },
    openGraph: {
      type: "website",
      locale,
      url: `https://${domain}/${locale}/sell/${modelSefUrl}/estimate`,
      title: `Sell Your ${deviceName} | Get an Instant Quote`,
      description,
      siteName: shopName,
      images: deviceDetails?.model_image ? [
        {
          url: deviceDetails.model_image,
          width: 800,
          height: 600,
          alt: deviceName,
        }
      ] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `Sell Your ${deviceName} | Get an Instant Quote`,
      description,
      images: deviceDetails?.model_image ? [deviceDetails.model_image] : undefined,
    },
  };
}

// This is a Server Component
export default async function DeviceEstimatePage({ params }: DeviceEstimatePageProps) {
  const { deviceId: modelSefUrl, locale } = await params;

  const shopOwnerIdString = process.env.NEXT_PUBLIC_SHOP_ID;
  if (!shopOwnerIdString) {
    console.error('NEXT_PUBLIC_SHOP_ID is not defined in environment variables.');
    // For a production app, you might want a more user-friendly error page
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Configuration Error</h1>
        <p>The shop owner ID is not configured. Please contact support.</p>
      </div>
    );
  }
  const shopId = parseInt(shopOwnerIdString);

  let deviceDetails: Model | null = null;
  let errorFetching: string | null = null;

  try {
    console.log(`Fetching model details for shopId: ${shopId}, modelSefUrl: ${modelSefUrl}`);
    const response = await shopService.getPublishedModelDetailsBySefUrl(shopId, modelSefUrl);
    console.log('API Response structure:', {
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      questionSetAssignments: response.data?.questionSetAssignments,
      questionSetAssignmentsLength: response.data?.questionSetAssignments?.length,
      firstQuestionSet: response.data?.questionSetAssignments?.[0]
    });
    
    if (response.data) {
      deviceDetails = response.data;
      console.log('Device details loaded successfully:', {
        title: deviceDetails.title,
        sefUrl: deviceDetails.sef_url,
        basePrice: deviceDetails.base_price,
        hasQuestionSetAssignments: !!deviceDetails.questionSetAssignments,
        questionSetAssignmentsCount: deviceDetails.questionSetAssignments?.length || 0
      });
      
             // Debug each question set assignment
       if (deviceDetails.questionSetAssignments) {
         deviceDetails.questionSetAssignments.forEach((qsa, index) => {
           console.log(`QuestionSetAssignment ${index}:`, {
             assignmentOrder: qsa.assignmentOrder,
             questionSetId: qsa.questionSet?.id,
             questionSetDisplayName: qsa.questionSet?.displayName,
             questionSetInternalName: qsa.questionSet?.internalName,
             questionsCount: qsa.questionSet?.questions?.length || 0
           });
          
          // Debug each question
          qsa.questionSet?.questions?.forEach((question, qIndex) => {
            console.log(`  Question ${qIndex}:`, {
              id: question.id,
              key: question.key,
              title: question.title,
              inputType: question.inputType,
              optionsCount: question.options?.length || 0,
              translationsCount: question.translations?.length || 0
            });
          });
        });
      }
    } else {
      // This case might indicate a 200 OK but no data, or an API structure change.
      // The service method should ideally throw an error or return a more specific error state.
      console.warn('Received success response but no data for model:', modelSefUrl);
      errorFetching = `Model data not found in response.`;
    }
  } catch (error: unknown) {
    console.error(`Error fetching model details for ${modelSefUrl} in shop ${shopId}:`, error);
    // Type guard for error handling
    let errorMessage = 'Failed to load device details. Please try again later.';
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosError = error as { response?: { status?: number } }; // Basic Axios error shape
      if (axiosError.response && axiosError.response.status === 404) {
        notFound(); 
        return; 
      }
    }
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    errorFetching = errorMessage;
  }

  if (errorFetching) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Error Loading Device</h1>
        <p>{errorFetching}</p>
        <a href={`/${locale}`} className="text-blue-500 hover:underline mt-4 inline-block">Go to Homepage</a>
      </div>
    );
  }

  if (!deviceDetails) {
    // This should ideally be caught by the 404 or errorFetching block, but as a fallback:
    console.error('Device details are null without specific error, using notFound() for modelSefUrl:', modelSefUrl);
    notFound();
    return; 
  }
  
  // The DeviceEstimationPageClient will need to be adapted to take this 'deviceDetails' (Model type)
  // or a mapped version of it.
  // For now, let's assume DeviceEstimationPageClient will be updated to accept 'Model' directly
  // or a prop that contains the Model.
  
  // We need to transform `deviceDetails` (type Model) to what `DeviceEstimationPageClient` expects.
  // The old `initialDevice` was `DeviceInformation`.
  // Let's prepare a prop that `DeviceEstimationPageClient` can use.
  // It needs: id (sef_url), name (title), imageUrl (model_image), description,
  // base_price, and questions (from questionSetAssignments).

  // The DeviceEstimationPageClient expects 'initialDevice' of type 'DeviceInformation'
  // We'll need to update DeviceEstimationPageClient props later.
  // For now, let's pass the full model and necessary simple props.

  return (
    <DeviceEstimationPageClient 
      // initialDevice={deviceDetails} // This will be of type Model from catalog
      // The props for DeviceEstimationPageClient will need to be adjusted.
      // Let's plan to pass deviceDetails directly and adjust the client component.
      // For the sake of this step, we are aiming to pass the fetched data.
      key={deviceDetails.sef_url} // Add key for potential re-renders if deviceId changes
      deviceModel={deviceDetails} // Pass the full model
      currentLocale={locale}
      defaultLocale={defaultShopConfig.heroSection.translations?.en ? 'en' : 'en'} 
    />
  );
}

// Optional: Generate static paths if you know all possible deviceIds at build time
// This would need to fetch all published models' SEF URLs for the shop.
// export async function generateStaticParams({ params: { locale } }: { params: { locale: string }}) {
//   // Example: Fetch all models for the default shopId
//   const shopOwnerIdString = process.env.NEXT_PUBLIC_SHOP_ID;
//   if (!shopOwnerIdString) return [];
//   const shopId = parseInt(shopOwnerIdString);
//   try {
//     // You'd need a service method like shopService.getAllPublishedModelSefUrls(shopId)
//     // For now, returning empty or a mock set.
//     // const models = await shopService.getPublishedModels(shopId, { limit: 200 }); // Example
//     // return models.data.map(model => ({ deviceId: model.sef_url, locale }));
//     return [];
//   } catch (error) {
//     console.error('Failed to generate static params for device estimate pages:', error);
//     return [];
//   }
// } 