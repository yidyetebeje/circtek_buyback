import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { shopService } from "@/lib/api/catalog/shopService";
import { ShopConfig } from "@/types/shop";
import { ShopConfigProvider } from "@/providers/shop-config-provider";
import { AuthProvider } from "@/providers/session-provider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { getShopConfig } from "@/config/defaultShopConfig";
import DynamicFavicon from "@/components/DynamicFavicon";
import { TopLoader } from "@/components/ui/toploader";

const openSansFont = Open_Sans({
  subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ?
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) :
    0;
  let shopName = "Buyback Service";
  let logoUrl = "";
  try {
    const shopInfo = await shopService.getShopById(shopId);
    // Get shop configuration, but we don't actually need to use it for metadata
    await getShopConfig("default");
    logoUrl = shopInfo?.data?.logo || "";
    shopName = shopInfo?.data?.name || shopName;
  } catch (err) {
    // If shop fetch fails (404 or other), fall back to default config
    // Avoid throwing from metadata generation
    console.warn('[layout] Failed to load shop info for metadata, using defaults', err);
    await getShopConfig("default");
  }
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "buyback.example.com";

  return {
    title: {
      default: `${shopName} - Sell Your Device for the Best Price`,
      template: `%s | ${shopName}`
    },
    description: `${shopName} offers the best prices for your used electronics. Fast, secure, and hassle-free buyback service.`,
    keywords: ["device buyback", "sell electronics", "trade in", "sell used devices", "cash for devices", shopName],
    metadataBase: new URL(`https://${domain}`),
    alternates: {
      canonical: `/`,
      languages: {
        'en': `/en`,
        'nl': `/nl`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      type: "website",
      locale: locale,
      url: `https://${domain}`,
      title: `${shopName} - Sell Your Device for the Best Price`,
      description: `${shopName} offers the best prices for your used electronics. Fast, secure, and hassle-free buyback service.`,
      siteName: shopName,
      images: [
        {
          url: logoUrl || "/logo.png",
          width: 1200,
          height: 630,
          alt: shopName,
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${shopName} - Sell Your Device for the Best Price`,
      description: `${shopName} offers the best prices for your used electronics. Fast, secure, and hassle-free buyback service.`,
      images: [logoUrl || "/logo.png"],
    },
  };
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ?
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) :
    0;
  let shopConfig: ShopConfig;
  try {
    const shopInfo = await shopService.getShopById(shopId);
    shopConfig = (shopInfo?.data?.config as unknown as ShopConfig) || await getShopConfig("default");
    shopConfig.shopName = shopInfo?.data?.name || shopConfig.shopName || "Buyback Service";
    shopConfig.logoUrl = shopInfo?.data?.logo || shopConfig.logoUrl || "";
  } catch (err) {
    console.warn('[layout] Failed to load shop info, falling back to default shop config', err);
    shopConfig = await getShopConfig("default");
    shopConfig.shopName = shopConfig.shopName || "Buyback Service";
    shopConfig.logoUrl = shopConfig.logoUrl || "";
  }

  // Set favicon URL with priority: environment variable, shop config, shop logo, or default
  shopConfig.faviconUrl = process.env.NEXT_PUBLIC_FAVICON_URL ||
    shopConfig.faviconUrl ||
    shopConfig.logoUrl ||
    "/favicon.ico";

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${openSansFont.className} antialiased`}
      >
        <TopLoader />
        <Toaster />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ReactQueryProvider>
              <LanguageProvider>
                <ShopConfigProvider config={shopConfig}>
                  <DynamicFavicon />
                  {children}
                </ShopConfigProvider>
              </LanguageProvider>
            </ReactQueryProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
