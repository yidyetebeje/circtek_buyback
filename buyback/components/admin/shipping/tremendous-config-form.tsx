"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Key, Eye, EyeOff, CheckCircle, AlertCircle, Gift } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type { TremendousConfig, TremendousFundingSource, TremendousCampaign } from '@/hooks/useTremendous';

// Define base tremendous config form schema
const createTremendousConfigSchema = (isConfigured: boolean) => z.object({
    api_key: isConfigured
        ? z.string().max(255, { message: "API key must be 255 characters or less" }).optional().or(z.literal(''))
        : z.string().min(1, { message: "API key is required" }).max(255),
    funding_source_id: z.string().optional().nullable(),
    campaign_id: z.string().optional().nullable(),
    use_test_mode: z.boolean().default(true),
    is_active: z.boolean().default(true),
});

// Export the type derived from the schema
export type TremendousConfigFormValues = {
    api_key?: string;
    funding_source_id?: string | null;
    campaign_id?: string | null;
    use_test_mode?: boolean;
    is_active?: boolean;
};

export interface TremendousConfigFormProps {
    initialData?: Partial<TremendousConfig>;
    fundingSources?: TremendousFundingSource[];
    campaigns?: TremendousCampaign[];
    isLoadingFundingSources?: boolean;
    isLoadingCampaigns?: boolean;
    onSubmit: (values: TremendousConfigFormValues) => void;
    onCancel: () => void;
    onTestConnection?: () => void;
    isLoading?: boolean;
    isTestingConnection?: boolean;
    connectionTestResult?: { success: boolean; message: string } | null;
}

export function TremendousConfigForm({
    initialData,
    fundingSources = [],
    campaigns = [],
    isLoadingFundingSources = false,
    isLoadingCampaigns = false,
    onSubmit,
    onCancel,
    onTestConnection,
    isLoading = false,
    isTestingConnection = false,
    connectionTestResult = null,
}: TremendousConfigFormProps) {
    const [showApiKey, setShowApiKey] = React.useState(false);

    const isConfigured = initialData?.configured ?? false;

    // Use dynamic schema based on configured state
    const schema = React.useMemo(() => createTremendousConfigSchema(isConfigured), [isConfigured]);

    const form = useForm<TremendousConfigFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            api_key: '',
            funding_source_id: initialData?.funding_source_id || '',
            campaign_id: initialData?.campaign_id || '',
            use_test_mode: initialData?.use_test_mode ?? true,
            is_active: initialData?.is_active ?? true,
        },
    });

    const handleSubmit = (values: TremendousConfigFormValues) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-3">
                    <Badge variant={isConfigured ? "default" : "secondary"}>
                        {isConfigured ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Configured</>
                        ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> Not Configured</>
                        )}
                    </Badge>
                    {isConfigured && initialData?.api_key_preview && (
                        <span className="text-sm text-muted-foreground">
                            Key: {initialData.api_key_preview}
                        </span>
                    )}
                </div>

                {/* API Credentials */}
                <Card className="bg-card shadow-none border-0 rounded-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            API Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="api_key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Key</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showApiKey ? "text" : "password"}
                                                placeholder={isConfigured ? "Enter new key to update" : "Tremendous API key"}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                            >
                                                {showApiKey ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Get your API key from the{' '}
                                        <a
                                            href="https://www.tremendous.com/settings/developers"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline"
                                        >
                                            Tremendous dashboard
                                        </a>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Test Mode Toggle */}
                        <FormField
                            control={form.control}
                            name="use_test_mode"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Test Mode (Sandbox)</FormLabel>
                                        <FormDescription>
                                            Use Tremendous sandbox for testing. Disable for production rewards.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {onTestConnection && (
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onTestConnection}
                                    disabled={isTestingConnection || (!isConfigured && !form.getValues('api_key'))}
                                >
                                    {isTestingConnection ? (
                                        <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Testing...</>
                                    ) : (
                                        'Test Connection'
                                    )}
                                </Button>
                                {connectionTestResult && (
                                    <span className={`text-sm ${connectionTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                        {connectionTestResult.message}
                                    </span>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Reward Settings */}
                <Card className="bg-card shadow-none border-0 rounded-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Reward Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Funding Source */}
                        <FormField
                            control={form.control}
                            name="funding_source_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Funding Source</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || ''}
                                        disabled={!isConfigured || isLoadingFundingSources || fundingSources.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={
                                                    !isConfigured
                                                        ? "Save config first"
                                                        : isLoadingFundingSources
                                                            ? "Loading funding sources..."
                                                            : fundingSources.length === 0
                                                                ? "No funding sources available"
                                                                : "Select funding source"
                                                } />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {fundingSources.map((source) => (
                                                <SelectItem key={source.id} value={source.id}>
                                                    {source.method} ({source.id.substring(0, 8)}...)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The payment method used to fund rewards (e.g., credit card, bank balance)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Campaign (Optional) */}
                        <FormField
                            control={form.control}
                            name="campaign_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Campaign (Optional)</FormLabel>
                                    <Select
                                        onValueChange={(value) => field.onChange(value === '__NONE__' ? null : value)}
                                        value={field.value || '__NONE__'}
                                        disabled={!isConfigured || isLoadingCampaigns || campaigns.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={
                                                    !isConfigured
                                                        ? "Save config first"
                                                        : isLoadingCampaigns
                                                            ? "Loading campaigns..."
                                                            : campaigns.length === 0
                                                                ? "No campaigns available"
                                                                : "Select campaign (optional)"
                                                } />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="__NONE__">No campaign</SelectItem>
                                            {campaigns.map((campaign) => (
                                                <SelectItem key={campaign.id} value={campaign.id}>
                                                    {campaign.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Use a campaign for branded reward emails (configured in Tremendous)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Active Toggle */}
                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Integration Active</FormLabel>
                                        <FormDescription>
                                            Enable or disable Tremendous reward sending
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
