"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Key, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type { SendcloudConfig, ShippingOption, SenderAddress } from '@/hooks/useShipping';

// Define base sendcloud config form schema
const createSendcloudConfigSchema = (isConfigured: boolean) => z.object({
    public_key: z.string()
        .min(1, { message: "Public key is required" })
        .max(255, { message: "Public key must be 255 characters or less" }),
    secret_key: isConfigured
        ? z.string().max(255, { message: "Secret key must be 255 characters or less" }).optional().or(z.literal(''))
        : z.string().min(1, { message: "Secret key is required" }).max(255),
    default_shipping_option_code: z.string().optional().nullable(),
    default_sender_address_id: z.number().optional().nullable(),
});

// Export the type derived from the schema
export type SendcloudConfigFormValues = {
    public_key: string;
    secret_key?: string;
    default_shipping_option_code?: string | null;
    default_sender_address_id?: number | null;
};

export interface SendcloudConfigFormProps {
    initialData?: Partial<SendcloudConfig>;
    shippingOptions?: ShippingOption[];
    senderAddresses?: SenderAddress[];
    isLoadingOptions?: boolean;
    isLoadingSenderAddresses?: boolean;
    onSubmit: (values: SendcloudConfigFormValues) => void;
    onCancel: () => void;
    onTestConnection?: () => void;
    isLoading?: boolean;
    isTestingConnection?: boolean;
    connectionTestResult?: { success: boolean; message: string } | null;
}

export function SendcloudConfigForm({
    initialData,
    shippingOptions = [],
    senderAddresses = [],
    isLoadingOptions = false,
    isLoadingSenderAddresses = false,
    onSubmit,
    onCancel,
    onTestConnection,
    isLoading = false,
    isTestingConnection = false,
    connectionTestResult = null,
}: SendcloudConfigFormProps) {
    const [showSecretKey, setShowSecretKey] = React.useState(false);

    const isConfigured = initialData?.configured ?? false;

    // Use dynamic schema based on configured state
    const schema = React.useMemo(() => createSendcloudConfigSchema(isConfigured), [isConfigured]);

    const form = useForm<SendcloudConfigFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            public_key: initialData?.public_key || '',
            secret_key: '',
            default_shipping_option_code: initialData?.default_shipping_option_code || '',
            default_sender_address_id: initialData?.default_sender_address_id || null,
        },
    });

    const handleSubmit = (values: SendcloudConfigFormValues) => {
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
                    {isConfigured && initialData?.public_key_preview && (
                        <span className="text-sm text-muted-foreground">
                            Key: {initialData.public_key_preview}
                        </span>
                    )}
                </div>

                {/* API Credentials */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            API Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="public_key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Public Key</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Sendcloud public key" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="secret_key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Secret Key</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showSecretKey ? "text" : "password"}
                                                placeholder={isConfigured ? "Enter new key to update" : "Sendcloud secret key"}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowSecretKey(!showSecretKey)}
                                            >
                                                {showSecretKey ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
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
                                    disabled={isTestingConnection || (!isConfigured && (!form.getValues('public_key') || !form.getValues('secret_key')))}
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

                {/* Default Shipping Option */}
                <FormField
                    control={form.control}
                    name="default_shipping_option_code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Default Shipping Option</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || ''}
                                disabled={!isConfigured || isLoadingOptions || shippingOptions.length === 0}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !isConfigured
                                                ? "Save config first"
                                                : isLoadingOptions
                                                    ? "Loading options..."
                                                    : shippingOptions.length === 0
                                                        ? "No options available"
                                                        : "Select option"
                                        } />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {shippingOptions.map((option) => (
                                        <SelectItem key={option.code} value={option.code}>
                                            {option.name}
                                            {option.carrier && ` (${option.carrier})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Default Sender/Return Address */}
                <FormField
                    control={form.control}
                    name="default_sender_address_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Default Return Address</FormLabel>
                            <Select
                                onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                                value={field.value?.toString() || ''}
                                disabled={!isConfigured || isLoadingSenderAddresses || senderAddresses.length === 0}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !isConfigured
                                                ? "Save config first"
                                                : isLoadingSenderAddresses
                                                    ? "Loading addresses..."
                                                    : senderAddresses.length === 0
                                                        ? "No addresses configured in Sendcloud"
                                                        : "Select return address"
                                        } />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {senderAddresses.map((address) => (
                                        <SelectItem key={address.id} value={address.id.toString()}>
                                            {address.company_name || address.contact_name} - {address.city}, {address.country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                                This address will be used as the destination for buyback returns.
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
