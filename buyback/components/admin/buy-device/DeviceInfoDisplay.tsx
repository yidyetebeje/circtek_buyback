"use client";

import { TestedDevice } from '@/lib/api/diagnosticsService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface DeviceInfoDisplayProps {
  device: TestedDevice;
  onContinue: () => void;
  onBack: () => void;
  locale: string;
}

export function DeviceInfoDisplay({ device, onContinue, onBack }: DeviceInfoDisplayProps) {
  const hasFailedTests = device.testInfo?.failedResult;
  const passedTests = device.testInfo?.passedResult?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const failedTests = device.testInfo?.failedResult?.split(',').map(s => s.trim()).filter(Boolean) || [];

  const handleViewReport = () => {
    window.open(`https://stg-app.circtek.io/device-report?id=${device.deviceTransactionId}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Device Information</h2>
          <p className="text-muted-foreground text-lg">
            Review the tested device details and diagnostic results before proceeding.
          </p>
        </div>
        <Button variant="outline" onClick={handleViewReport} className="flex items-center gap-2 h-10 border-border hover:bg-muted/50">
          <FileText className="w-4 h-4" />
          View Full Report
        </Button>
      </div>

      {/* Device Basic Info */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <div className="flex items-start gap-6 mb-8 pb-8 border-b border-border">
          <div className="w-20 h-20 bg-muted/30 rounded-2xl flex items-center justify-center border border-border text-foreground">
            <span className="text-3xl">📱</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">
              {device.make} {device.modelName}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              {device.grade && (
                <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800">
                  Grade {device.grade}
                </span>
              )}
              <span className="text-sm text-muted-foreground">• Tested {new Date(device.testedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Serial Number</label>
            <p className="text-base font-mono text-foreground">{device.serial}</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">IMEI</label>
            <p className="text-base font-mono text-foreground">{device.imei}</p>
          </div>
          {device.storage && (
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Storage</label>
              <p className="text-base text-foreground">{device.storage}GB</p>
            </div>
          )}
          {device.memory && (
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Memory</label>
              <p className="text-base text-foreground">{device.memory}GB</p>
            </div>
          )}
          {device.color && (
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Color</label>
              <p className="text-base text-foreground">{device.color}</p>
            </div>
          )}
          {device.warehouseName && (
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Warehouse</label>
              <p className="text-base text-foreground">{device.warehouseName}</p>
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Last Updated</label>
            <p className="text-base text-foreground">{new Date(device.deviceTransactionUpdatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Diagnostic Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground px-1">Diagnostic Results</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Passed Tests */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4 text-green-600">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-lg text-foreground">Passed Tests</h4>
            </div>
            {passedTests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {passedTests.map((test, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/40 text-sm text-foreground/80 border border-border/50">
                    {test}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specific passed tests recorded.</p>
            )}
          </div>

          {/* Failed Tests */}
          <div className={`bg-card border rounded-xl p-6 ${hasFailedTests ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' : 'border-border'}`}>
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-lg text-foreground">Failed Tests</h4>
            </div>
            {failedTests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {failedTests.map((test, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                    {test}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                All tests passed!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      {device.notes && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
          <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Additional Notes</h4>
          <p className="text-sm text-foreground/80 leading-relaxed">{device.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-8 border-t border-border">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2 h-12 px-6 border-border hover:bg-muted/50">
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Button>

        <Button onClick={onContinue} className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base">
          Continue to Product Selection
        </Button>
      </div>
    </div>
  );
} 