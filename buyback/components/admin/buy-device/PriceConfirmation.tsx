"use client";

import { useState, useMemo } from 'react';
import { Model } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertTriangle, XCircle } from 'lucide-react';
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
  const maxAllowedPrice = initialPrice; // Maximum price admin can pay

  const [customPrice, setCustomPrice] = useState<string>(initialPrice.toFixed(2));
  const [showWarning, setShowWarning] = useState(false);
  const [showPriceExceededError, setShowPriceExceededError] = useState(false);

  const handlePriceChange = (value: string) => {
    setCustomPrice(value);
    const numericValue = parseFloat(value) || 0;

    // Check if price exceeds maximum allowed
    if (numericValue > maxAllowedPrice) {
      setShowPriceExceededError(true);
      setShowWarning(false);
    } else {
      setShowPriceExceededError(false);
      const difference = Math.abs(numericValue - initialPrice);
      const percentageDiff = initialPrice === 0 ? 0 : (difference / initialPrice) * 100;
      setShowWarning(percentageDiff > 20);
    }
  };

  const handleConfirm = () => {
    const finalPrice = parseFloat(customPrice) || initialPrice;

    // Prevent confirmation if price exceeds maximum
    if (finalPrice > maxAllowedPrice) {
      setShowPriceExceededError(true);
      return;
    }

    onConfirm(finalPrice);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Confirm Price</h2>
          <p className="text-muted-foreground">
            Review the estimated price and make adjustments if needed.
          </p>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-muted/40 rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-2">Selected Product</h3>
        <p className="text-foreground/90">{product.title}</p>
        {product.base_price && (
          <p className="text-sm text-muted-foreground mt-1">Base Price: €{product.base_price}</p>
        )}
      </div>

      {/* Price Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-8 text-center md:text-left">
            <h4 className="text-sm uppercase tracking-wider font-semibold text-blue-600/80 dark:text-blue-400 mb-2">Estimated Price</h4>
            <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">€{estimatedPrice.toFixed(2)}</p>
            <p className="text-sm text-foreground/60">Based on device condition and current market rates</p>

            {totalDeduction > 0 && (
              <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-red-500 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Total Deductions: -€{totalDeduction.toFixed(2)}
                </p>
                {/* Failed Tests list can go here if detailed breakdown is needed immediately, otherwise it's below */}
              </div>
            )}
          </div>

          {/* Failed Tests breakdown detailed */}
          {failedTests.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-medium text-foreground mb-4 flex items-center justify-between">
                <span>Deductions Breakdown</span>
                <span className="text-red-500 text-sm font-semibold">-€{totalDeduction.toFixed(2)}</span>
              </h4>
              <ul className="space-y-3">
                {failedTests.map(test => {
                  const deduct = priceDropMap[test.toLowerCase()] || 0;
                  return (
                    <li key={test} className="flex justify-between text-sm items-center pb-2 border-b border-border/50 last:border-0 last:pb-0">
                      <span className="text-muted-foreground">{test}</span>
                      <span className="font-mono text-red-500 font-medium">-€{deduct.toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={`bg-card border rounded-xl p-8 ${showPriceExceededError ? 'border-red-500/50 ring-1 ring-red-500/50' : 'border-border'}`}>
            <h4 className="text-lg font-semibold text-foreground mb-4">Final Price Adjustment</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Confirm Final Price (€)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxAllowedPrice}
                    value={customPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className={`text-2xl font-bold h-14 pl-4 pr-12 ${showPriceExceededError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">EUR</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                Maximum allowed: <span className="font-medium text-foreground">€{maxAllowedPrice.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {showWarning && (
            <div className="bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-700 dark:text-yellow-500">Price Adjustment Warning</h4>
                <p className="text-sm text-yellow-600/90 dark:text-yellow-400/90 mt-1 leading-relaxed">
                  The final price differs significantly (&gt;20%) from the estimated price.
                  Please ensure this adjustment is intentional.
                </p>
              </div>
            </div>
          )}

          {showPriceExceededError && (
            <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-700 dark:text-red-400">Price Exceeds Maximum</h4>
                <p className="text-sm text-red-600/90 dark:text-red-300/90 mt-1 leading-relaxed">
                  The price cannot exceed €{maxAllowedPrice.toFixed(2)}.
                  Please enter a price equal to or less than the maximum allowed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={showPriceExceededError}
          className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Price & Continue
        </Button>
      </div>
    </div>
  );
} 