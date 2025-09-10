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
  onOrderCreated: () => void;
  onBack: () => void;
  locale: string;
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
    onSuccess: () => {
      onOrderCreated();
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
      clientId: 1,
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Purchase Order</h2>
        <p className="text-gray-600">
          Enter customer details to complete the device purchase and create the order.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Device Info */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Device Information
            </h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div><span className="font-medium">Product:</span> {product.title}</div>
              <div><span className="font-medium">Serial:</span> {testedDevice.serial}</div>
              <div><span className="font-medium">IMEI:</span> {testedDevice.imei}</div>
              <div><span className="font-medium">Final Price:</span> <span className="text-green-600 font-bold">€{finalPrice}</span></div>
            </div>
          </div>

          {/* Test Results */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Test Results</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div><span className="font-medium">Tested:</span> {new Date(testedDevice.testedAt).toLocaleDateString()}</div>
              <div><span className="font-medium">Warehouse:</span> {testedDevice.warehouseName || 'N/A'}</div>
              {testedDevice.testInfo?.failedResult ? (
                <div><span className="font-medium text-red-600">Failed Tests:</span> {testedDevice.testInfo.failedResult}</div>
              ) : (
                <div className="text-green-600 font-medium">All tests passed</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Address Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <Input
                type="text"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                required
              />
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code *
                </label>
                <Input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <Input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Inventory Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <Input
              type="text"
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              placeholder="Enter device SKU"
              required
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Additional Notes</h3>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional notes about this purchase..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
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