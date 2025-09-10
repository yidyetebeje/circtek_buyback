import { BuyDevicePageClient } from '@/components/admin/buy-device/BuyDevicePageClient';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminBuyDevicePage({ params }: Props) {
  const { locale } = await params;
  
  // Get shop ID from environment variable
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? 
    parseInt(process.env.NEXT_PUBLIC_SHOP_ID, 10) : 
    0;

  if (!shopId || shopId === 0) {
    console.error('NEXT_PUBLIC_SHOP_ID is not defined in environment variables.');
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Buy Device</h1>
          <p className="text-red-600 mt-2">
            Shop configuration is missing. Please check environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Buy Device</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Purchase tested devices from customers through the admin panel
        </p>
      </div>
      
      <BuyDevicePageClient locale={locale} shopId={shopId} />
    </div>
  );
} 