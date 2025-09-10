import { ShopLocatorPage } from "@/components/shop-locator/ShopLocatorPage";

export default function LocationsPage() {
  // Get the shop ID from the environment variable
  const shopId = parseInt(process.env.NEXT_PUBLIC_SHOP_ID || "0", 10);
  
  return <ShopLocatorPage shopId={shopId} />;
} 