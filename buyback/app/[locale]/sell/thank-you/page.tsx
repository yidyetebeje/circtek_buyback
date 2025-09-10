import { ThankYouPageClient } from '@/components/checkout/ThankYouPageClient';
import { Metadata } from 'next';
import { shopService } from '@/lib/api/catalog/shopService';

interface ThankYouPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Generate metadata for the thank-you page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
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
    console.error(`Error fetching shop info for thank-you page metadata:`, error);
  }
  
  return {
    title: `Thank You for Your Order | ${shopName}`,
    description: `Thank you for selling your device to ${shopName}. Your transaction has been successfully processed.`,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
    alternates: {
      canonical: `/${locale}/sell/thank-you`,
      languages: {
        'en': `/en/sell/thank-you`,
        'nl': `/nl/sell/thank-you`,
      },
    },
    openGraph: {
      type: "website",
      locale,
      url: `https://${domain}/${locale}/sell/thank-you`,
      title: `Thank You for Your Order | ${shopName}`,
      description: `Thank you for selling your device to ${shopName}. Your transaction has been successfully processed.`,
      siteName: shopName,
    }
  };
}

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { locale } = await params;

  return (
    <ThankYouPageClient
      currentLocale={locale}
      defaultLocale="en"
    />
  );
} 