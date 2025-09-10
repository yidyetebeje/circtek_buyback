"use client";

import React from 'react';
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
import { Plus, Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Import the new types and hooks
import {
  EmailTemplate,
  EmailTemplateCreateRequest,
  EmailTemplateType,
  EMAIL_TEMPLATE_TYPE
} from "@/types/emailTemplates";
import { useDynamicFieldsGrouped } from "@/hooks/useEmailTemplates";

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

interface EmailTemplateFormProps {
  initialData?: EmailTemplate | null;
  onSave: (values: EmailTemplateCreateRequest) => void;
  onCancel: () => void;
}

export function EmailTemplateForm({
  initialData,
  onSave,
  onCancel,
}: EmailTemplateFormProps) {
  // Use the new hook to fetch dynamic fields
  const { data: dynamicFieldsResponse, isLoading: loadingFields } = useDynamicFieldsGrouped();
  const dynamicFields = dynamicFieldsResponse?.data || [];

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

  // Handle form submission
  const handleSubmit = (values: EmailTemplateFormValues) => {
    onSave(values);
  };

  // Insert dynamic field into content
  const insertField = (fieldKey: string) => {
    const currentContent = form.getValues('content');
    const placeholder = `{{${fieldKey}}}`;
    const newContent = currentContent + ' ' + placeholder + ' ';
    form.setValue('content', newContent);
    // Trigger onChange to update the editor
    form.trigger('content');
  };

  // Insert dynamic field into subject
  const insertFieldIntoSubject = (fieldKey: string) => {
    const currentSubject = form.getValues('subject');
    const placeholder = `{{${fieldKey}}}`;
    const newSubject = currentSubject + ' ' + placeholder + ' ';
    form.setValue('subject', newSubject);
    // Trigger onChange to update the input
    form.trigger('subject');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className="lg:col-span-2">
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
                    You can use dynamic fields like {"{{order.orderNumber}}"} in the subject
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    Use the rich text editor to design your email. Insert dynamic fields from the sidebar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Dynamic Fields Sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4 z-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Dynamic Fields</CardTitle>
            <CardDescription className="text-xs">
              Click to add fields to your template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
            {loadingFields ? (
              <div className="text-sm text-muted-foreground">Loading fields...</div>
            ) : (
              dynamicFields.map((group) => (
                <div key={group.category} className="space-y-2">
                  <h4 className="text-sm font-medium capitalize text-muted-foreground">
                    {group.category}
                  </h4>
                  <div className="space-y-1">
                    {group.fields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1 flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs flex-1 justify-start"
                              onClick={() => insertField(field.fieldKey)}
                              title={`Insert {{${field.fieldKey}}} into content`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              {field.displayName}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => insertFieldIntoSubject(field.fieldKey)}
                              title={`Insert {{${field.fieldKey}}} into subject`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {field.description && (
                          <p className="text-xs text-muted-foreground ml-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              ))
            )}

            {!loadingFields && dynamicFields.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No dynamic fields available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 