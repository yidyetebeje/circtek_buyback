"use client";

import React, { useState, useEffect, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  PlusCircle,
  X,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Languages,
  Sparkles,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector, Language } from '@/components/admin/language-selector';
import { toast } from 'sonner';
import { aiTranslationService } from '@/lib/api/catalog/aiTranslationService';

// FAQ-specific translation schema
const faqTranslationSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

export type FAQTranslation = z.infer<typeof faqTranslationSchema> & {
  language_id: number;
  entity_id?: number;
}

interface FAQTranslationManagerProps {
  faqId?: number;
  defaultLanguage: Language;
  availableLanguages: Language[];
  initialTranslations?: FAQTranslation[];
  onSave: (translations: FAQTranslation[]) => void;
  defaultFAQData?: { question: string; answer: string };
}

// Simple Progress component inline
const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = "" }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
    <div
      className="h-full bg-primary transition-all duration-300 ease-in-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export function FAQTranslationManager({
  faqId,
  defaultLanguage,
  availableLanguages,
  initialTranslations = [],
  onSave,
  defaultFAQData,
}: FAQTranslationManagerProps) {
  const [translations, setTranslations] = useState<Record<string, FAQTranslation>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [selectedLanguageForAdd, setSelectedLanguageForAdd] = useState<Language | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationLanguage, setAiGenerationLanguage] = useState<string | null>(null);

  const initialLoadDone = useRef(false);
  const prevFaqIdRef = useRef(faqId);

  // Form setup
  const form = useForm<z.infer<typeof faqTranslationSchema>>({
    resolver: zodResolver(faqTranslationSchema),
    defaultValues: {
      question: "",
      answer: "",
    },
  });

  // Initialize and manage translations state
  useEffect(() => {
    const isNewFaq = prevFaqIdRef.current !== faqId;

    // Always build/update the translations map from initialTranslations and defaultFAQData
    const newTranslationsMap: Record<string, FAQTranslation> = {};
    initialTranslations.forEach((translation) => {
      const language = availableLanguages.find(l => l.id === translation.language_id);
      if (language) {
        newTranslationsMap[language.code] = {
          ...translation,
          question: translation.question || "", // Ensure non-null
          answer: translation.answer || "",   // Ensure non-null
        };
      }
    });

    if (defaultLanguage && defaultLanguage.code.toLowerCase() === 'en' && defaultFAQData) {
      const englishTranslation = newTranslationsMap[defaultLanguage.code];
      if (!englishTranslation || !englishTranslation.question || !englishTranslation.answer) {
        newTranslationsMap[defaultLanguage.code] = {
          language_id: defaultLanguage.id,
          entity_id: faqId,
          question: defaultFAQData.question,
          answer: defaultFAQData.answer,
        };
      }
    }
    setTranslations(newTranslationsMap);

    // Conditional logic for selectedLanguages, editingLanguage, and form reset
    if (!initialLoadDone.current || isNewFaq) {
      const newSelectedL: Language[] = [];
      if (defaultLanguage) {
        newSelectedL.push(defaultLanguage);
      }
      initialTranslations.forEach((translation) => {
        const language = availableLanguages.find(l => l.id === translation.language_id);
        if (language && !newSelectedL.some(l => l.id === language.id)) {
          newSelectedL.push(language);
        }
      });
      setSelectedLanguages(newSelectedL);

      const initialEditingLangCode = defaultLanguage ? defaultLanguage.code : (newSelectedL.length > 0 ? newSelectedL[0].code : null);
      if (initialEditingLangCode) {
        setEditingLanguage(initialEditingLangCode);
        const initialDataForForm = newTranslationsMap[initialEditingLangCode] ||
          (initialEditingLangCode === defaultLanguage?.code && defaultFAQData
            ? { question: defaultFAQData.question, answer: defaultFAQData.answer }
            : { question: "", answer: "" });
        form.reset({
          question: initialDataForForm.question,
          answer: initialDataForForm.answer
        });
      } else {
        form.reset({ question: "", answer: "" });
      }

      if (isNewFaq) {
        prevFaqIdRef.current = faqId;
      }
      initialLoadDone.current = true;
    } else {
      // This is an update to initialTranslations for an already loaded FAQ (e.g., after save)
      // Ensure selectedLanguages includes everything from initialTranslations
      // *without removing* languages that the user added and might not be in initialTranslations yet.
      setSelectedLanguages(currentSelectedLangs => {
        const combinedLangs = [...currentSelectedLangs];
        const langsFromCurrentInitial: Language[] = [];

        if (defaultLanguage) {
          langsFromCurrentInitial.push(defaultLanguage);
        }
        initialTranslations.forEach(t => {
          const lang = availableLanguages.find(l => l.id === t.language_id);
          if (lang && !langsFromCurrentInitial.some(existL => existL.id === lang.id)) {
            langsFromCurrentInitial.push(lang);
          }
        });

        langsFromCurrentInitial.forEach(langFromInitial => {
          if (!combinedLangs.some(l => l.id === langFromInitial.id)) {
            combinedLangs.push(langFromInitial);
          }
        });
        return combinedLangs;
      });
      // Do not reset editingLanguage or form here, user might be editing.
      // The updated `translations` map (set above) will provide correct data if they switch tabs.
    }
  }, [defaultLanguage, initialTranslations, availableLanguages, faqId, defaultFAQData, form.reset]);

  // Generate AI translation for the current editing language
  const generateAITranslation = async () => {
    if (!editingLanguage || editingLanguage === defaultLanguage.code) {
      toast.error("Cannot generate AI translation for the default language");
      return;
    }

    // Get current form values as the source data
    const currentValues = form.getValues();
    const defaultTranslation = translations[defaultLanguage.code];

    // Use default language translation or current form values as source
    const sourceData = {
      title: defaultTranslation?.question || currentValues.question || '',
      description: defaultTranslation?.answer || currentValues.answer || '',
    };

    if (!sourceData.title.trim()) {
      toast.error("Please provide a question in the default language before generating AI translation");
      return;
    }

    setIsGeneratingAI(true);
    setAiGenerationLanguage(editingLanguage);

    try {
      const translation = await aiTranslationService.generateSingleTranslation(
        'faq',
        defaultLanguage.code,
        editingLanguage,
        sourceData
      );

      if (translation) {
        // Update form with AI-generated translation
        form.setValue('question', translation.title || '');
        form.setValue('answer', translation.description || '');

        // Save the AI-generated translation
        saveCurrentFormData(editingLanguage);

        toast.success(`AI translation generated for ${selectedLanguages.find(l => l.code === editingLanguage)?.name}!`);
      } else {
        toast.error("Failed to generate AI translation. Please try again.");
      }
    } catch (error) {
      console.error('AI Translation error:', error);
      toast.error("Error generating AI translation. Please check your connection and try again.");
    } finally {
      setIsGeneratingAI(false);
      setAiGenerationLanguage(null);
    }
  };

  // Calculate completion percentage for each language
  const getCompletionPercentage = (languageCode: string) => {
    const translation = translations[languageCode];
    if (!translation) return 0;

    const fields = ['question', 'answer'];
    const filledFields = fields.filter(field =>
      translation[field as keyof typeof translation] &&
      String(translation[field as keyof typeof translation]).trim()
    ).length;

    return Math.round((filledFields / fields.length) * 100);
  };

  // Get status badge for language
  const getLanguageStatus = (languageCode: string) => {
    const translation = translations[languageCode];
    if (!translation || !translation.question?.trim() || !translation.answer?.trim()) {
      return { status: 'empty', color: 'destructive', icon: AlertCircle };
    }

    return { status: 'complete', color: 'success', icon: CheckCircle2 };
  };

  // Handle editing a specific language
  const handleEditLanguage = (languageCode: string) => {
    // Save current form data before switching
    if (editingLanguage) {
      saveCurrentFormData(editingLanguage); // Pass current editing language
    }

    setEditingLanguage(languageCode);

    let dataForForm = translations[languageCode];

    // If switching to English and its translation is missing/incomplete, use defaultFAQData
    if (languageCode === defaultLanguage?.code && defaultFAQData) {
      if (!dataForForm || !dataForForm.question || !dataForForm.answer) {
        dataForForm = {
          question: defaultFAQData.question,
          answer: defaultFAQData.answer,
          language_id: defaultLanguage.id, // This is fine for the translations state
          entity_id: faqId,
        };
      }
    }

    form.reset(dataForForm ? { question: dataForForm.question, answer: dataForForm.answer } : { question: '', answer: '' });
  };

  // Save current form data
  const saveCurrentFormData = (languageCodeToSave?: string) => { // Accept optional language code
    const langCode = languageCodeToSave || editingLanguage; // Use passed code or current editing one
    if (!langCode) return;

    const currentLanguage = selectedLanguages.find(l => l.code === langCode);
    if (!currentLanguage) return;

    const values = form.getValues();
    // Only update if there are actual values to prevent overwriting with empty on tab switch
    if (values.question.trim() || values.answer.trim()) {
      setTranslations(prev => ({
        ...prev,
        [langCode]: {
          ...prev[langCode], // Preserve existing fields like entity_id if any
          ...values,
          language_id: currentLanguage.id,
          entity_id: faqId || prev[langCode]?.entity_id, // Ensure entity_id is preserved or set
        }
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Add new language
  const handleAddLanguage = () => {
    if (!selectedLanguageForAdd) return;

    if (editingLanguage) { // Save current form data before adding
      saveCurrentFormData(editingLanguage);
    }

    const newLangCode = selectedLanguageForAdd.code;
    setSelectedLanguages(prev => [...prev, selectedLanguageForAdd]);
    setEditingLanguage(newLangCode); // Switch to new language

    // If adding English and defaultFAQData exists, use it, otherwise empty form
    if (newLangCode === defaultLanguage?.code && defaultFAQData) {
      form.reset({
        question: defaultFAQData.question,
        answer: defaultFAQData.answer,
      });
    } else {
      form.reset({ question: "", answer: "" }); // Reset form for the new language
    }

    setSelectedLanguageForAdd(null);
    toast.success(`${selectedLanguageForAdd.name} language added`);
    setHasUnsavedChanges(true); // Adding a language is an unsaved change
  };

  // Remove language
  const handleRemoveLanguage = (code: string) => {
    if (code === defaultLanguage.code) {
      toast.error("Cannot remove default language");
      return;
    }

    setSelectedLanguages(prev => prev.filter(l => l.code !== code));
    setTranslations(prev => {
      const updated = { ...prev };
      delete updated[code];
      return updated;
    });

    if (editingLanguage === code) {
      setEditingLanguage(defaultLanguage.code);
      const defaultTranslation = translations[defaultLanguage.code] || {};
      form.setValue('question', defaultTranslation.question || '');
      form.setValue('answer', defaultTranslation.answer || '');
    }

    setHasUnsavedChanges(true);
    toast.success("Language removed");
  };

  // Handle final save
  const handleSave = () => {
    if (editingLanguage) { // Save any pending changes in the current form
      saveCurrentFormData(editingLanguage);
    }

    // Now, use a timeout to allow the state update from saveCurrentFormData to complete
    // before filtering and calling onSave.
    setTimeout(() => {
      const translationsArray = Object.values(translations).filter(t =>
        t && typeof t.question === 'string' && t.question.trim() &&
        typeof t.answer === 'string' && t.answer.trim() &&
        t.language_id // Ensure language_id is present
      );

      if (translationsArray.length === 0 && selectedLanguages.length > 0) {
        toast.error("Please provide at least one complete translation with both question and answer.");
        return;
      }

      onSave(translationsArray);
      setHasUnsavedChanges(false);
      // No toast here, parent (FAQForm) will show global save status
    }, 0);
  };

  // Get unselected languages
  const unselectedLanguages = availableLanguages.filter(
    language => !selectedLanguages.some(l => l.id === language.id)
  );

  // Calculate overall progress
  const overallProgress = selectedLanguages.length > 0
    ? Math.round(selectedLanguages.reduce((sum, lang) => sum + getCompletionPercentage(lang.code), 0) / selectedLanguages.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>FAQ Translation Management</CardTitle>
                <CardDescription>
                  Manage translations for this FAQ across multiple languages
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
          </div>
          <Progress value={overallProgress} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Languages className="mr-2 h-5 w-5" />
            Languages ({selectedLanguages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active languages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedLanguages.map(language => {
              const { status, icon: StatusIcon } = getLanguageStatus(language.code);
              const completion = getCompletionPercentage(language.code);

              return (
                <div
                  key={language.code}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${editingLanguage === language.code ? 'ring-2 ring-primary bg-primary/5 border-primary' : 'bg-card border-border'
                    }`}
                  onClick={() => handleEditLanguage(language.code)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm uppercase">{language.code}</span>
                      <span className="text-sm">{language.name}</span>
                      {language.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>

                    {!language.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLanguage(language.code);
                        }}
                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <StatusIcon className={`h-4 w-4 ${status === 'complete' ? 'text-green-500' : 'text-muted-foreground'
                        }`} />
                      <span className="text-xs text-muted-foreground">
                        {completion}% complete
                      </span>
                    </div>
                    {editingLanguage === language.code && (
                      <Badge variant="outline" className="text-xs">Editing</Badge>
                    )}
                  </div>

                  <Progress value={completion} className="mt-2 h-1" />
                </div>
              );
            })}
          </div>

          {/* Add language */}
          {unselectedLanguages.length > 0 && (
            <div className="flex items-center space-x-2 pt-4 border-t border-border">
              <LanguageSelector
                languages={unselectedLanguages}
                selectedLanguage={selectedLanguageForAdd}
                onLanguageChange={setSelectedLanguageForAdd}
              />
              <Button
                onClick={handleAddLanguage}
                disabled={!selectedLanguageForAdd}
                size="sm"
              >
                <PlusCircle className="mr-1 h-4 w-4" />
                Add Language
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Translation Form */}
      {editingLanguage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Edit Translation: {selectedLanguages.find(l => l.code === editingLanguage)?.name}
              </span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="uppercase">
                  {editingLanguage}
                </Badge>
                {editingLanguage !== defaultLanguage.code && (
                  <Button
                    onClick={generateAITranslation}
                    disabled={isGeneratingAI}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    {isGeneratingAI && aiGenerationLanguage === editingLanguage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate with AI</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardTitle>
            {editingLanguage !== defaultLanguage.code && (
              <p className="text-sm text-muted-foreground">
                Use AI to automatically translate from {defaultLanguage.name} to {selectedLanguages.find(l => l.code === editingLanguage)?.name}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the question" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the answer"
                          className="resize-none h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Save Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} configured
              {hasUnsavedChanges && (
                <span className="text-orange-600 ml-2">• Unsaved changes</span>
              )}
            </div>
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save All Translations</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 