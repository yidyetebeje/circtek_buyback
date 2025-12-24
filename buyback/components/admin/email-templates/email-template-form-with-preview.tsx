"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TipTapEditor } from '@/components/ui/tiptap-editor';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Eye,
  Code2,
  Save,
  ArrowLeft,
  RefreshCw,
  Zap,
  Mail,
  User,
  Package,
  Store,
  Settings2,
  ChevronDown,
  Plus,
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react";

import {
  EmailTemplate,
  EmailTemplateCreateRequest,
  EmailTemplateType,
  EMAIL_TEMPLATE_TYPE,
  EmailTemplatePopulateRequest
} from "@/types/emailTemplates";
import { useDynamicFieldsGrouped, usePopulateEmailTemplate } from "@/hooks/useEmailTemplates";

const EMAIL_TEMPLATE_TYPES = {
  ORDER_CONFIRMATION: "Order Confirmation",
  SHIPMENT_RECEIVED: "Shipment Received",
  OFFER_REJECTED: "Offer Rejected",
  ORDER_COMPLETED: "Order Completed",
  CUSTOM: "Custom"
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  order: { icon: Package, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100/50 dark:bg-blue-950/50" },
  customer: { icon: User, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100/50 dark:bg-green-950/50" },
  device: { icon: Settings2, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100/50 dark:bg-purple-950/50" },
  shop: { icon: Store, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100/50 dark:bg-orange-950/50" },
  default: { icon: FileText, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100/50 dark:bg-slate-900/50" },
};

const templateTypeValues = Object.keys(EMAIL_TEMPLATE_TYPE) as [EmailTemplateType, ...EmailTemplateType[]];

const emailTemplateFormSchema = z.object({
  name: z.string().min(1, { message: "Template name is required." }),
  subject: z.string().min(1, { message: "Subject is required." }),
  content: z.string().min(1, { message: "Content is required." }),
  templateType: z.enum(templateTypeValues, { message: "Template type is required." }),
  isActive: z.boolean(),
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;

interface EmailTemplateFormWithPreviewProps {
  initialData?: EmailTemplate | null;
  onSave: (values: EmailTemplateCreateRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EmailTemplateFormWithPreview({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
}: EmailTemplateFormWithPreviewProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  // Always auto-preview
  const [lastPreviewContent, setLastPreviewContent] = useState<string>('');
  const [lastPreviewSubject, setLastPreviewSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['order', 'customer', 'device', 'shop']));
  const [focusedField, setFocusedField] = useState<'subject' | 'content'>('content');
  const [recentlyInserted, setRecentlyInserted] = useState<string | null>(null);

  const { data: dynamicFieldsResponse, isLoading: loadingFields } = useDynamicFieldsGrouped();
  const previewMutation = usePopulateEmailTemplate();

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      subject: initialData?.subject || '',
      content: initialData?.content || '',
      templateType: (initialData?.templateType as EmailTemplateType) || 'CUSTOM',
      isActive: initialData ? Boolean(initialData.isActive) : true,
    },
  });

  const watchedValues = form.watch();

  const dynamicFields = useMemo(() => {
    return dynamicFieldsResponse?.data || [];
  }, [dynamicFieldsResponse?.data]);

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return dynamicFields;
    const query = searchQuery.toLowerCase();
    return dynamicFields.map(group => ({
      ...group,
      fields: group.fields.filter(field =>
        field.displayName.toLowerCase().includes(query) ||
        field.fieldKey.toLowerCase().includes(query)
      )
    })).filter(group => group.fields.length > 0);
  }, [dynamicFields, searchQuery]);

  const generatePreview = useCallback(async (subject: string, content: string) => {
    if (!subject && !content) return;
    const templateId = initialData?.id || 'preview-template';
    const mockOrderId = `mock-order-${Date.now()}`;

    try {
      await previewMutation.mutateAsync({ templateId, orderId: mockOrderId, subject, content });
      setLastPreviewContent(content);
      setLastPreviewSubject(subject);
    } catch (error) {
      console.error('Preview error:', error);
    }
  }, [initialData?.id, previewMutation]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedAutoPreview = useCallback((subject: string, content: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      // Always generate preview if we have content
      if (subject || content) generatePreview(subject, content);
    }, 1000);
  }, [generatePreview]);

  useEffect(() => {
    // Check if content has changed AND we are in preview mode or just want to keep data fresh
    if (watchedValues.subject || watchedValues.content) {
      if (watchedValues.content !== lastPreviewContent || watchedValues.subject !== lastPreviewSubject) {
        debouncedAutoPreview(watchedValues.subject || '', watchedValues.content || '');
      }
    }
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [watchedValues.subject, watchedValues.content, debouncedAutoPreview, lastPreviewContent, lastPreviewSubject]);

  const handleSubmit = (values: EmailTemplateFormValues) => onSave(values);

  // Insert field based on currently focused field
  const insertField = (fieldKey: string) => {
    const placeholder = `{{${fieldKey}}}`;
    if (focusedField === 'subject') {
      const currentValue = form.getValues('subject');
      form.setValue('subject', currentValue + ' ' + placeholder);
      form.trigger('subject');
    } else {
      const currentValue = form.getValues('content');
      form.setValue('content', currentValue + ' ' + placeholder + ' ');
      form.trigger('content');
    }
    setRecentlyInserted(fieldKey);
    setTimeout(() => setRecentlyInserted(null), 1500);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  const handleManualPreview = async () => {
    const currentValues = form.getValues();
    if (!currentValues.content && !currentValues.subject) return;
    await generatePreview(currentValues.subject || '', currentValues.content || '');
    setActiveTab("preview");
  };

  const previewData = previewMutation.data?.data;
  const hasContentChanged = watchedValues.content !== lastPreviewContent || watchedValues.subject !== lastPreviewSubject;

  const getCategoryConfig = (category: string) => CATEGORY_CONFIG[category.toLowerCase()] || CATEGORY_CONFIG.default;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-card border rounded-xl shadow-sm overflow-hidden">
        {/* Header Toolbar - Fixed top */}
        <div className="shrink-0 border-b bg-background/95 backdrop-blur z-10">
          <div className="flex items-center justify-between px-4 py-2.5 gap-4">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="hidden sm:block">
                <h1 className="text-base font-medium text-foreground">
                  {initialData ? 'Edit Template' : 'New Template'}
                </h1>
              </div>
            </div>

            {/* Center: Tabs */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "edit"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <Code2 className="w-4 h-4" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${activeTab === "preview"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <Eye className="w-4 h-4" />
                Preview
                {hasContentChanged && previewData && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={isLoading}
                onClick={form.handleSubmit(handleSubmit)}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">{isLoading ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - fills remaining height */}
        <div className="flex-1 min-h-0 flex">
          <AnimatePresence mode="wait">
            {activeTab === "edit" ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex min-h-0"
              >
                {/* Editor Panel - scrolls independently */}
                <div className="flex-1 overflow-y-auto">
                  <Form {...form}>
                    <form className="p-6 space-y-6 max-w-4xl">
                      {/* Template Name & Type Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground">Template Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Order Confirmation" className="h-10" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="templateType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground">Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(EMAIL_TEMPLATE_TYPES).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Subject - with focus tracking */}
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground">Subject Line</FormLabel>
                              {focusedField === 'subject' && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Fields insert here
                                </Badge>
                              )}
                            </div>
                            <FormControl>
                              <Input
                                placeholder="Your order #{{order.orderNumber}} has been confirmed"
                                className={`h-11 transition-all ${focusedField === 'subject' ? 'ring-2 ring-primary/20' : ''}`}
                                onFocus={() => setFocusedField('subject')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Content Editor - with focus tracking */}
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground">Email Content</FormLabel>
                              {focusedField === 'content' && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Fields insert here
                                </Badge>
                              )}
                            </div>
                            <FormControl>
                              <div
                                onFocus={() => setFocusedField('content')}
                                className={`transition-all rounded-md ${focusedField === 'content' ? 'ring-2 ring-primary/20' : ''}`}
                              >
                                <TipTapEditor
                                  content={field.value}
                                  onChange={field.onChange}
                                  placeholder="Start writing your email content..."
                                  minHeight="400px"
                                  className="bg-white dark:bg-slate-900"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Status Toggle */}
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${field.value ? 'bg-green-100 dark:bg-green-950' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                {field.value ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-slate-500" />}
                              </div>
                              <div>
                                <FormLabel className="font-medium cursor-pointer">
                                  {field.value ? 'Active' : 'Inactive'}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  {field.value ? 'Template is live' : 'Template is disabled'}
                                </p>
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-green-500" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </div>

                {/* Dynamic Fields Sidebar - scrolls independently */}
                <div className="hidden lg:flex flex-col w-72 border-l bg-card shrink-0 min-h-0">
                  <div className="p-4 border-b space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Dynamic Fields</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click a field to insert into <span className="font-medium text-foreground">{focusedField === 'subject' ? 'Subject' : 'Content'}</span>
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-3 space-y-1">
                      {loadingFields ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredFields.length === 0 ? (
                        <p className="text-center py-8 text-sm text-muted-foreground">No fields found</p>
                      ) : (
                        filteredFields.map((group) => {
                          const config = getCategoryConfig(group.category);
                          const IconComponent = config.icon;
                          const isOpen = openCategories.has(group.category.toLowerCase());

                          return (
                            <Collapsible key={group.category} open={isOpen} onOpenChange={() => toggleCategory(group.category.toLowerCase())}>
                              <CollapsibleTrigger className="w-full">
                                <div className={`flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-muted ${config.bgColor}`}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className={`w-4 h-4 ${config.color}`} />
                                    <span className="font-medium text-sm capitalize">{group.category}</span>
                                    <Badge variant="secondary" className="text-xs h-5">{group.fields.length}</Badge>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} text-muted-foreground`} />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="pt-1 pb-2 space-y-0.5">
                                  {group.fields.map((field) => (
                                    <Tooltip key={field.id}>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => insertField(field.fieldKey)}
                                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all hover:bg-muted group ${recentlyInserted === field.fieldKey ? 'bg-green-50 dark:bg-green-950 ring-1 ring-green-500' : ''
                                            }`}
                                        >
                                          <Plus className={`w-3 h-3 shrink-0 ${recentlyInserted === field.fieldKey ? 'text-green-500' : 'text-muted-foreground group-hover:text-primary'}`} />
                                          <span className="text-sm truncate">{field.displayName}</span>
                                          {recentlyInserted === field.fieldKey && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-[180px]">
                                        <p className="font-mono text-xs text-primary">{`{{${field.fieldKey}}}`}</p>
                                        {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-auto p-6"
              >
                {previewMutation.isPending ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                      <p className="text-muted-foreground">Generating preview...</p>
                    </div>
                  </div>
                ) : previewData ? (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border">
                      {/* Email Header */}
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <p className="text-muted-foreground">From: <span className="text-foreground">noreply@yourcompany.com</span></p>
                            <p className="text-muted-foreground">To: <span className="text-foreground">customer@email.com</span></p>
                          </div>
                        </div>
                        <Separator />
                        <h2 className="text-lg font-semibold pt-1">{previewData.subject || 'No subject'}</h2>
                      </div>
                      {/* Email Body */}
                      <div className="p-6">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: previewData.content || '<p>No content</p>' }}
                        />
                      </div>
                    </div>

                    {previewData.populatedFields && Object.keys(previewData.populatedFields).length > 0 && (
                      <div className="mt-6 p-4 rounded-lg bg-white dark:bg-slate-900 border">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Sample Data
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(previewData.populatedFields).slice(0, 6).map(([key, value]) => (
                            <div key={key} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                              <span className="text-muted-foreground truncate">{key}</span>
                              <Badge variant="secondary" className="font-mono text-xs ml-2">{String(value)}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasContentChanged && (
                      <p className="mt-4 text-center text-sm text-orange-600 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Updating preview...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                        <Eye className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">No Preview Yet</h3>
                        <p className="text-sm text-muted-foreground">Click Preview to see your email</p>
                      </div>
                      <Button onClick={handleManualPreview} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" /> Generate Preview
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}