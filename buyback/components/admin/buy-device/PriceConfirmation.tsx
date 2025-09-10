"use client";

import { useState, useMemo } from 'react';
import { Model } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { TestedDevice } from '@/lib/api/diagnosticsService';

interface PriceConfirmationProps {
  product: Model;
  answers: Record<string, string>;
  estimatedPrice: number;
  testedDevice: TestedDevice;
  onConfirm: (finalPrice: number) => void;
  onBack: () => void;
  locale: string;
}

export function PriceConfirmation({ 
  product, 
  estimatedPrice, 
  testedDevice,
  onConfirm, 
  onBack 
}: PriceConfirmationProps) {
  const failedTests = useMemo(() => {
    return testedDevice.testInfo?.failedResult?.split(',').map(s => s.trim()).filter(Boolean) || [];
  }, [testedDevice]);

  const priceDropMap = useMemo(() => {
    const map: Record<string, number> = {};
    product.testPriceDrops?.forEach(pd => {
      map[pd.testName.toLowerCase()] = pd.priceDrop;
    });
    return map;
  }, [product]);

  const totalDeduction = useMemo(() => {
    return failedTests.reduce((sum, t) => sum + (priceDropMap[t.toLowerCase()] || 0), 0);
  }, [failedTests, priceDropMap]);

  const initialPrice = estimatedPrice - totalDeduction;

  const [customPrice, setCustomPrice] = useState<string>(initialPrice.toFixed(2));
  const [showWarning, setShowWarning] = useState(false);

  const handlePriceChange = (value: string) => {
    setCustomPrice(value);
    const numericValue = parseFloat(value) || 0;
    const difference = Math.abs(numericValue - initialPrice);
    const percentageDiff = initialPrice === 0 ? 0 : (difference / initialPrice) * 100;
    setShowWarning(percentageDiff > 20);
  };

  const handleConfirm = () => {
    const finalPrice = parseFloat(customPrice) || initialPrice;
    onConfirm(finalPrice);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirm Price</h2>
          <p className="text-gray-600">
            Review the estimated price and make adjustments if needed.
          </p>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Selected Product</h3>
        <p className="text-gray-700">{product.title}</p>
        {product.base_price && (
          <p className="text-sm text-gray-600 mt-1">Base Price: €{product.base_price}</p>
        )}
      </div>

      {/* Price Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Estimated Price</h4>
            <p className="text-2xl font-bold text-blue-600">€{estimatedPrice.toFixed(2)}</p>
            {totalDeduction > 0 && (
              <p className="text-sm text-red-700 mt-1">-€{totalDeduction.toFixed(2)} deduction for failed tests</p>
            )}
            <p className="text-sm text-blue-700 mt-1">Based on device condition</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Final Price</h4>
            <div className="space-y-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="text-lg font-semibold"
              />
              <p className="text-sm text-gray-600">You can adjust the price if needed</p>
            </div>
          </div>
        </div>

        {showWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Price Adjustment Warning</h4>
              <p className="text-sm text-yellow-700 mt-1">
                The final price differs significantly (&gt;20%) from the estimated price. 
                Please ensure this adjustment is intentional.
              </p>
            </div>
          </div>
        )}

        {/* Failed Tests breakdown */}
        {failedTests.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-red-800">Failed Tests Deduction</h4>
            <ul className="text-sm text-red-700 list-disc pl-5">
              {failedTests.map(test => {
                const deduct = priceDropMap[test.toLowerCase()] || 0;
                return (
                  <li key={test} className="flex justify-between">
                    <span>{test}</span>
                    <span>-€{deduct.toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-between font-medium pt-2 border-t border-red-200">
              <span>Total Deduction</span>
              <span>-€{totalDeduction.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </Button>
        
        <Button 
          onClick={handleConfirm} 
          className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Confirm Price & Continue
        </Button>
      </div>
    </div>
  );
} 