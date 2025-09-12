"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, User, MapPin, Clock, Smartphone, CreditCard, FileText, Truck, Edit, CheckCircle2, AlertCircle, Timer, XCircle } from 'lucide-react';
import { AdminEditCard } from '@/components/admin/AdminEditCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogCancel, 
  AlertDialogAction 
} from '@/components/ui/alert-dialog';
import { 
  AdminTable,
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/admin/ui/admin-table';
import { Badge } from '@/components/ui/badge';
import { DeviceSerialSearch } from '@/components/admin/buy-device/DeviceSerialSearch';
import { TestedDevice } from '@/lib/api/diagnosticsService';
import { shopService } from '@/lib/api/catalog/shopService';
import { Model, QuestionSetAssignment } from '@/types/catalog';
import { QuestionFlow } from '@/components/admin/buy-device/QuestionFlow';
import { Separator } from '@/components/ui/separator';

import { useGetOrderDetailsAdmin, useUpdateOrderStatusAdmin } from '@/hooks/useOrders';

const ORDER_STATUSES = [
  'PENDING',
  'ARRIVED', 
  'PAID',
  'REJECTED',
] as const;

// Helper to format currency
const formatCurrency = (amount?: number | string | null) => {
  if (amount === null || amount === undefined) return "N/A";
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "N/A";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(numericAmount);
};

// Helper to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_error) {
    console.warn("Invalid date string encountered:", dateString, _error);
    return "Invalid Date";
  }
};

// Modern Status Badge with Icons
const OrderStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return {
          variant: "outline" as const,
          icon: Timer,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200"
        };
      case "ARRIVED":
        return {
          variant: "secondary" as const,
          icon: CheckCircle2,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200"
        };
      case "PAID":
        return {
          variant: "default" as const,
          icon: CheckCircle2,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200"
        };
      case "REJECTED":
        return {
          variant: "destructive" as const,
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200"
        };
      default:
        return {
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200"
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const statusText = status?.replace(/_/g, " ").toLowerCase() || "Unknown";

  return (
    <Badge 
      variant={config.variant}
      className={`px-3 py-1 flex items-center gap-1.5 ${config.bgColor} ${config.borderColor} ${config.color} capitalize font-medium`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusText}
    </Badge>
  );
};

// Status Change Button with visual cues
const StatusChangeButton = ({ 
  currentStatus, 
  onStatusChange, 
  isUpdating 
}: { 
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isUpdating: boolean;
}) => {
  const isPaid = currentStatus?.toUpperCase() === "PAID";
  
  // Show all statuses except the current one
  const availableStatuses = ORDER_STATUSES.filter(status => status !== currentStatus?.toUpperCase());

  if (isPaid) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <CheckCircle2 className="h-4 w-4" />
        Order is paid - no changes allowed
      </div>
    );
  }

  return (
    <Select onValueChange={onStatusChange} disabled={isUpdating}>
      <SelectTrigger className="w-[220px] border-dashed border-2 hover:border-primary transition-colors">
        <div className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          <SelectValue placeholder="Change status..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableStatuses.map((status) => (
          <SelectItem key={status} value={status} className="capitalize">
            <div className="flex items-center gap-2">
              {status.toLowerCase() === 'pending' && <Timer className="h-4 w-4 text-orange-600" />}
              {status.toLowerCase() === 'arrived' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              {status.toLowerCase() === 'paid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {status.toLowerCase() === 'rejected' && <XCircle className="h-4 w-4 text-red-600" />}
              {status.replace(/_/g, ' ').toLowerCase()}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { data: order, isLoading, isError } = useGetOrderDetailsAdmin(orderId as string);
  const { mutate: updateStatus, status: updateStatusStatus } = useUpdateOrderStatusAdmin();
  const isUpdating = updateStatusStatus === 'pending';

  const [currentStatus, setCurrentStatus] = useState<string>();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [finalPrice, setFinalPrice] = useState<string>('');
  const [imei, setImei] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Added state for device lookup during PAID status update
  const [selectedDevice, setSelectedDevice] = useState<TestedDevice | null>(null);
  const [priceDeduction, setPriceDeduction] = useState<number>(0);
  const [modelBasePrice, setModelBasePrice] = useState<number>(0);
  const [answerModifierTotal, setAnswerModifierTotal] = useState<number>(0);
  const [answersBreakdown, setAnswersBreakdown] = useState<{ question: string; answer: string; modifier: number }[]>([]);

  // State for multi-step 'PAID' dialog
  const [dialogStep, setDialogStep] = useState<'search' | 'questions' | 'confirm'>('search');
  const [matchedProduct, setMatchedProduct] = useState<Model | null>(null);

  // Locale taken from route param ( [locale]/admin/orders/[id] )
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params as { locale?: string }).locale ?? 'en';

  useEffect(() => {
    if (order) {
      setCurrentStatus(order.status);
      if (order.finalPrice) {
        setFinalPrice(order.finalPrice.toString());
      }
      if (order.adminNotes) {
        setAdminNotes(order.adminNotes);
      }
    }
  }, [order]);

  /**
   * Step 1 (PAID Dialog): Find device and associated product model.
   */
  const handleDeviceFound = async (device: TestedDevice) => {
    setSelectedDevice(device);
    setImei(device.imei);
    setSku(device.skuCode || '');
    if (device.warehouseId) {
      setWarehouseId(String(device.warehouseId));
    }

    try {
      if (order?.shopId) {
        // Fetch the corresponding product model from catalog
        const response = await shopService.getPublishedModels(order.shopId, {
          search: device.modelName,
          limit: 1,
        });

        const model = response.data?.[0];

        if (model) {
          setMatchedProduct(model);
          setDialogStep('questions'); // Move straight to questions
        } else {
          toast.error(`Could not find a matching product in catalog for "${device.modelName}".`);
          setSelectedDevice(null);
        }
      }
    } catch {
      toast.error("An error occurred while matching the device to a product.");
      setSelectedDevice(null);
    }
  };

  /**
   * Step 2 (PAID Dialog): Process admin's answers from QuestionFlow.
   */
  const handleQuestionsCompleted = (
    answers: Record<string, string>,
    _estimatedPrice: number, // Price from questions (base + modifiers), we recalculate
    product: Model
  ) => {
    // Calculate price modifiers based on admin's answers
    let modifierTotal = 0;
    const breakdown: { question: string; answer: string; modifier: number }[] = [];

    if (product.questionSetAssignments) {
      product.questionSetAssignments.forEach((qsa: QuestionSetAssignment) => {
        qsa.questionSet.questions.forEach((q) => {
          const qKey = q.key || q.id.toString();
          const ansVal = answers[qKey];
          if (ansVal) {
            const opt = q.options.find((o) => (o.key || o.id.toString()) === ansVal);
            if (opt) {
              modifierTotal += opt.price_modifier;
              breakdown.push({ question: q.title, answer: opt.title, modifier: opt.price_modifier });
            }
          }
        });
      });
    }
    setAnswerModifierTotal(modifierTotal);
    setAnswersBreakdown(breakdown);
    setModelBasePrice(product.base_price || 0);

    // Now, calculate deduction from failed tests
    let deduction = 0;
    if (selectedDevice && product.testPriceDrops && product.testPriceDrops.length > 0) {
      const priceDropMap: Record<string, number> = {};
      product.testPriceDrops.forEach((pd) => {
        priceDropMap[pd.testName.toLowerCase()] = pd.priceDrop;
      });
      const failedTests = selectedDevice.testInfo?.failedResult?.split(',').map(s => s.trim()).filter(Boolean) || [];
      deduction = failedTests.reduce((sum, t) => sum + (priceDropMap[t.toLowerCase()] || 0), 0);
    }
    setPriceDeduction(deduction);

    // Set final price based on base, admin answers, and test deductions
    const finalSuggestedPrice = (product.base_price || 0) + modifierTotal - deduction;
    setFinalPrice(finalSuggestedPrice.toFixed(2));
    
    setDialogStep('confirm');
  };

  const requestStatusChange = (status: string) => {
    if (status === currentStatus) return;
    
    setPendingStatus(status);
    
    // Reset all fields for the dialog
    setFinalPrice('');
    setAdminNotes('');
    setImei('');
    setSku('');
    setWarehouseId('');
    setSelectedDevice(null);
    setPriceDeduction(0);
    setModelBasePrice(0);
    setAnswerModifierTotal(0);
    setAnswersBreakdown([]);
    setMatchedProduct(null);
    setDialogStep('search');
    
    setIsDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (!pendingStatus || !order) return;
    
    if ((pendingStatus === 'PAID') && 
        (!imei || !sku || !warehouseId || !finalPrice)) {
      toast.error('IMEI, SKU, Warehouse, and Final Price are required for Paid status');
      return;
    }
    
    const payload = { 
      newStatus: pendingStatus as 'PENDING' | 'ARRIVED' | 'PAID' | 'REJECTED',
      ...(pendingStatus === 'PAID' && { 
        finalPrice: finalPrice ? parseFloat(finalPrice) : undefined,
        imei,
        sku,
        serialNumber: selectedDevice?.serial,
        warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined
      }),
      ...(adminNotes && { adminNotes })
    };
    
    updateStatus(
      { orderId: order.id, payload },
      {
        onError: (error) => {
          toast.error('Failed to update status: ' + (error.message || ''));
        },
        onSuccess: () => {
          setCurrentStatus(pendingStatus);
          toast.success('Order status updated successfully');
          setIsDialogOpen(false);
          setPendingStatus(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-20">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-semibold">Order Not Found</h3>
          <p className="text-muted-foreground">The requested order could not be found or you don&apos;t have permission to access it.</p>
          <Button variant="outline" onClick={() => router.push('/admin/orders')}>        
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminEditCard
      title={`Order #${order.order_number}`}
      description={`Created on ${formatDate(order.created_at)}`}
      breadcrumbs={[
        { href: '/admin/dashboards', label: 'Admin' },
        { href: '/admin/orders', label: 'Orders' },
        { label: `Order #${order.orderNumber}`, isCurrentPage: true }
      ]}
      actionButtons={
        <div className="flex items-center gap-4">
          <OrderStatusBadge status={order.status} />
          <StatusChangeButton 
            currentStatus={currentStatus || order.status}
            onStatusChange={requestStatusChange}
            isUpdating={isUpdating}
          />
        </div>
      }
    >
      {/* Order Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Device</p>
                <p className="text-lg font-semibold text-blue-800">{order.device_snapshot.modelName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Estimated Price</p>
                <p className="text-lg font-semibold text-green-800">{formatCurrency(order.estimated_price)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {order.finalPrice && (
          <Card className="border border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-900">Final Price</p>
                  <p className="text-lg font-semibold text-purple-800">{formatCurrency(order.finalPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border border-gray-200 bg-gray-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Created</p>
                <p className="text-lg font-semibold text-gray-800">{formatDate(order.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-lg">
          <TabsTrigger value="details" className="data-[state=active]:bg-background">
            Order Details
          </TabsTrigger>
          <TabsTrigger value="status" className="data-[state=active]:bg-background">
            Status History
          </TabsTrigger>
          <TabsTrigger value="customer" className="data-[state=active]:bg-background">
            Customer
          </TabsTrigger>
          <TabsTrigger value="device" className="data-[state=active]:bg-background">
            Device
          </TabsTrigger>
        </TabsList>
      
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Smartphone className="mr-3 h-5 w-5 text-primary" /> Device Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-lg font-semibold">{order.device_snapshot.modelName}</p>
                  {typeof order.device_snapshot.brandName === "string" && order.device_snapshot.brandName.trim() !== "" && (
                    <p className="text-muted-foreground">Brand: {order.device_snapshot.brandName}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {Object.entries(order.device_snapshot)
                    .filter(([key]) => !['modelName', 'brandName'].includes(key))
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                                                 <p className="font-medium">{value ? String(value) : 'N/A'}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="mr-3 h-5 w-5 text-primary" /> Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Estimated Price:</span>
                    <span className="font-semibold text-lg">{formatCurrency(order.estimated_price)}</span>
                  </div>
                  {order.finalPrice && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground">Final Price:</span>
                      <span className="font-semibold text-lg text-primary">{formatCurrency(order.finalPrice)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {order.sellerNotes && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="mr-3 h-5 w-5 text-blue-600" /> Seller Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-lg">
                    {order.sellerNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {order.adminNotes && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="mr-3 h-5 w-5 text-orange-600" /> Admin Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-lg">
                    {order.adminNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Clock className="mr-3 h-5 w-5 text-primary" /> Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6">
                {order.statusHistory?.map((entry, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="flex flex-col items-center mr-6">
                      <div className="bg-primary text-primary-foreground p-2.5 rounded-full z-10 shadow-sm">
                        <Clock className="h-4 w-4" />
                      </div>
                      {idx < (order.statusHistory?.length || 0) - 1 && (
                        <div className="w-0.5 h-full bg-border mt-3 flex-grow"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-6 border-b border-dashed last:border-b-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h4 className="font-semibold text-base flex items-center gap-2">
                          <OrderStatusBadge status={entry.status} />
                        </h4>
                        <time className="text-sm text-muted-foreground">
                          {formatDate(entry.changedAt)}
                        </time>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mb-2 bg-muted/50 p-3 rounded-lg">
                          {entry.notes}
                        </p>
                      )}
                      {entry.changedByUserName && (
                        <p className="text-xs text-muted-foreground">
                          Updated by: <span className="font-medium">{entry.changedByUserName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {(!order.statusHistory || order.statusHistory.length === 0) && (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No status history available.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <User className="mr-3 h-5 w-5 text-primary" /> Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Name</Label>
                    <p className="font-semibold text-lg">{order.shipping.sellerName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                    <p className="font-medium">{order.shipping.sellerEmail}</p>
                  </div>
                  {order.shipping.sellerPhoneNumber && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                      <p className="font-medium">{order.shipping.sellerPhoneNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <MapPin className="mr-3 h-5 w-5 text-primary" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                  <p className="font-semibold">{order.shipping.sellerName}</p>
                  <p>{order.shipping.sellerStreet1}</p>
                  {order.shipping.sellerStreet2 && <p>{order.shipping.sellerStreet2}</p>}
                  <p>
                    {order.shipping.sellerCity}, {order.shipping.sellerStateProvince}{' '}
                    {order.shipping.sellerPostalCode}
                  </p>
                  <p className="font-medium">{order.shipping.sellerCountryCode}</p>
                </div>

                {order.shipping.trackingNumber && (
                  <div className="pt-4 border-t">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tracking Information</Label>
                    <div className="flex items-center mt-2 bg-blue-50 p-3 rounded-lg">
                      <Truck className="mr-3 h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-900">{order.shipping.trackingNumber}</p>
                        {order.shipping.shippingProvider && (
                          <p className="text-sm text-blue-700">via {order.shipping.shippingProvider}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="device" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Smartphone className="mr-3 h-5 w-5 text-primary" /> Device Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminTable title="Device Properties">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Property</TableHead>
                      <TableHead className="font-semibold">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(order.device_snapshot).map(([key, value]) => (
                      <TableRow key={key} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </TableCell>
                        <TableCell>{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdminTable>

              {order.conditionAnswers && order.conditionAnswers.length > 0 && (
                <div className="mt-8">
                  <AdminTable title="Condition Assessment">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Question</TableHead>
                          <TableHead className="font-semibold">Answer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.conditionAnswers.map((answer, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{answer.questionTextSnapshot}</TableCell>
                            <TableCell>{answer.answerTextSnapshot || String(answer.answerValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AdminTable>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Change Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
        if (!isUpdating) {
          setIsDialogOpen(open);
          if (!open) {
            setPendingStatus(null);
            setSelectedDevice(null);
            setPriceDeduction(0);
            setModelBasePrice(0);
            setAnswerModifierTotal(0);
            setAnswersBreakdown([]);
            setMatchedProduct(null);
            setDialogStep('search');
          }
        }
      }}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
                             Change Order Status to &quot;{pendingStatus}&quot;
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === 'PAID' 
                ? 'Find the tested device and confirm conditions to mark this order as paid.'
                : `Are you sure you want to change status to ${pendingStatus?.replace(/_/g, ' ').toLowerCase()}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="text-sm">
            {pendingStatus === 'PAID' && (
             <div className="my-4 border-t border-b py-6 space-y-6">
               {dialogStep === 'search' && (
                 <DeviceSerialSearch onDeviceFound={handleDeviceFound} locale={locale} />
               )}

               {dialogStep === 'questions' && matchedProduct && (
                 <QuestionFlow
                   productSefUrl={matchedProduct.sef_url}
                   shopId={order.shopId}
                   onCompleted={handleQuestionsCompleted}
                   onBack={() => setDialogStep('search')}
                   locale={locale}
                 />
               )}

               {dialogStep === 'confirm' && selectedDevice && matchedProduct && (
                 <>
                   {/* Selected Device Summary */}
                   <Card className="border-blue-200 bg-blue-50/50">
                     <CardHeader className="pb-3">
                       <CardTitle className="text-md">Selected Device</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-2">
                       <p className="font-semibold">{selectedDevice.make} {selectedDevice.modelName}</p>
                       <p className="text-sm text-muted-foreground">
                         Serial: {selectedDevice.serial} • IMEI: {selectedDevice.imei}
                       </p>
                       {selectedDevice.warehouseName && (
                         <p className="text-sm text-muted-foreground">Warehouse: {selectedDevice.warehouseName}</p>
                       )}
                       {selectedDevice.testInfo?.failedResult && (
                         <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                           <p className="text-sm text-red-800">
                             <span className="font-semibold">Failed Tests:</span> {selectedDevice.testInfo.failedResult}
                           </p>
                         </div>
                       )}
                     </CardContent>
                   </Card>
                   
                   {/* Customer&apos;s Original Answers */}
                   <Card className="border-yellow-200 bg-yellow-50/50">
                     <CardHeader className="pb-3">
                       <CardTitle className="text-md">Customer&apos;s Original Answers</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="space-y-2">
                         {order.conditionAnswers.map(ans => (
                           <div key={ans.questionKey} className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-b-0">
                             <span className="text-sm">{ans.questionTextSnapshot}</span>
                             <span className="text-sm font-semibold">{ans.answerTextSnapshot || String(ans.answerValue)}</span>
                           </div>
                         ))}
                         {order.conditionAnswers.length === 0 && (
                           <p className="text-sm text-muted-foreground">No condition answers were provided.</p>
                         )}
                       </div>
                     </CardContent>
                   </Card>

                   {/* Admin&apos;s Price Assessment */}
                   {modelBasePrice !== 0 && (
                     <Card className="border-gray-200">
                       <CardHeader className="pb-3">
                         <CardTitle className="text-md">Admin&apos;s Price Assessment</CardTitle>
                       </CardHeader>
                       <CardContent>
                         <div className="space-y-3">
                           <div className="flex justify-between items-center">
                             <span>Base Price</span>
                             <span className="font-semibold">€{modelBasePrice.toFixed(2)}</span>
                           </div>
                           {answersBreakdown.map((item, idx) => (
                             <div key={idx} className="flex justify-between items-center text-sm">
                               <span>{item.question}: {item.answer}</span>
                               <span className={`font-medium ${item.modifier >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 {item.modifier >= 0 ? '+' : ''}€{item.modifier.toFixed(2)}
                               </span>
                             </div>
                           ))}
                           {selectedDevice?.testInfo?.failedResult && (
                             <div className="flex justify-between items-center text-sm">
                               <span>Failed Tests Deduction</span>
                               <span className="font-medium text-red-600">-€{priceDeduction.toFixed(2)}</span>
                             </div>
                           )}
                           <Separator />
                           <div className="flex justify-between items-center font-semibold text-lg">
                             <span>Suggested Price</span>
                             <span className="text-primary">€{((modelBasePrice + answerModifierTotal) - priceDeduction).toFixed(2)}</span>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   )}

                   {/* Form Fields */}
                   <Card>
                     <CardHeader className="pb-3">
                       <CardTitle className="text-md">Final Details</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Label htmlFor="imei">IMEI <span className="text-red-500">*</span></Label>
                           <Input id="imei" value={imei} disabled className="bg-muted" />
                         </div>
                         <div>
                           <Label htmlFor="sku">SKU <span className="text-red-500">*</span></Label>
                           <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
                         </div>
                       </div>
                       <div>
                         <Label>Warehouse</Label>
                         <Input value={selectedDevice?.warehouseName || ''} disabled className="bg-muted" />
                       </div>
                       <div>
                         <Label htmlFor="final-price">Final Price (EUR) <span className="text-red-500">*</span></Label>
                         <Input 
                           id="final-price" 
                           type="number" 
                           step="0.01" 
                           value={finalPrice} 
                           onChange={(e) => setFinalPrice(e.target.value)} 
                           required 
                         />
                       </div>
                       <div>
                         <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                         <Input 
                           id="admin-notes" 
                           value={adminNotes} 
                           onChange={(e) => setAdminNotes(e.target.value)} 
                         />
                       </div>
                     </CardContent>
                   </Card>
                 </>
               )}
             </div>
            )}

            {pendingStatus !== 'PAID' && (
              <div className="my-4 border-t border-b py-6">
                <div>
                  <Label htmlFor="admin-notes-non-paid">Admin Notes (Optional)</Label>
                  <Input
                    id="admin-notes-non-paid"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this status change..."
                    disabled={isUpdating}
                  />
                </div>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Status Change
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminEditCard>
  );
}