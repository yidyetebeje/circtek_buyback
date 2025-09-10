import { Metadata } from "next";
import CartPageClient from "./client";
import { shopService } from "@/lib/api/catalog/shopService";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;
  
  let shopName = "Buyback Service";
  let domain = process.env.NEXT_PUBLIC_DOMAIN || "buyback.example.com";
  
  try {
    if (shopId) {
      const shopInfo = await shopService.getShopById(shopId);
      shopName = shopInfo.data.name || "Buyback Service";
    }
  } catch (error) {
    console.error("Error fetching shop info for cart page metadata:", error);
  }
  
  return {
    title: `Shopping Cart | ${shopName}`,
    description: `Review your trade-in items, get instant quotes, and complete your sale at ${shopName}.`,
    keywords: ["shopping cart", "device trade-in", "sell devices", "checkout", "quote review"],
    alternates: {
      canonical: `/${locale}/cart`,
      languages: {
        'en': `/en/cart`,
        'nl': `/nl/cart`,
      },
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: locale,
      url: `https://${domain}/${locale}/cart`,
      title: `Shopping Cart | ${shopName}`,
      description: `Review your trade-in items, get instant quotes, and complete your sale at ${shopName}.`,
      siteName: shopName,
    },
  };
}

interface CartPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  return <CartPageClient currentLocale={locale} />;
}
