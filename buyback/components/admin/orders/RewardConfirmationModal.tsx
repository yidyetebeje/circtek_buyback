"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Gift, Mail, User, DollarSign, AlertTriangle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Form validation schema
const rewardFormSchema = z.object({
    recipient_name: z.string().min(1, { message: "Recipient name is required" }),
    recipient_email: z.string().email({ message: "Valid email address is required" }),
    amount: z.number().positive({ message: "Amount must be greater than 0" }),
    currency_code: z.string().min(1, { message: "Currency is required" }),
    message: z.string().optional(),
    confirmed: z.boolean().refine(val => val === true, {
        message: "You must confirm before sending the reward"
    }),
});

export type RewardFormValues = z.infer<typeof rewardFormSchema>;

export interface RewardConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Omit<RewardFormValues, 'confirmed'>) => Promise<void>;
    orderDetails: {
        orderId: string;
        orderNumber?: string;
        sellerName: string;
        sellerEmail: string;
        finalPrice: number;
        currency?: string;
    };
    isLoading: boolean;
    testMode?: boolean;
}

const SUPPORTED_CURRENCIES = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export function RewardConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    orderDetails,
    isLoading,
    testMode = true,
}: RewardConfirmationModalProps) {
    const form = useForm<RewardFormValues>({
        resolver: zodResolver(rewardFormSchema),
        defaultValues: {
            recipient_name: orderDetails.sellerName || '',
            recipient_email: orderDetails.sellerEmail || '',
            amount: orderDetails.finalPrice || 0,
            currency_code: orderDetails.currency || 'EUR',
            message: '',
            confirmed: false,
        },
    });

    // Reset form when order details change
    React.useEffect(() => {
        if (isOpen) {
            form.reset({
                recipient_name: orderDetails.sellerName || '',
                recipient_email: orderDetails.sellerEmail || '',
                amount: orderDetails.finalPrice || 0,
                currency_code: orderDetails.currency || 'EUR',
                message: '',
                confirmed: false,
            });
        }
    }, [isOpen, orderDetails, form]);

    const handleSubmit = async (values: RewardFormValues) => {
        const { confirmed, ...rewardData } = values;
        await onConfirm(rewardData);
    };

    const formatCurrency = (amount: number | string, currencyCode: string) => {
        const val = typeof amount === 'string' ? parseFloat(amount) : amount;
        const safeAmount = isNaN(val) ? 0 : val;
        const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
        return `${currency?.symbol || ''}${safeAmount.toFixed(2)} ${currencyCode}`;
    };

    const watchedAmount = form.watch('amount');
    const watchedCurrency = form.watch('currency_code');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        Send Reward Payment
                    </DialogTitle>
                    <DialogDescription>
                        Send a digital reward to the customer for order{' '}
                        <strong>{orderDetails.orderNumber || orderDetails.orderId}</strong>
                    </DialogDescription>
                </DialogHeader>

                {testMode && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Test Mode:</strong> This reward will be sent using the Tremendous sandbox.
                            No real money will be transferred.
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Recipient Name */}
                        <FormField
                            control={form.control}
                            name="recipient_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Recipient Name
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="Customer name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Recipient Email */}
                        <FormField
                            control={form.control}
                            name="recipient_email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        Recipient Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="customer@email.com" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        The reward will be sent to this email address
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Amount and Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Amount
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="currency_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Currency</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Currency" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {SUPPORTED_CURRENCIES.map((currency) => (
                                                    <SelectItem key={currency.code} value={currency.code}>
                                                        {currency.symbol} {currency.code}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Confirmation Checkbox */}
                        <FormField
                            control={form.control}
                            name="confirmed"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-medium">
                                            I confirm this reward of{' '}
                                            <strong>{formatCurrency(watchedAmount, watchedCurrency)}</strong>
                                            {' '}will be sent to the recipient
                                        </FormLabel>
                                        <FormDescription>
                                            This action cannot be undone. The reward will be sent immediately.
                                        </FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !form.watch('confirmed')}
                                className="gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Gift className="h-4 w-4" />
                                        Send Reward
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
