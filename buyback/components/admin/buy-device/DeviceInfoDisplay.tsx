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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Device Information</h2>
          <p className="text-muted-foreground">
            Review the tested device details and diagnostic results before proceeding.
          </p>
        </div>
        <Button variant="outline" onClick={handleViewReport} className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          View Full Report
        </Button>
      </div>

      {/* Device Basic Info */}
      <div className="bg-muted/40 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-card rounded-lg flex items-center justify-center border border-border">
            <span className="text-2xl">📱</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {device.make} {device.modelName}
            </h3>
            {device.grade && (
              <span className="inline-block mt-1 px-3 py-1 text-sm font-medium bg-blue-500/10 text-blue-600 rounded-full">
                Grade {device.grade}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
            <p className="text-sm font-mono text-foreground">{device.serial}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">IMEI</label>
            <p className="text-sm font-mono text-foreground">{device.imei}</p>
          </div>
          {device.storage && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Storage</label>
              <p className="text-sm text-foreground">{device.storage}GB</p>
            </div>
          )}
          {device.memory && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Memory</label>
              <p className="text-sm text-foreground">{device.memory}GB</p>
            </div>
          )}
          {device.color && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Color</label>
              <p className="text-sm text-foreground">{device.color}</p>
            </div>
          )}
          {device.warehouseName && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
              <p className="text-sm text-foreground">{device.warehouseName}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tested Date</label>
            <p className="text-sm text-foreground">{new Date(device.testedAt).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="text-sm text-foreground">{new Date(device.deviceTransactionUpdatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Diagnostic Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Diagnostic Results</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Passed Tests */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-600">Passed Tests</h4>
            </div>
            {passedTests.length > 0 ? (
              <ul className="space-y-1">
                {passedTests.map((test, index) => (
                  <li key={index} className="text-sm text-green-600/90">
                    • {test}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">No passed tests recorded</p>
            )}
          </div>

          {/* Failed Tests */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-red-600">Failed Tests</h4>
            </div>
            {failedTests.length > 0 ? (
              <ul className="space-y-1">
                {failedTests.map((test, index) => (
                  <li key={index} className="text-sm text-red-600/90">
                    • {test}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600">No failed tests - all tests passed! ✓</p>
            )}
          </div>
        </div>

        {/* Overall Status */}
        <div className={`p-4 rounded-lg border ${hasFailedTests
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-green-500/10 border-green-500/20'
          }`}>
          <div className="flex items-center gap-2">
            {hasFailedTests ? (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <span className={`font-medium ${hasFailedTests ? 'text-yellow-600' : 'text-green-600'
              }`}>
              {hasFailedTests
                ? 'Device has some failed tests - consider condition in pricing'
                : 'Device passed all diagnostic tests'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      {device.notes && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-600 mb-2">Additional Notes</h4>
          <p className="text-sm text-blue-600/90">{device.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Button>

        <Button onClick={onContinue} className="bg-blue-600 hover:bg-blue-700">
          Continue to Product Selection
        </Button>
      </div>
    </div>
  );
} 