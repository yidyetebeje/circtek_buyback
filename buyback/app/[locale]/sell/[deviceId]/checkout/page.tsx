import { CheckoutPageClient } from '@/components/checkout/CheckoutPageClient';
import { Metadata } from 'next';
import { shopService } from '@/lib/api/catalog/shopService';

interface CheckoutPageProps {
  params: Promise<{
    deviceId: string;
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata for the checkout page
export async function generateMetadata({ params }: { params: Promise<{ locale: string, deviceId: string }> }): Promise<Metadata> {
  const { locale, deviceId: modelSefUrl } = await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "buyback.example.com";
  
  let shopName = "Buyback Service";
  
  try {
    // Get shop info for metadata
    if (shopId) {
      const shopInfo = await shopService.getShopById(shopId);
      shopName = shopInfo.data.name || "Buyback Service";
    }
  } catch (error) {
    console.error(`Error fetching shop info for checkout page metadata:`, error);
  }
  
  // Format the device ID for display if needed
  const deviceName = modelSefUrl
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return {
    title: `Checkout | ${shopName}`,
    description: `Complete your ${deviceName} trade-in transaction at ${shopName}. Fast, secure checkout process with multiple payment options.`,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
    alternates: {
      canonical: `/${locale}/sell/${modelSefUrl}/checkout`,
      languages: {
        'en': `/en/sell/${modelSefUrl}/checkout`,
        'nl': `/nl/sell/${modelSefUrl}/checkout`,
      },
    },
    openGraph: {
      type: "website",
      locale,
      url: `https://${domain}/${locale}/sell/${modelSefUrl}/checkout`,
      title: `Checkout | ${shopName}`,
      description: `Complete your ${deviceName} trade-in transaction at ${shopName}. Fast, secure checkout process with multiple payment options.`,
      siteName: shopName,
    }
  };
}

// This is a Server Component
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale, deviceId } = await params;

  const shopOwnerIdString = process.env.NEXT_PUBLIC_SHOP_ID;
  if (!shopOwnerIdString) {
    console.error('NEXT_PUBLIC_SHOP_ID is not defined in environment variables.');
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Configuration Error</h1>
        <p>The shop owner ID is not configured. Please contact support.</p>
      </div>
    );
  }


  return (
    <CheckoutPageClient
      currentLocale={locale}
      defaultLocale={'en'}
      deviceId={deviceId} // Pass the single device ID for individual checkout flow
    />
  );
} 