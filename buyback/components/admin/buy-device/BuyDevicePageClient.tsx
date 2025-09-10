"use client";

import { useState, useEffect } from 'react';
import { TestedDevice } from '@/lib/api/diagnosticsService';
import { Model } from '@/types/catalog';
import { DeviceSerialSearch } from './DeviceSerialSearch';
import { DeviceInfoDisplay } from './DeviceInfoDisplay';
import { QuestionFlow } from './QuestionFlow';
import { PriceConfirmation } from './PriceConfirmation';
import { OrderCreation } from './OrderCreation';
import { useQuery } from '@tanstack/react-query';
import { shopService } from '@/lib/api/catalog/shopService';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BuyDeviceStep = 
  | 'serial-search'
  | 'device-info' 
  | 'product-matching'
  | 'questions'
  | 'price-confirmation'
  | 'order-creation'
  | 'completed';

interface BuyDevicePageClientProps {
  locale: string;
  shopId: number;
}

export function BuyDevicePageClient({ locale, shopId }: BuyDevicePageClientProps) {
  const [currentStep, setCurrentStep] = useState<BuyDeviceStep>('serial-search');
  const [testedDevice, setTestedDevice] = useState<TestedDevice | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Model | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);

  const handleDeviceFound = (device: TestedDevice) => {
    setTestedDevice(device);
    setCurrentStep('device-info');
  };

  const handleDeviceInfoContinue = () => {
    setCurrentStep('product-matching');
  };

  const handleProductSelected = (product: Model) => {
    setSelectedProduct(product);
    setCurrentStep('questions');
  };

  const handleQuestionsCompleted = (questionsAnswers: Record<string, string>, price: number, product: Model) => {
    setAnswers(questionsAnswers);
    setEstimatedPrice(price);
    setSelectedProduct(product); // Update with the full product data from API
    setCurrentStep('price-confirmation');
  };

  const handlePriceConfirmed = (price: number) => {
    setFinalPrice(price);
    setCurrentStep('order-creation');
  };

  const handleOrderCreated = () => {
    setCurrentStep('completed');
  };

  const handleStartOver = () => {
    setCurrentStep('serial-search');
    setTestedDevice(null);
    setSelectedProduct(null);
    setAnswers({});
    setEstimatedPrice(null);
    setFinalPrice(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'serial-search':
        return (
          <DeviceSerialSearch
            onDeviceFound={handleDeviceFound}
            locale={locale}
          />
        );

      case 'device-info':
        return (
          <DeviceInfoDisplay
            device={testedDevice!}
            onContinue={handleDeviceInfoContinue}
            onBack={() => setCurrentStep('serial-search')}
            locale={locale}
          />
        );

      case 'product-matching':
        return (
          <AutoProductMatcher
            device={testedDevice!}
            shopId={shopId}
            onMatched={handleProductSelected}
            onBack={() => setCurrentStep('device-info')}
          />
        );

      case 'questions':
        return (
          <QuestionFlow
            productSefUrl={selectedProduct!.sef_url}
            shopId={shopId}
            onCompleted={handleQuestionsCompleted}
            onBack={() => setCurrentStep('device-info')}
            locale={locale}
          />
        );

      case 'price-confirmation':
        return (
          <PriceConfirmation
            product={selectedProduct!}
            answers={answers}
            estimatedPrice={estimatedPrice!}
            testedDevice={testedDevice!}
            onConfirm={handlePriceConfirmed}
            onBack={() => setCurrentStep('questions')}
            locale={locale}
          />
        );

      case 'order-creation':
        return (
          <OrderCreation
            testedDevice={testedDevice!}
            product={selectedProduct!}
            answers={answers}
            finalPrice={finalPrice!}
            shopId={shopId}
            onOrderCreated={handleOrderCreated}
            onBack={() => setCurrentStep('price-confirmation')}
            locale={locale}
          />
        );

      case 'completed':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Created Successfully!</h2>
            <p className="text-gray-600 mb-6">The device purchase has been completed and the order has been created.</p>
            <button
              onClick={handleStartOver}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buy Another Device
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const stepMap: Record<BuyDeviceStep, number> = {
      'serial-search': 1,
      'device-info': 2,
      'product-matching': 3,
      'questions': 4,
      'price-confirmation': 5,
      'order-creation': 6,
      'completed': 7,
    };
    return stepMap[currentStep];
  };

  const getStepTitle = () => {
    const titleMap: Record<BuyDeviceStep, string> = {
      'serial-search': 'Search Device',
      'device-info': 'Device Information',
      'product-matching': 'Finding Product',
      'questions': 'Answer Questions',
      'price-confirmation': 'Confirm Price',
      'order-creation': 'Create Order',
      'completed': 'Completed',
    };
    return titleMap[currentStep];
  };

  return (
    <div className="w-full">
      {/* Progress indicator */}
      {currentStep !== 'completed' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {getStepNumber()} of 6
            </span>
            <span className="text-sm font-medium text-gray-600">
              {getStepTitle()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-primary h-2.5 rounded-full"
              style={{ width: `${(getStepNumber() / 6) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderStepContent()}
      </div>
    </div>
  );
}

interface AutoProductMatcherProps {
  device: TestedDevice;
  shopId: number;
  onMatched: (product: Model) => void;
  onBack: () => void;
}

function AutoProductMatcher({ device, shopId, onMatched, onBack }: AutoProductMatcherProps) {
  const searchTerm = `${device.modelName}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['auto-match-model', shopId, searchTerm],
    queryFn: () =>
      shopService.getPublishedModels(shopId, {
        search: searchTerm,
        limit: 10,
      }),
    enabled: !!shopId && shopId > 0 && !!searchTerm,
  });

  useEffect(() => {
    if (!isLoading && data && data.data.length > 0) {
      const normalisedModelName = device.modelName.trim().toLowerCase();

      const exactMatch = data.data.find((m: Model) => m.title.trim().toLowerCase() === normalisedModelName);

      const match = exactMatch || data.data[0];
      onMatched(match);
    }
  }, [isLoading, data, device.modelName, onMatched]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-gray-600">Searching catalogue for {device.modelName}…</p>
      </div>
    );
  }

  if (error || !data || data.data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-center">
          <p className="text-lg font-medium text-yellow-800 mb-2">This device is not in our catalogue.</p>
          <p className="text-sm text-yellow-700">Please add it to the catalogue before continuing.</p>
        </div>

        <div className="flex items-center justify-center">
          <Button variant="outline" onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return null;
} 