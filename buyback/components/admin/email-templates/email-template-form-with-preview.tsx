"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Code, Save, ArrowLeft, RefreshCw, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Import the types and hooks
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
  INSPECTION_COMPLETED: "Inspection Completed",
  OFFER_ACCEPTED: "Offer Accepted",
  OFFER_REJECTED: "Offer Rejected",
  ORDER_COMPLETED: "Order Completed",
  ORDER_CANCELLED: "Order Cancelled",
  CUSTOM: "Custom"
};

// Create array of template type values for zod validation
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
  const [activeTab, setActiveTab] = useState("edit");
  const [autoPreview, setAutoPreview] = useState(false);
  const [lastPreviewContent, setLastPreviewContent] = useState<string>('');
  const [lastPreviewSubject, setLastPreviewSubject] = useState<string>('');

  // Use the hook to fetch dynamic fields
  const { data: dynamicFieldsResponse, isLoading: loadingFields } = useDynamicFieldsGrouped();

  // Preview mutation
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

  // Watch form values for preview
  const watchedValues = form.watch();

  // Flatten dynamic fields for easier dropdown access
  const allDynamicFields = useMemo(() => {
    const dynamicFields = dynamicFieldsResponse?.data || [];
    return dynamicFields.flatMap(group =>
      group.fields.map(field => ({
        ...field,
        category: group.category,
        label: `${group.category}: ${field.displayName}`,
        value: field.fieldKey
      }))
    );
  }, [dynamicFieldsResponse?.data]);

  // Generate preview function
  const generatePreview = useCallback(async (subject: string, content: string) => {
   
      subject: subject || '(empty)',
      content: content || '(empty)',
      subjectLength: subject?.length || 0,
      contentLength: content?.length || 0,
      hasSubject: !!subject,
      hasContent: !!content
    });

    if (!subject && !content) {
     
      return;
    }

    const templateId = initialData?.id || 'preview-template';
    const mockOrderId = `mock-order-${Date.now()}`;

    const previewRequest: EmailTemplatePopulateRequest = {
      templateId,
      orderId: mockOrderId,
      subject,
      content
    };

   
      templateId,
      orderId: mockOrderId,
      hasSubject: !!subject,
      hasContent: !!content,
      subjectLength: subject?.length || 0,
      contentLength: content?.length || 0,
      actualSubject: subject,
      actualContent: content
    });

    try {
      const result = await previewMutation.mutateAsync(previewRequest);
     
      setLastPreviewContent(content);
      setLastPreviewSubject(subject);
    } catch (error) {
      console.error('Preview error:', error);
    }
  }, [initialData?.id, previewMutation]);

  // Custom debounce implementation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedAutoPreview = useCallback((subject: string, content: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (autoPreview && (subject || content)) {
        generatePreview(subject, content);
      }
    }, 1000);
  }, [autoPreview, generatePreview]);

  // Auto-preview effect
  useEffect(() => {
    if (autoPreview && (watchedValues.subject || watchedValues.content)) {
      // Only trigger if content has actually changed
      if (watchedValues.content !== lastPreviewContent || watchedValues.subject !== lastPreviewSubject) {
       
          subject: watchedValues.subject || '(empty)',
          content: watchedValues.content || '(empty)',
          lastPreviewSubject: lastPreviewSubject || '(empty)',
          lastPreviewContent: lastPreviewContent || '(empty)'
        });
        debouncedAutoPreview(watchedValues.subject || '', watchedValues.content || '');
      }
    }
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [watchedValues.subject, watchedValues.content, autoPreview, debouncedAutoPreview, lastPreviewContent, lastPreviewSubject]);

  // Handle form submission
  const handleSubmit = (values: EmailTemplateFormValues) => {
    onSave(values);
  };

  // Insert dynamic field into content
  const insertFieldIntoContent = (fieldKey: string) => {
    const currentContent = form.getValues('content');
    const placeholder = ` {{${fieldKey}}} `;
    const newContent = currentContent + placeholder;
    form.setValue('content', newContent);
    form.trigger('content');
  };

  // Insert dynamic field into subject
  const insertFieldIntoSubject = (fieldKey: string) => {
    const currentSubject = form.getValues('subject');
    const placeholder = ` {{${fieldKey}}} `;
    const newSubject = currentSubject + placeholder;
    form.setValue('subject', newSubject);
    form.trigger('subject');
  };

  // Manual preview generation
  const handleManualPreview = async () => {
    // Get the latest form values directly
    const currentValues = form.getValues();
   
      subject: currentValues.subject || '(empty)',
      content: currentValues.content || '(empty)',
      watchedSubject: watchedValues.subject || '(empty)',
      watchedContent: watchedValues.content || '(empty)'
    });
    
    if (!currentValues.content && !currentValues.subject) {
     
      return;
    }
    
    await generatePreview(currentValues.subject || '', currentValues.content || '');
    setActiveTab("preview");
  };

  const previewData = previewMutation.data?.data;
  const hasContentChanged = watchedValues.content !== lastPreviewContent || watchedValues.subject !== lastPreviewSubject;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Edit Template
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
              {hasContentChanged && previewData && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Outdated
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoPreview}
                onCheckedChange={setAutoPreview}
                id="auto-preview"
              />
              <label htmlFor="auto-preview" className="text-sm font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Auto Preview
              </label>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleManualPreview}
              disabled={previewMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${previewMutation.isPending ? 'animate-spin' : ''}`} />
              {previewMutation.isPending ? 'Generating...' : 'Update Preview'}
            </Button>
            
            <Button type="button" variant="outline" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        <TabsContent value="edit" className="space-y-6">
          <div className="w-full">
            {/* Main Form - Full width */}
            <div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter template name" {...field} />
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
                          <FormLabel>Template Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select template type" />
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

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter email subject" {...field} />
                            </FormControl>
                            <FormDescription>
                              You can use dynamic fields in the subject
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <Select onValueChange={insertFieldIntoSubject}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Add field to subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDynamicFields.map((field) => (
                            <SelectItem key={`subject-${field.id}`} value={field.fieldKey}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Content</FormLabel>
                            <FormControl>
                              <TipTapEditor
                                content={field.value}
                                onChange={field.onChange}
                                placeholder="Enter email content..."
                                minHeight="300px"
                              />
                            </FormControl>
                            <FormDescription>
                              Use the rich text editor to design your email. Insert dynamic fields using the dropdown.
                              {autoPreview && (
                                <span className="text-green-600 ml-2">
                                  ⚡ Auto-preview is enabled
                                </span>
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-6">
                      <label className="text-sm font-medium">Add Field to Content</label>
                      <Select onValueChange={insertFieldIntoContent}>
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Insert dynamic field" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingFields ? (
                            <SelectItem value="loading" disabled>Loading fields...</SelectItem>
                          ) : (
                            allDynamicFields.map((field) => (
                              <SelectItem key={`content-${field.id}`} value={field.fieldKey}>
                                {field.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {!loadingFields && allDynamicFields.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          No dynamic fields available
                        </p>
                      )}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Template</FormLabel>
                          <FormDescription>
                            Enable this template to be used for sending emails
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isLoading ? 'Saving...' : (initialData ? 'Update Template' : 'Create Template')}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Preview</CardTitle>
                  <CardDescription>
                    Preview of how the email will look when sent
                  </CardDescription>
                </div>
                {hasContentChanged && previewData && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Content has changed since last preview
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {previewMutation.isPending ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Generating preview...</p>
                  </div>
                </div>
              ) : previewData ? (
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg">Subject</h3>
                    <p className="text-muted-foreground">{previewData.subject}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Content</h3>
                    <div
                      className="prose prose-sm max-w-none border rounded-lg p-4 bg-background"
                      dangerouslySetInnerHTML={{ __html: previewData.content }}
                    />
                  </div>
                  {previewData.populatedFields && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Sample Data Used:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(previewData.populatedFields).slice(0, 6).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono text-xs">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Click &quot;Update Preview&quot; or enable auto-preview to see how your email will look
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 