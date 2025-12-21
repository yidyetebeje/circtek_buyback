"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TremendousConfigForm, TremendousConfigFormValues } from '@/components/admin/shipping/tremendous-config-form';
import {
    useTremendousConfig,
    useSaveTremendousConfig,
    useTremendousFundingSources,
    useTremendousCampaigns,
    useTestTremendousConnection,
} from '@/hooks/useTremendous';
import { useShop } from '@/hooks/catalog/useShops';

export default function ShopTremendousConfigPage() {
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

    // Fetch Tremendous configuration
    const {
        data: tremendousConfig,
        isLoading: isLoadingConfig,
        error: configError
    } = useTremendousConfig(shopId as number);

    // Fetch funding sources - only when config is available
    const {
        data: fundingSources,
        isLoading: isLoadingFundingSources,
        refetch: refetchFundingSources
    } = useTremendousFundingSources(shopId as number, {
        enabled: !!tremendousConfig?.configured,
    });

    // Fetch campaigns - only when config is available
    const {
        data: campaigns,
        isLoading: isLoadingCampaigns,
        refetch: refetchCampaigns
    } = useTremendousCampaigns(shopId as number, {
        enabled: !!tremendousConfig?.configured,
    });

    // Mutations
    const { mutateAsync: saveConfig, isPending: isSaving } = useSaveTremendousConfig(shopId as number);
    const { mutateAsync: testConnection, isPending: isTestingConnection } = useTestTremendousConnection(shopId as number);

    // Handle form submission
    const handleSubmit = async (values: TremendousConfigFormValues) => {
        if (!shopId) return;

        try {
            await saveConfig(values);
            // Explicitly refetch funding sources and campaigns after successful save
            await refetchFundingSources();
            await refetchCampaigns();
            // Clear connection test result after successful save
            setConnectionTestResult(null);
        } catch (error: unknown) {
            console.error('Error saving Tremendous config:', error);
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
                    <p className="text-lg">Loading Tremendous configuration...</p>
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
        <div className="container mx-auto py-10 max-w-4xl">
            {/* Header */}


            <Separator className="mb-8" />

            {/* Configuration Form */}
            <TremendousConfigForm
                initialData={tremendousConfig || undefined}
                fundingSources={fundingSources || []}
                campaigns={campaigns || []}
                isLoadingFundingSources={isLoadingFundingSources}
                isLoadingCampaigns={isLoadingCampaigns}
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
