"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import diagnosticsService, { TestedDevice } from '@/lib/api/diagnosticsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, Loader2 } from 'lucide-react';
import { orderService } from '@/lib/api/orderService';
import { toast } from 'sonner';

interface DeviceSerialSearchProps {
  onDeviceFound: (device: TestedDevice) => void;
  locale: string;
}

// Helper type for eligibility response
interface DeviceEligibilityResponse {
  purchasable: boolean;
  reason?: string;
}

export function DeviceSerialSearch({ onDeviceFound }: DeviceSerialSearchProps) {
  const [serial, setSerial] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [eligibilityCheckingId, setEligibilityCheckingId] = useState<number | null>(null);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['tested-devices-search', searchTerm],
    queryFn: () => diagnosticsService.getTestedDevices({
      serial: searchTerm,
      page: 1,
      pageSize: 10
    }),
    enabled: !!searchTerm && searchTerm.length >= 3,
  });

  // Group test results by device_id and keep the latest test for each device
  const uniqueDevices = useMemo(() => {
    if (!searchResults?.data) return [];

    const deviceMap = new Map<number, TestedDevice>();

    // Sort by tested date (newest first) and keep the latest test for each device
    const sortedResults = [...searchResults.data].sort(
      (a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()
    );

    for (const device of sortedResults) {
      if (!deviceMap.has(device.deviceId)) {
        deviceMap.set(device.deviceId, device);
      }
    }

    return Array.from(deviceMap.values());
  }, [searchResults?.data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (serial.trim().length >= 3) {
      setSearchTerm(serial.trim());
    }
  };

  const handleSerialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSerial(value);

    // Auto-search when user stops typing
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => {
        setSearchTerm(value.trim());
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  };

  const handleSelectDevice = async (device: TestedDevice) => {
    setEligibilityCheckingId(device.deviceTransactionId);
    try {
      const { data } = await orderService.checkDeviceEligibility({ imei: device.imei, serial: device.serial });
      const eligibility = data as DeviceEligibilityResponse;

      if (!eligibility.purchasable) {
        let msg = 'This device cannot be purchased.';
        if (eligibility.reason === 'IN_STOCK') {
          msg = 'This device is already in stock and cannot be purchased again.';
        } else if (eligibility.reason === 'ALREADY_PAID') {
          msg = 'A paid order already exists for this device.';
        }
        toast.error(msg);
        return;
      }

      onDeviceFound(device);
    } catch (err) {
      console.error('Error checking device eligibility:', err);
      toast.error('Unable to verify device eligibility. Please try again.');
    } finally {
      setEligibilityCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Search Device</h2>
        <p className="text-muted-foreground text-lg">
          Enter the device serial number to find tested devices available for purchase.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3">
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Enter device serial number..."
              value={serial}
              onChange={handleSerialChange}
              className="w-full pl-12 h-12 text-lg bg-background border-border focus-visible:ring-primary/20 transition-all font-mono"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={serial.length < 3 || isLoading}
            className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Search className="w-5 h-5 mr-2" />
            )}
            Search
          </Button>
        </div>
      </form>

      {/* Search Results */}
      {searchTerm && (
        <div className="space-y-6 pt-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-foreground">Searching devices...</p>
              <p className="text-muted-foreground">Looking for serial &quot;{searchTerm}&quot;</p>
            </div>
          )}

          {error && (
            <div className="flex items-center p-4 text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>Error searching devices. Please try again.</span>
            </div>
          )}

          {searchResults && !isLoading && (
            <>
              {uniqueDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Device Not Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No tested device found with serial <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">{searchTerm}</span>.
                    Please verify the serial number or ensure the device has been tested.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">
                      Found {uniqueDevices.length} device{uniqueDevices.length !== 1 ? 's' : ''}
                    </h3>
                  </div>

                  <div className="grid gap-4">
                    {uniqueDevices.map((device) => (
                      <div
                        key={device.deviceTransactionId}
                        className="group relative bg-card border border-border rounded-xl p-6 transition-all hover:border-primary/50"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <h4 className="text-lg font-semibold text-foreground">
                                  {device.make} {device.modelName}
                                </h4>
                                {device.grade && (
                                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800">
                                    Grade {device.grade}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Serial</span>
                                <p className="font-mono text-sm text-foreground break-all">{device.serial}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">IMEI</span>
                                <p className="font-mono text-sm text-foreground break-all">{device.imei}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Specs</span>
                                <p className="text-sm text-foreground">
                                  {[
                                    device.storage ? `${device.storage}GB` : null,
                                    device.color,
                                    device.memory ? `${device.memory}GB RAM` : null
                                  ].filter(Boolean).join(' • ')}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Location</span>
                                <p className="text-sm text-foreground">{device.warehouseName || 'Unknown'}</p>
                              </div>
                            </div>

                            {/* Test Status */}
                            {device.testInfo && (
                              <div className="flex items-center gap-2 pt-2">
                                {device.testInfo.failedResult ? (
                                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-800">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">Failed Tests:</span> {device.testInfo.failedResult}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-800">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="font-medium">All tests passed</span>
                                    <span className="text-muted-foreground text-xs ml-1">• Tested {new Date(device.testedAt).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center">
                            <Button
                              onClick={() => handleSelectDevice(device)}
                              className="w-full md:w-auto px-6 h-11 bg-foreground text-background hover:bg-foreground/90 transition-all font-medium"
                              disabled={eligibilityCheckingId === device.deviceTransactionId}
                            >
                              {eligibilityCheckingId === device.deviceTransactionId ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Checking...
                                </>
                              ) : (
                                'Select Device'
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 