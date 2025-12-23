"use client";

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TestedDevice } from '@/lib/api/diagnosticsService';
import { Model } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, MapPin, FileText, Loader2 } from 'lucide-react';
import { orderService, CreateAdminOrderPayload } from '@/lib/api/orderService';
import { toast } from 'sonner';

interface OrderCreationProps {
  testedDevice: TestedDevice;
  product: Model;
  answers: Record<string, string>;
  finalPrice: number;
  shopId: number;
  onOrderCreated: (orderData: CreatedOrderData) => void;
  onBack: () => void;
  locale: string;
}

// Order data returned after creation for reward modal
export interface CreatedOrderData {
  orderId: string;
  orderNumber?: string;
  sellerName: string;
  sellerEmail: string;
  finalPrice: number;
}

interface OrderFormData {
  // Customer Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Address Information
  street: string;
  city: string;
  postalCode: string;
  country: string;

  // Order Notes
  notes: string;

  // Inventory
  sku: string;
}

export function OrderCreation({
  testedDevice,
  product,
  answers,
  finalPrice,
  shopId,
  onOrderCreated,
  onBack
}: OrderCreationProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Netherlands',
    notes: '',
    sku: ''
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateAdminOrderPayload) => {
      const response = await orderService.createAdminOrder(orderData);
      return response.data;
    },
    onSuccess: (data) => {
      // Pass order data to parent for reward modal
      onOrderCreated({
        orderId: data?.orderId || '',
        orderNumber: data?.orderNumber,
        sellerName: `${formData.firstName} ${formData.lastName}`,
        sellerEmail: formData.email,
        finalPrice: finalPrice,
      });
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    }
  });

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'street', 'city', 'postalCode', 'sku'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof OrderFormData]);

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Prepare order data according to CreateAdminOrderPayload interface
    const orderData: CreateAdminOrderPayload = {
      tenantId: 1,
      // Device Information
      deviceId: product.id!,
      deviceSnapshot: {
        modelName: product.title,
        // Additional properties allowed by DeviceSnapshot interface
        id: product.id as unknown,
        title: product.title as unknown,
        brand: (product.brand?.title || '') as unknown,
        category: (product.category?.title || '') as unknown,
        model_image: product.model_image as unknown,
        base_price: product.base_price as unknown
      },

      // Pricing
      estimatedPrice: finalPrice,
      finalPrice: finalPrice,

      // Condition Assessment
      conditionAnswers: Object.entries(answers).map(([questionKey, answerValue]) => ({
        questionKey,
        questionTextSnapshot: questionKey, // You might want to store the actual question text
        answerValue,
        answerTextSnapshot: answerValue
      })),

      // Customer Information
      sellerAddress: {
        name: `${formData.firstName} ${formData.lastName}`,
        street1: formData.street,
        city: formData.city,
        stateProvince: 'Default', // You might want to add this field to the form
        postalCode: formData.postalCode,
        countryCode: formData.country === 'Netherlands' ? 'NL' : 'NL', // Default to NL for now
        phoneNumber: formData.phone,
        email: formData.email
      },

      // Additional Information
      sellerNotes: formData.notes,

      // Shop/Client Information

      shopId: shopId,
      status: 'PAID' as const,
      warehouseId: testedDevice.warehouseId,
      // Inventory and Testing
      imei: testedDevice.imei,
      serialNumber: testedDevice.serial,
      sku: formData.sku,

      // Testing Information
      testingInfo: {
        deviceTransactionId: String(testedDevice.deviceTransactionId),
        testedAt: testedDevice.testedAt,
        testResults: testedDevice.testInfo,
        warehouseId: testedDevice.warehouseId,
        warehouseName: testedDevice.warehouseName || undefined
      }
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Create Purchase Order</h2>
        <p className="text-muted-foreground">
          Enter customer details to complete the device purchase and create the order.
        </p>
      </div>

      {/* Order Summary - Clean Flat Card */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-8">
        <h3 className="font-bold text-lg text-foreground mb-6 pb-4 border-b border-border">Order Summary</h3>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Device Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Device Information
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-1 border-b border-border/50 border-dashed">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium text-foreground">{product.title}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-border/50 border-dashed">
                <span className="text-muted-foreground">Serial</span>
                <span className="font-mono text-foreground">{testedDevice.serial}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-border/50 border-dashed">
                <span className="text-muted-foreground">IMEI</span>
                <span className="font-mono text-foreground">{testedDevice.imei}</span>
              </div>
              <div className="flex justify-between text-sm pt-2">
                <span className="font-medium text-foreground">Final Price</span>
                <span className="text-lg font-bold text-green-600">€{finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Test Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-1 border-b border-border/50 border-dashed">
                <span className="text-muted-foreground">Tested Date</span>
                <span className="text-foreground">{new Date(testedDevice.testedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-border/50 border-dashed">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="text-foreground">{testedDevice.warehouseName || 'N/A'}</span>
              </div>
              {testedDevice.testInfo?.failedResult ? (
                <div className="mt-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-900/50">
                  <span className="font-semibold block mb-1">Failed Tests:</span>
                  {testedDevice.testInfo.failedResult}
                </div>
              ) : (
                <div className="mt-2 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm font-medium border border-green-100 dark:border-green-900/50 text-center">
                  All tests passed successfully
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information Form - Clean Sections */}
      <form onSubmit={handleSubmit} className="space-y-10">

        {/* Customer Info Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Customer Information</h3>
              <p className="text-sm text-muted-foreground">Contact details for the seller</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
                className="h-11"
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
                className="h-11"
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="h-11"
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Phone <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                className="h-11"
                placeholder="+31 6 12345678"
              />
            </div>
          </div>
        </section>

        {/* Address Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Address Information</h3>
              <p className="text-sm text-muted-foreground">Shipping/Billing address (optional for in-store pickup)</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Street Address <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                required
                className="h-11"
                placeholder="Main St 123"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                  className="h-11"
                  placeholder="Amsterdam"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  required
                  className="h-11"
                  placeholder="1000 AA"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Country
                </label>
                <Input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="h-11"
                  disabled
                />
              </div>
            </div>
          </div>
        </section>

        {/* Inventory Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Inventory Details</h3>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                SKU <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Enter device SKU"
                required
                className="h-11 font-mono"
              />
            </div>
          </div>
        </section>

        {/* Notes Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Additional Notes</h3>
          </div>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional notes about this purchase..."
            rows={4}
            className="resize-none"
          />
        </section>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Price Confirmation
          </Button>

          <Button
            type="submit"
            disabled={createOrderMutation.isPending}
            className="px-8 flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {createOrderMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Create Order
          </Button>
        </div>
      </form>
    </div>
  );
} 