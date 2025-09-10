import { Metadata } from 'next';
import { shopService } from '@/lib/api/catalog/shopService';
// Import the client wrapper component
import FAQsWrapper from './faq-wrapper';

// Generate metadata for the FAQs page
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
    console.error(`Error fetching shop info for FAQs page metadata:`, error);
  }
  
  return {
    title: `Frequently Asked Questions | ${shopName}`,
    description: `Find answers to common questions about selling your devices, payment methods, shipping, and more at ${shopName}.`,
    keywords: ["FAQs", "frequently asked questions", "device buyback help", "sell electronics questions", "trade-in process", shopName],
    alternates: {
      canonical: `/${locale}/faqs`,
      languages: {
        'en': `/en/faqs`,
        'nl': `/nl/faqs`,
      },
    },
    openGraph: {
      type: "website",
      locale,
      url: `https://${domain}/${locale}/faqs`,
      title: `Frequently Asked Questions | ${shopName}`,
      description: `Find answers to common questions about selling your devices, payment methods, shipping, and more at ${shopName}.`,
      siteName: shopName,
    },
    twitter: {
      card: "summary",
      title: `Frequently Asked Questions | ${shopName}`,
      description: `Find answers to common questions about selling your devices, payment methods, shipping, and more at ${shopName}.`,
    },
  };
}

// Define the proper interface for the page component props
interface FAQsPageProps {
  params: Promise<{ locale: string }>;
}

// Main FAQs page component - server component that renders the client component
export default async function FAQsPage({ params }: FAQsPageProps) {
  // Await the params - even though we don't use locale here, it's required for type consistency
  await params;
  return <FAQsWrapper />;
}