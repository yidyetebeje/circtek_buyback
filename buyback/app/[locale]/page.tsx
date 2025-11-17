import { Metadata } from "next";
import { getShopConfig } from "@/config/defaultShopConfig";
import { HomePageClient } from "@/components/homepage/HomePageClient";
import { shopService } from "@/lib/api/catalog/shopService";
import { ShopConfig } from "@/types/shop";
import { Suspense } from "react";
import { Shop } from "@/types/catalog";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // In a real app, you would determine the current shop based on the subdomain
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;
  
  let shopConfig: ShopConfig;
  let shopInfo: Shop;
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "buyback.example.com";
  
  try {
    // Try to get shop config from the backend
    if (shopId) {
      const responseShopInfo = await shopService.getShopById(shopId);
      shopInfo = responseShopInfo.data;
      shopConfig = responseShopInfo.data.config as unknown as ShopConfig || await getShopConfig("default");
      shopConfig.shopName = shopInfo.name;
      shopConfig.logoUrl = shopInfo.logo || "";
    } else {
      shopConfig = await getShopConfig("default");
      shopInfo = {
        id: 0,
        name: "Default Shop",
        tenant_id: 0,
        owner_id: 0,
        logo: "",
        icon: "",
        organization: "",
        config: shopConfig as unknown as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true,
        phone: "",
      }
    }
  } catch (error) {
    console.error("Error fetching shop config for metadata:", error);
    // Fallback to default config in case of error
    shopConfig = await getShopConfig("default");
    shopInfo = {
      id: 0,
      name: "Default Shop",
      tenant_id: 0,
      owner_id: 0,
      logo: "",
      icon: "",
      organization: "",
      config: shopConfig as unknown as Record<string, unknown>,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
      phone: "",
    }
  }
  
  const shopName = shopInfo.name || "Buyback Service";
  const logoUrl = shopInfo.logo || "/logo.png";
  
  return {
    title: `${shopName} - Sell Your Device for the Best Price`,
    description: `${shopName} offers instant quotes and the best prices for your used electronics. Fast, secure, and hassle-free buyback service.`,
    keywords: ["sell electronics", "device buyback", "trade in service", "sell used phones", "cash for devices", shopName],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': `/en`,
        'nl': `/nl`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale,
      url: `https://${domain}/${locale}`,
      title: `${shopName} - Sell Your Device for the Best Price`,
      description: `${shopName} offers instant quotes and the best prices for your used electronics. Fast, secure, and hassle-free buyback service.`,
      siteName: shopName,
      images: [
        {
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: `${shopName} - Sell Your Device for the Best Price`,
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${shopName} - Sell Your Device for the Best Price`,
      description: `${shopName} offers instant quotes and the best prices for your used electronics. Fast, secure, and hassle-free buyback service.`,
      images: [logoUrl],
    },
  };
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomePageProps) {
  await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;

  return (
    <Suspense>
      <HomePageClient shopId={shopId} />
    </Suspense>
  );
}
