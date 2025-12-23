"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SendcloudConfigForm, SendcloudConfigFormValues } from '@/components/admin/shipping/sendcloud-config-form';
import {
    useSendcloudConfig,
    useSaveSendcloudConfig,
    useShippingOptions,
    useSenderAddresses,
    useTestSendcloudConnection,
} from '@/hooks/useShipping';
import { useShop } from '@/hooks/catalog/useShops';
import { useWarehouses } from '@/hooks/useWarehouses';

export default function ShopShippingConfigPage() {
    const router = useRouter();
    const params = useParams();
    const shopId = params.id ? parseInt(params.id as string, 10) : null;
    const { data: session } = useSession();

    // Connection test result state
    const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Verify shop manager can only access their managed shop
    React.useEffect(() => {
        if (session?.user?.roleSlug === 'shop_manager') {
            const managedShopId = session.user.managed_shop_id;
            if (managedShopId !== shopId) {
                toast.error('You can only access your managed shop');
                if (managedShopId) {
                    router.push(`/admin/shops/${managedShopId}`);
                } else {
                    router.push('/admin/dashboards');
                }
            }
        }
    }, [session, shopId, router]);

    // Fetch shop data
    const { data: shopResponse, isLoading: isLoadingShop } = useShop(shopId as number);
    const shop = shopResponse?.data;

    // Fetch Sendcloud configuration
    const {
        data: sendcloudConfig,
        isLoading: isLoadingConfig,
        error: configError
    } = useSendcloudConfig(shopId as number);

    // Fetch shipping options - always enabled once shopId is valid
    // Gets refetched when config is saved via query invalidation
    const {
        data: shippingOptions,
        isLoading: isLoadingOptions,
        refetch: refetchShippingOptions
    } = useShippingOptions(shopId as number);

    // Fetch sender/return addresses from Sendcloud
    const {
        data: senderAddresses,
        isLoading: isLoadingSenderAddresses,
        refetch: refetchSenderAddresses
    } = useSenderAddresses(shopId as number);

    // Fetch warehouses for HQ warehouse configuration
    const {
        data: warehousesResponse,
        isLoading: isLoadingWarehouses,
    } = useWarehouses({ shop_id: shopId as number });
    const warehouses = warehousesResponse?.data ?? [];

    // Mutations
    const { mutateAsync: saveConfig, isPending: isSaving } = useSaveSendcloudConfig(shopId as number);
    const { mutateAsync: testConnection, isPending: isTestingConnection } = useTestSendcloudConnection(shopId as number);

    // Handle form submission
    const handleSubmit = async (values: SendcloudConfigFormValues) => {
        if (!shopId) return;

        try {
            await saveConfig(values);
            // Explicitly refetch shipping options and sender addresses after successful save
            await refetchShippingOptions();
            await refetchSenderAddresses();
            // Clear connection test result after successful save
            setConnectionTestResult(null);
        } catch (error: unknown) {
            console.error('Error saving Sendcloud config:', error);
            const errMessage = error instanceof Error ? error.message : 'Failed to save configuration';
            toast.error(errMessage);
        }
    };

    // Handle connection test
    const handleTestConnection = async () => {
        try {
            const result = await testConnection();
            setConnectionTestResult(result);
        } catch (error) {
            setConnectionTestResult({ success: false, message: 'Connection test failed' });
        }
    };

    // Handle cancel
    const handleCancel = () => {
        router.push(`/admin/shops/${shopId}`);
    };

    // Loading state
    if (isLoadingShop || isLoadingConfig) {
        return (
            <div className="container mx-auto py-10">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg">Loading shipping configuration...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (configError || !shop) {
        return (
            <div className="container mx-auto py-10">
                <div className="bg-red-50 p-4 rounded-md">
                    <h1 className="text-xl font-semibold text-red-600">Error</h1>
                    <p>{configError?.message || 'Failed to load shop or configuration'}</p>
                    <Button
                        className="mt-4"
                        onClick={() => router.push('/admin/shops')}
                    >
                        Go Back to Shops
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="">
            {/* Header */}




            {/* Configuration Form */}
            <SendcloudConfigForm
                initialData={sendcloudConfig || undefined}
                shippingOptions={shippingOptions || []}
                senderAddresses={senderAddresses || []}
                warehouses={warehouses}
                isLoadingOptions={isLoadingOptions}
                isLoadingSenderAddresses={isLoadingSenderAddresses}
                isLoadingWarehouses={isLoadingWarehouses}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onTestConnection={handleTestConnection}
                isLoading={isSaving}
                isTestingConnection={isTestingConnection}
                connectionTestResult={connectionTestResult}
            />
        </div>
    );
}
