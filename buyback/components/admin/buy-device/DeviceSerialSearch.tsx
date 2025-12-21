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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Search for Tested Device</h2>
        <p className="text-gray-600">
          Enter the device serial number to find tested devices available for purchase.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Enter device serial number..."
              value={serial}
              onChange={handleSerialChange}
              className="w-full pl-10"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={serial.length < 3 || isLoading}
            className="px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </Button>
        </div>
      </form>

      {/* Search Results */}
      {searchTerm && (
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Searching devices...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center p-4 text-red-800 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>Error searching devices. Please try again.</span>
            </div>
          )}

          {searchResults && !isLoading && (
            <>
              {uniqueDevices.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Device Not Found</h3>
                  <p className="text-gray-600">
                    No tested device found with serial &quot;{searchTerm}&quot;.
                    Please verify the serial number or ensure the device has been tested.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Found {uniqueDevices.length} device(s)
                  </h3>

                  <div className="grid gap-3">
                    {uniqueDevices.map((device) => (
                      <div
                        key={device.deviceTransactionId}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {device.make} {device.modelName}
                              </h4>
                              {device.grade && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  Grade {device.grade}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-600">
                              <div className="min-w-0">
                                <span className="font-medium">Serial:</span>
                                <span className="ml-1 break-all">{device.serial}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium">IMEI:</span>
                                <span className="ml-1 break-all">{device.imei}</span>
                              </div>
                              {device.storage && (
                                <div>
                                  <span className="font-medium">Storage:</span> {device.storage}GB
                                </div>
                              )}
                              {device.color && (
                                <div>
                                  <span className="font-medium">Color:</span> {device.color}
                                </div>
                              )}
                              {device.warehouseName && (
                                <div>
                                  <span className="font-medium">Warehouse:</span> {device.warehouseName}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Tested:</span> {new Date(device.testedAt).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Test Status */}
                            {device.testInfo && (
                              <div className="mt-3">
                                {device.testInfo.failedResult ? (
                                  <div className="text-sm">
                                    <span className="text-red-600 font-medium">Failed Tests:</span> {device.testInfo.failedResult}
                                  </div>
                                ) : (
                                  <div className="text-sm text-green-600 font-medium">
                                    All tests passed
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => handleSelectDevice(device)}
                            className="ml-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                            disabled={eligibilityCheckingId === device.deviceTransactionId}
                          >
                            {eligibilityCheckingId === device.deviceTransactionId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Select Device'
                            )}
                          </Button>
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