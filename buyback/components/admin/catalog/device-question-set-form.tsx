"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from 'next-intl';
import { Plus, Settings, X, ChevronUp, ChevronDown, FileText, HelpCircle, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IndividualQuestion, QuestionOption } from "@/types/catalog/device-questions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the Zod schema for an individual option
const individualOptionCreateSchema = z.object({
  id: z.number().optional(),
  title: z.string().trim().min(1, { message: "Option title is required." }).max(255, { message: "Title must be 255 characters or less." }),
  priceModifier: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = parseFloat(String(val).replace(',', '.'));
      return isNaN(num) ? null : num;
    },
    z.number().nullable().optional()
  ),
  isDefault: z.boolean().default(false),
  orderNo: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const strVal = String(val);
      const num = parseInt(strVal.match(/^\d+$/) ? strVal : "0", 10);
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0).default(0)
  ),
});

// Type for individual option form values
type IndividualOptionFormValues = z.infer<typeof individualOptionCreateSchema>;

// Define the Zod schema for an individual question
const individualQuestionCreateSchema = z.object({
  id: z.number().optional(),
  title: z.string().trim().min(1, { message: "Question title is required." }).max(255, { message: "Title must be 255 characters or less." }),
  inputType: z.string().default("SINGLE_SELECT_RADIO"),
  isRequired: z.boolean().default(false),
  orderNo: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const strVal = String(val);
      const num = parseInt(strVal.match(/^\d+$/) ? strVal : "0", 10);
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0).default(0)
  ),
  options: z.array(individualOptionCreateSchema).default([]),
});

// Type for individual question form values
type IndividualQuestionFormValues = z.infer<typeof individualQuestionCreateSchema>;

// Helper function to generate internal name from display name
const generateInternalName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Define the Zod schema for the form validation - removed internalName from user input
const questionSetFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required." }).max(255, { message: "Name must be 255 characters or less." }),
  description: z.string().trim().optional(),
  questions: z.array(individualQuestionCreateSchema).default([]),
});

// Type for form values derived from the schema
export type QuestionSetFormValues = z.infer<typeof questionSetFormSchema>;

// Re-introduce INPUT_TYPES, it will be used in the modal
const INPUT_TYPES = [
  "SINGLE_SELECT_RADIO",
  "SINGLE_SELECT_DROPDOWN",
  "MULTI_SELECT_CHECKBOX",
  "TEXT_INPUT",
  "NUMBER_INPUT",
  "BOOLEAN_TOGGLE"
];

// Props for the new QuestionItem component
interface QuestionItemProps {
  question: IndividualQuestionFormValues;
  questionIndex: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  isLoading?: boolean;
  t: (key: string, options?: Record<string, string | number | Date>) => string;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  questionIndex,
  onRemove,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isLoading,
  t
}) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md bg-background">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
          {questionIndex + 1}
        </div>
        <div className="flex-grow">
          <h3 className="text-sm font-medium truncate max-w-xs md:max-w-sm">
            {question.title || 'New Question'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {question.options?.length || 0} options
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onMoveUp(questionIndex)}
                disabled={isLoading || isFirst}
                className="h-7 w-7 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('moveQuestionUp', { default: "Move Up" })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onMoveDown(questionIndex)}
                disabled={isLoading || isLast}
                className="h-7 w-7 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('moveQuestionDown', { default: "Move Down" })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onEdit(questionIndex)}
                disabled={isLoading}
                className="h-7 w-7 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('editQuestion', { default: "Edit Question" })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(questionIndex)}
                disabled={isLoading}
                className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('removeQuestion', { default: "Remove Question" })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// --- BEGIN QuestionEditModal ---
interface QuestionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IndividualQuestionFormValues) => void;
  initialData: IndividualQuestionFormValues | null;
  isLoading?: boolean;
  t: (key: string, options?: Record<string, string | number | Date>) => string;
  tCore: (key: string, options?: Record<string, string | number | Date>) => string;
}

const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading,
  t,
  tCore
}) => {
  const modalForm = useForm<IndividualQuestionFormValues>({
    resolver: zodResolver(individualQuestionCreateSchema) as Resolver<IndividualQuestionFormValues>,
    defaultValues: initialData || {
      title: "",
      inputType: "SINGLE_SELECT_RADIO",
      isRequired: false,
      options: [],
    },
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: modalForm.control,
    name: "options",
  });

  React.useEffect(() => {
    if (initialData) {
      modalForm.reset(initialData);
    } else {
      modalForm.reset({
        title: "",
        inputType: "SINGLE_SELECT_RADIO",
        isRequired: false,
        options: [],
      });
    }
  }, [initialData, modalForm.reset]);

  const handleModalSubmit = (data: IndividualQuestionFormValues) => {
    onSave(data);
    onClose(); // Close modal on save
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background text-foreground border border-border p-6 rounded-lg w-full max-w-lg max-h-[85vh] flex flex-col shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {initialData?.id || initialData?.title ? 'Edit Question' : 'Add Question'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Form {...modalForm}>
          <form onSubmit={modalForm.handleSubmit(handleModalSubmit)} className="space-y-4 overflow-y-auto flex-grow">
            <FormField
              control={modalForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., What is the device's screen condition?"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Options Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Options</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendOption({ id: undefined, title: '', priceModifier: null, isDefault: false, orderNo: optionFields.length } as IndividualOptionFormValues)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Option
                </Button>
              </div>

              {optionFields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">No options yet</p>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {optionFields.map((optionField, optionIndex) => (
                    <div
                      key={optionField.id}
                      className="p-3 border rounded-md space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Option {optionIndex + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(optionIndex)}
                          disabled={isLoading}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={modalForm.control}
                          name={`options.${optionIndex}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Title</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Excellent"
                                  {...field}
                                  disabled={isLoading}
                                  className="h-8"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={modalForm.control}
                          name={`options.${optionIndex}.priceModifier`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Price (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="-10.00"
                                  {...field}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === "" || val === null) {
                                      field.onChange(null);
                                    } else {
                                      const num = parseFloat(val.replace(',', '.'));
                                      field.onChange(isNaN(num) ? null : num);
                                    }
                                  }}
                                  value={field.value === undefined || field.value === null ? "" : String(field.value)}
                                  disabled={isLoading}
                                  className="h-8"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={modalForm.control}
                          name={`options.${optionIndex}.orderNo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Order</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                                  value={field.value ?? 0}
                                  disabled={isLoading}
                                  className="h-8"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </Form>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {tCore('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => modalForm.handleSubmit(handleModalSubmit)()}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : (initialData?.id || initialData?.title ? 'Save' : 'Add')}
          </Button>
        </div>
      </div>
    </div>
  );
};
// --- END QuestionEditModal ---

// Extended form values that include the generated internal name for API submission
export interface QuestionSetSubmitValues extends QuestionSetFormValues {
  internalName: string;
}

interface QuestionSetFormProps {
  initialData?: {
    id?: string;
    name?: string;
    displayName?: string; // Support legacy data structure
    description?: string;
    questions?: IndividualQuestion[];
  };
  onSubmit: (values: QuestionSetSubmitValues & { id?: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeviceQuestionSetForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: QuestionSetFormProps) {
  const tAdminCatalog = useTranslations('AdminCatalog');
  const tCore = useTranslations('Core');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  // Store the actual data for the modal, not just index
  const [currentQuestionDataForModal, setCurrentQuestionDataForModal] = useState<IndividualQuestionFormValues | null>(null);

  type InitialOptionData = {
    title?: string;
    priceModifier?: number | string | null;
    isDefault?: boolean;
    orderNo?: number;
  };

  const mapInitialQuestions = React.useCallback((initialQuestions?: IndividualQuestion[]): IndividualQuestionFormValues[] => {
    if (!initialQuestions) return [];
    return initialQuestions.map((q, index) => ({
      id: q.id,
      title: q.title || "",
      inputType: q.inputType || "",
      isRequired: q.isRequired || false,
      orderNo: q.orderNo !== undefined ? q.orderNo : index,
      options: (q.options as InitialOptionData[] | undefined)?.map(opt => {
        let priceModifierValue: number | null = null;
        if (opt.priceModifier !== undefined && opt.priceModifier !== null && opt.priceModifier !== "") {
          const num = parseFloat(String(opt.priceModifier).replace(',', '.'));
          if (!isNaN(num)) {
            priceModifierValue = num;
          }
        }
        return {
          id: (opt as QuestionOption).id,
          title: opt.title || "",
          priceModifier: priceModifierValue,
          isDefault: opt.isDefault || false,
          orderNo: opt.orderNo || 0,
        } as IndividualOptionFormValues;
      }) || [],
    }));
  }, []);

  const formDefaultValues = React.useMemo<QuestionSetFormValues>(() => ({
    // Support both 'name' and legacy 'displayName' field
    name: initialData?.name || initialData?.displayName || "",
    description: initialData?.description || undefined,
    questions: initialData?.questions ? mapInitialQuestions(initialData.questions) : [],
  }), [initialData, mapInitialQuestions]);

  const form = useForm<QuestionSetFormValues>({
    resolver: zodResolver(questionSetFormSchema) as Resolver<QuestionSetFormValues>,
    defaultValues: formDefaultValues,
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion, update: updateQuestion, move: moveQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const { control, handleSubmit } = form;

  const processSubmit = (values: QuestionSetFormValues) => {
    const questionsWithOrder = values.questions.map((question, index) => ({
      ...question,
      orderNo: index,
    }));

    // Generate internal name from the display name
    const internalName = generateInternalName(values.name);

    const submissionData: QuestionSetSubmitValues & { id?: string } = {
      ...values,
      internalName,
      questions: questionsWithOrder,
      ...(initialData?.id && { id: initialData.id })
    };
    onSubmit(submissionData);
  };

  const handleOpenQuestionModal = (index?: number) => {
    if (typeof index === 'number') {
      setEditingQuestionIndex(index);
      setCurrentQuestionDataForModal(form.getValues(`questions.${index}`));
    } else {
      setEditingQuestionIndex(null);
      setCurrentQuestionDataForModal({
        title: '',
        inputType: '',
        isRequired: false,
        orderNo: questionFields.length,
        options: [],
      } as IndividualQuestionFormValues);
    }
    setIsQuestionModalOpen(true);
  };

  const handleCloseQuestionModal = () => {
    setIsQuestionModalOpen(false);
    setEditingQuestionIndex(null);
    setCurrentQuestionDataForModal(null);
  };

  const handleSaveQuestionFromModal = (questionData: IndividualQuestionFormValues) => {
    if (editingQuestionIndex !== null) {
      const existingQuestion = form.getValues(`questions.${editingQuestionIndex}`);
      updateQuestion(editingQuestionIndex, {
        ...questionData,
        orderNo: existingQuestion.orderNo
      });
    } else {
      appendQuestion({
        ...questionData,
      });
    }
  };

  const handleRemoveQuestion = (index: number) => {
    removeQuestion(index);
  };

  const handleMoveQuestionUp = (index: number) => {
    if (index > 0) {
      moveQuestion(index, index - 1);
    }
  };

  const handleMoveQuestionDown = (index: number) => {
    if (index < questionFields.length - 1) {
      moveQuestion(index, index + 1);
    }
  };

  const handleAddNewQuestion = () => {
    // The template for a new question is now created inside handleOpenQuestionModal
    handleOpenQuestionModal();
  };

  const t = (key: string, options?: Record<string, unknown>) => {
    return tAdminCatalog(key, options as Record<string, string | number | Date>);
  };

  const modalT = (key: string, vals?: Record<string, string | number | Date>) => tAdminCatalog(key, vals);
  const modalTCore = (key: string, vals?: Record<string, string | number | Date>) => tCore(key, vals);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(processSubmit)} className="space-y-8">
        {/* Name Field */}
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Screen Condition Assessment"
                  {...field}
                  disabled={isLoading}
                  className="max-w-md"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Questions</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddNewQuestion}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Question
            </Button>
          </div>

          {questionFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-md">
              <p className="text-sm text-muted-foreground mb-4">No questions yet</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewQuestion}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Question
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {questionFields.map((questionField, questionIndex) => (
                <QuestionItem
                  key={questionField.id}
                  question={questionField as IndividualQuestionFormValues}
                  questionIndex={questionIndex}
                  onRemove={handleRemoveQuestion}
                  onEdit={handleOpenQuestionModal}
                  onMoveUp={handleMoveQuestionUp}
                  onMoveDown={handleMoveQuestionDown}
                  isFirst={questionIndex === 0}
                  isLast={questionIndex === questionFields.length - 1}
                  isLoading={isLoading}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {tCore('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : (initialData?.id ? tCore('saveChanges') : 'Create')}
          </Button>
        </div>

        {/* Modal Integration */}
        <QuestionEditModal
          isOpen={isQuestionModalOpen}
          onClose={handleCloseQuestionModal}
          onSave={handleSaveQuestionFromModal}
          initialData={currentQuestionDataForModal}
          isLoading={isLoading}
          t={modalT}
          tCore={modalTCore}
        />
      </form>
    </Form>
  );
}

