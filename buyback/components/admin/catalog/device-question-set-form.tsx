"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from 'next-intl';
import { Plus, Settings, X, ChevronUp, ChevronDown } from "lucide-react";

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
  inputType: z.string().min(1, { message: "Input type is required." }), 
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

// Define the Zod schema for the form validation
const questionSetFormSchema = z.object({
  internalName: z.string().trim().min(1, { message: "Internal name is required." })
    .regex(/^[a-z0-9_]+$/, { message: "Internal name can only contain lowercase letters, numbers, and underscores."}),
  displayName: z.string().trim().min(1, { message: "Display name is required." }).max(255, { message: "Display name must be 255 characters or less." }),
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
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
            {questionIndex + 1}
          </div>
        <div className="flex-grow">
          <h3 className="text-sm font-medium text-gray-800 truncate max-w-xs md:max-w-sm">
            {question.title || t('newQuestion', { default: "New Question" })}
          </h3>
          <p className="text-xs text-gray-500">
            {question.inputType ? question.inputType.replace(/_/g, ' ') : t('noInputTypeSelected', { default: 'No input type' })}
            {question.isRequired && <span className="ml-1.5 text-primary/70 text-[11px]">({t('requiredIndicator', { default: 'Required'})})</span>}
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
      inputType: "",
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
        inputType: "",
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">
            {initialData?.id || initialData?.title ? t('editQuestionTitle', { default: "Edit Question"}) : t('addNewQuestionTitle', { default: "Add New Question"})}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </Button>
      </div>

        <Form {...modalForm}>
          <form onSubmit={modalForm.handleSubmit(handleModalSubmit)} className="space-y-6 overflow-y-auto flex-grow pr-2">
          <FormField
              control={modalForm.control}
              name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-gray-700">{t('questionTitleLabel', { default: "Title" })}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={t('questionTitlePlaceholder', { default: "e.g., What is the device's screen condition?" })} 
                    {...field} 
                    disabled={isLoading} 
                    className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={modalForm.control}
                name="inputType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700">{t('questionInputTypeLabel', { default: "Input Type" })}</FormLabel>
                  <FormControl>
                    <select
                      className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                        {...field}
                    >
                        <option value="" disabled>{t('selectInputTypePlaceholder', { default: "Select input type"})}</option>
                      {INPUT_TYPES.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={modalForm.control}
                name="isRequired"
              render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 h-full bg-white shadow-sm justify-center">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange} 
                      disabled={isLoading} 
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </FormControl>
                  <FormLabel className="font-medium text-sm text-gray-700 !mt-0">
                    {t('questionIsRequiredLabel', { default: "Is Required?" })}
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
          
            {/* Options Section - Placeholder for now */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-semibold text-gray-700">{t('optionsForQuestion', { default: "Options" })}</h4>
                <Button
                  type="button"
                    variant="outline"
                  size="sm"
                    onClick={() => appendOption({ id: undefined, title: '', priceModifier: null, isDefault: false, orderNo: optionFields.length } as IndividualOptionFormValues)}
                  disabled={isLoading}
                    className="text-primary border-primary hover:bg-primary/5"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('addOption', { default: "Add Option"})}
                </Button>
              </div>
                {optionFields.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('noOptionsYetModal', {default: "No options configured for this question."})}</p>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {optionFields.map((optionField, optionIndex) => (
                      <div 
                        key={optionField.id} 
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50/30 space-y-3"
                      >
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-gray-600">
                          {t('optionLabel', { default: "Option"})} {optionIndex + 1}
                        </p>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeOption(optionIndex)} 
                            disabled={isLoading} 
                          className="text-red-500 hover:bg-red-100 h-7 w-7"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                          <FormField
                        control={modalForm.control}
                        name={`options.${optionIndex}.title`}
                            render={({ field }) => (
                              <FormItem>
                            <FormLabel className="text-xs font-medium text-gray-700">{t('optionTitleLabel', { default: "Title" })}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={t('optionTitlePlaceholder', { default: "e.g., Pristine" })} 
                                    {...field} 
                                    disabled={isLoading} 
                                className="text-sm h-9 border-gray-300 focus:border-primary focus:ring-primary/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormField
                          control={modalForm.control}
                          name={`options.${optionIndex}.priceModifier`}
                            render={({ field }) => (
                              <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700">{t('optionPriceModifierLabel', { default: "Price Modifier (€)" })}</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder={t('optionPriceModifierPlaceholder', { default: "-10.50" })} 
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
                                  className="text-sm h-9 border-gray-300 focus:border-primary focus:ring-primary/20"
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
                              <FormLabel className="text-xs font-medium text-gray-700">{t('optionOrderNoLabel', { default: "Order No." })}</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder={t('optionOrderNoPlaceholder', { default: "0" })} 
                                    {...field} 
                                    onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)} 
                                    value={field.value ?? 0} 
                                    disabled={isLoading} 
                                  className="text-sm h-9 border-gray-300 focus:border-primary focus:ring-primary/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                          control={modalForm.control}
                          name={`options.${optionIndex}.isDefault`}
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-gray-200 p-2.5 h-full justify-center bg-white shadow-sm">
                                <FormControl>
                                  <Checkbox 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange} 
                                    disabled={isLoading}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                                  />
                                </FormControl>
                                <FormLabel className="font-medium text-xs text-gray-700 !mt-0">
                                  {t('optionIsDefaultLabel', { default: "Is Default?" })}
                                </FormLabel>
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
        
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="bg-white">
            {tCore('cancel')}
          </Button>
          <Button
            type="button" // Should be type="submit" for the form, but onClick is on form
            onClick={() => modalForm.handleSubmit(handleModalSubmit)()}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-white min-w-[100px]"
          >
            {isLoading ? tCore('saving') : (initialData?.id || initialData?.title ? tCore('saveChanges') : tCore('create'))}
          </Button>
        </div>
      </div>
    </div>
  );
};
// --- END QuestionEditModal ---

interface QuestionSetFormProps {
  initialData?: Partial<Omit<QuestionSetFormValues, 'questions'>> & { id?: string; questions?: IndividualQuestion[] }; 
  onSubmit: (values: QuestionSetFormValues & {id?: string}) => void; 
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
    internalName: initialData?.internalName || "",
    displayName: initialData?.displayName || "",
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

    const submissionData: QuestionSetFormValues & {id?: string} = { 
        ...values,
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
      <form onSubmit={handleSubmit(processSubmit)} className="space-y-8 max-w-5xl mx-auto">
        <div className="p-6 border border-gray-200 rounded-xl shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">1</span>
            {tAdminCatalog('questionSetDetails')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
              name="internalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700">{tAdminCatalog('internalNameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tAdminCatalog('internalNamePlaceholder')} 
                      {...field}
                      disabled={isLoading || !!initialData?.id} 
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    {tAdminCatalog('internalNameDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700">{tAdminCatalog('displayNameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tAdminCatalog('displayNamePlaceholder')} 
                      {...field}
                      disabled={isLoading}
                      className="border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    {tAdminCatalog('displayNameDescriptionQs')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6">
            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700">{tAdminCatalog('descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={tAdminCatalog('descriptionPlaceholderQs')}
                      {...field}
                      value={field.value ?? ""}
                      disabled={isLoading}
                      className="min-h-[100px] border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                      rows={3}
                    />
                  </FormControl>
                   <FormDescription className="text-xs text-gray-500">
                    {tAdminCatalog('descriptionDescriptionQs')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Questions Section */}
        <div className="p-6 border border-gray-200 rounded-xl shadow-sm bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">2</span>
              {tAdminCatalog('questionsSectionTitle', { default: "Questions" })}
            </h2>
            <Button
              type="button"
              variant="default"
              onClick={handleAddNewQuestion}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              {tAdminCatalog('addQuestion', { default: "Add Question" })}
            </Button>
          </div>

          {questionFields.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">{tAdminCatalog('noQuestionsYetTitle', {default: "No questions yet"})}</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">{tAdminCatalog('noQuestionsYet', {default: "Add questions to create your device assessment set."})}</p>
              <Button
                type="button"
                variant="default"
                onClick={handleAddNewQuestion}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                {tAdminCatalog('addFirstQuestion', { default: "Add Your First Question" })}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
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

        <div className="flex justify-end space-x-3 py-6 px-6 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="bg-white">
            {tCore('cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
          >
            {isLoading ? tCore('saving') : (initialData?.id ? tCore('saveChanges') : tCore('create'))}
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
