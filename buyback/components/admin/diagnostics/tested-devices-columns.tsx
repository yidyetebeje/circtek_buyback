"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TestedDevice } from "@/lib/api/diagnosticsService";
import { ArrowUpDown, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DeviceDetailsModal = ({ device }: { device: TestedDevice }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Device Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Storage</label>
                            <p className="text-sm">{device.storage ? `${device.storage} GB` : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Memory</label>
                            <p className="text-sm">{device.memory ? `${device.memory} GB` : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Color</label>
                            <p className="text-sm">{device.color || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">IMEI</label>
                            <p className="text-sm">{device.imei}</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const TestReportModal = ({ device }: { device: TestedDevice }) => {
    if (!device.testInfo) {
        return <span className="text-sm text-gray-500">No test report available.</span>;
    }

    const passedTests = device.testInfo.passedResult?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const failedTests = device.testInfo.failedResult?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const hasFailed = failedTests.length > 0;
    const maxLength = Math.max(passedTests.length, failedTests.length);
    const testPairs = Array.from({ length: maxLength }, (_, i) => ({
      passed: passedTests[i],
      failed: failedTests[i],
    }));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-auto p-2 font-medium ${
                        hasFailed 
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                >
                    {hasFailed ? 'Diagnostic Failed' : 'Diagnostic Passed'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl p-0">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold pt-6 pb-4">Diagnostics</DialogTitle>
                </DialogHeader>
                <div className="border-t">
                    <div className="grid grid-cols-2 gap-x-4 border-b py-2 px-6 bg-gray-50">
                        <h3 className="font-semibold text-gray-500 uppercase text-sm">Passed</h3>
                        <h3 className="font-semibold text-gray-500 uppercase text-sm">Failed</h3>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {testPairs.map((pair, index) => (
                          <div key={index} className="grid grid-cols-2 gap-x-4 border-b last:border-b-0 px-6 hover:bg-gray-50">
                              <div className="py-3 text-sm text-gray-800">{pair.passed}</div>
                              <div className="py-3 text-sm text-red-600 font-medium">{pair.failed}</div>
                          </div>
                      ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Helper function to format date in a more readable way
const formatReadableDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
};

export const columns: ColumnDef<TestedDevice>[] = [
    {
        id: "pdfReport",
        header: "Report",
        cell: ({ row }) => {
            const deviceTransactionId = row.original.deviceTransactionId;
            return (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(`https://stg-app.circtek.io/device-report?id=${deviceTransactionId}`, '_blank')}
                >
                    <FileText className="h-4 w-4" />
                </Button>
            );
        },
        meta: {
            className: "w-[80px]"
        }
    },
    {
        accessorKey: "deviceTransactionUpdatedAt",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium"
                >
                    Tested At
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => (
            <div className="text-sm">
                {formatReadableDate(row.getValue("deviceTransactionUpdatedAt"))}
            </div>
        ),
        meta: {
            className: "min-w-[180px]"
        }
    },
    {
        id: 'device',
        accessorFn: row => `${row.make} ${row.modelName}`,
        header: "Device",
        cell: ({ row }) => (
            <div className="font-medium text-sm">
                {row.original.make} {row.original.modelName}
            </div>
        ),
        meta: {
            className: "min-w-[200px]"
        }
    },
    {
        accessorKey: "serial",
        header: "Serial",
        cell: ({ row }) => (
            <div className="text-sm font-mono">
                {row.getValue("serial")}
            </div>
        ),
        meta: {
            className: "min-w-[120px]"
        }
    },
    {
        accessorKey: "grade",
        header: "Grade",
        cell: ({ row }) => (
            <div className="text-sm">
                {row.getValue("grade") || 'N/A'}
            </div>
        ),
        meta: {
            className: "w-[80px]"
        }
    },
    {
        accessorKey: "warehouseName",
        header: "Location",
        cell: ({ row }) => (
            <div className="text-sm">
                {row.getValue("warehouseName") || 'N/A'}
            </div>
        ),
        meta: {
            className: "min-w-[120px]"
        }
    },
    {
        id: 'deviceDetails',
        header: "Details",
        cell: ({ row }) => <DeviceDetailsModal device={row.original} />,
        meta: {
            className: "w-[80px]"
        }
    },
    {
        id: 'testReport',
        header: "Diagnostic",
        cell: ({ row }) => <TestReportModal device={row.original} />,
        meta: {
            className: "min-w-[120px]"
        }
    },
]; 