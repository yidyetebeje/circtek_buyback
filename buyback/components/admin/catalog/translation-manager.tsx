"use client";

import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Zap
} from "lucide-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector, Language } from '@/components/admin/language-selector';
import { toast } from 'sonner';
import { aiTranslationService, TranslatableEntity } from '@/lib/api/catalog/aiTranslationService';

// Default languages for testing (would normally come from API)
export const demoLanguages: Language[] = [
  { id: 1, code: 'en', name: 'English', is_default: true },
  { id: 2, code: 'fr', name: 'French' },
  { id: 3, code: 'es', name: 'Spanish' },
  { id: 4, code: 'de', name: 'German' },
  { id: 5, code: 'nl', name: 'Dutch' },
];

// Simplified translation form schema with common fields
const baseTranslationSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
});

// For entities with specifications - now as key-value pairs
const withSpecificationsSchema = baseTranslationSchema.extend({
  specifications: z.string().optional(), // JSON string for now, can be improved to key-value editor
});

export type BaseTranslation = z.infer<typeof baseTranslationSchema> & {
  language_id: number;
  entity_id?: number;
}

export type TranslationWithSpecs = z.infer<typeof withSpecificationsSchema> & {
  language_id: number;
  entity_id?: number;
}

interface TranslationManagerProps {
  entityType: TranslatableEntity;
  entityId?: number;
  defaultLanguage: Language;
  availableLanguages: Language[];
  initialTranslations?: BaseTranslation[] | TranslationWithSpecs[];
  onSave: (translations: BaseTranslation[] | TranslationWithSpecs[]) => void;
  hasSpecifications?: boolean;
  fieldConfig: Record<string, { label: string; type: 'text' | 'textarea' }>;
  aiTranslator?: (sourceLanguageCode: string, targetLanguageCode: string, data: any) => Promise<any | null>;
}

// Simple Progress component inline
const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = "" }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}>
    <div
      className="h-full bg-primary transition-all duration-300 ease-in-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export function TranslationManager({
  entityType,
  entityId,
  defaultLanguage,
  availableLanguages,
  initialTranslations = [],
  onSave,
  hasSpecifications = false,
  fieldConfig,
  aiTranslator,
}: TranslationManagerProps) {
  const [translations, setTranslations] = useState<Record<string, BaseTranslation | TranslationWithSpecs>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [selectedLanguageForAdd, setSelectedLanguageForAdd] = useState<Language | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationLanguage, setAiGenerationLanguage] = useState<string | null>(null);
  
  // Form schema and setup
  const formSchema = hasSpecifications ? withSpecificationsSchema : baseTranslationSchema;
  type FormValues = z.infer<typeof formSchema>;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: hasSpecifications 
      ? {
          title: "",
          description: "",
          meta_title: "",
          meta_description: "",
          meta_keywords: "",
          specifications: "",
        } as FormValues
      : {
          title: "",
          description: "",
          meta_title: "",
          meta_description: "",
          meta_keywords: "",
        } as FormValues,
  });

  // Initialize translations
  useEffect(() => {
    const languages = [defaultLanguage];
    const translationsMap: Record<string, BaseTranslation | TranslationWithSpecs> = {};
    
    if (initialTranslations.length > 0) {
      initialTranslations.forEach((translation) => {
        const language = availableLanguages.find(l => l.id === translation.language_id);
        
        if (language) {
          if (!languages.some(l => l.id === language.id)) {
            languages.push(language);
          }
          translationsMap[language.code] = translation;
        }
      });
    }
    
    setSelectedLanguages(languages);
    setTranslations(translationsMap);
  }, [defaultLanguage, initialTranslations, availableLanguages]);

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
      title: defaultTranslation?.title || currentValues.title || '',
      description: defaultTranslation?.description || currentValues.description || '',
      meta_title: defaultTranslation?.meta_title || currentValues.meta_title || '',
      meta_description: defaultTranslation?.meta_description || currentValues.meta_description || '',
      meta_keywords: defaultTranslation?.meta_keywords || currentValues.meta_keywords || '',
      specifications: hasSpecifications && defaultTranslation ? 
        ('specifications' in defaultTranslation ? (defaultTranslation.specifications as string) || '' : '') :
        (hasSpecifications && currentValues ? ('specifications' in currentValues ? (currentValues.specifications as string) || '' : '') : '')
    };

    if (!sourceData.title.trim()) {
      toast.error("Please provide a title in the default language before generating AI translation");
      return;
    }

    setIsGeneratingAI(true);
    setAiGenerationLanguage(editingLanguage);

    try {
      const translation = await aiTranslationService.generateTranslationForManager(
        entityType,
        defaultLanguage.code,
        editingLanguage,
        sourceData
      );

      if (translation) {
        // Update form with AI-generated translation
        Object.keys(translation).forEach(key => {
          if (translation[key as keyof typeof translation] !== undefined) {
            form.setValue(key as keyof FormValues, translation[key as keyof typeof translation] as FormValues[keyof FormValues]);
          }
        });

        // Save the AI-generated translation
        saveCurrentFormData();
        
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
    
    const requiredFields = ['title'];
    const optionalFields = ['description', 'meta_title', 'meta_description', 'meta_keywords'];
    if (hasSpecifications) optionalFields.push('specifications');
    
    const filledRequired = requiredFields.filter(field => 
      translation[field as keyof typeof translation] && 
      String(translation[field as keyof typeof translation]).trim()
    ).length;
    
    const filledOptional = optionalFields.filter(field => 
      translation[field as keyof typeof translation] && 
      String(translation[field as keyof typeof translation]).trim()
    ).length;
    
    const totalFields = requiredFields.length + optionalFields.length;
    const filledFields = filledRequired + filledOptional;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  // Get status badge for language
  const getLanguageStatus = (languageCode: string) => {
    const translation = translations[languageCode];
    if (!translation || !translation.title?.trim()) {
      return { status: 'empty', color: 'destructive', icon: AlertCircle };
    }
    
    const completion = getCompletionPercentage(languageCode);
    if (completion === 100) {
      return { status: 'complete', color: 'success', icon: CheckCircle2 };
    }
    
    return { status: 'partial', color: 'warning', icon: AlertCircle };
  };

  // Handle editing a specific language
  const handleEditLanguage = (languageCode: string) => {
    // Save current form if editing another language
    if (editingLanguage && editingLanguage !== languageCode) {
      saveCurrentFormData();
    }
    
    setEditingLanguage(languageCode);
    
    // Load translation data into form
    const translation = translations[languageCode] || {};
    Object.keys(formSchema.shape).forEach(key => {
      const value = translation[key as keyof typeof translation] || "";
      form.setValue(key as keyof FormValues, value as FormValues[keyof FormValues]);
    });
  };

  // Save current form data
  const saveCurrentFormData = () => {
    if (!editingLanguage) return;
    
    const currentLanguage = selectedLanguages.find(l => l.code === editingLanguage);
    if (!currentLanguage) return;
    
    const values = form.getValues();
    setTranslations(prev => ({
      ...prev,
      [editingLanguage]: {
        ...values,
        language_id: currentLanguage.id,
        entity_id: entityId,
      }
    }));
    
    setHasUnsavedChanges(true);
  };

  // Add new language
  const handleAddLanguage = () => {
    if (!selectedLanguageForAdd) return;
    
    saveCurrentFormData();
    setSelectedLanguages(prev => [...prev, selectedLanguageForAdd]);
    setEditingLanguage(selectedLanguageForAdd.code);
    form.reset();
    setSelectedLanguageForAdd(null);
    toast.success(`${selectedLanguageForAdd.name} language added`);
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
      Object.keys(formSchema.shape).forEach(key => {
        const value = defaultTranslation[key as keyof typeof defaultTranslation] || "";
        form.setValue(key as keyof FormValues, value as FormValues[keyof FormValues]);
      });
    }
    
    setHasUnsavedChanges(true);
    toast.success("Language removed");
  };

  // Handle final save
  const handleSave = () => {
    // Create a temporary, up-to-date representation of all translations
    const currentTranslations = { ...translations };
    if (editingLanguage) {
      const currentLanguage = selectedLanguages.find(l => l.code === editingLanguage);
      if (currentLanguage) {
        const formValues = form.getValues();
        currentTranslations[editingLanguage] = {
          ...currentTranslations[editingLanguage], // Keep existing fields if any
          ...formValues,
          language_id: currentLanguage.id,
          entity_id: entityId,
        };
      }
    }

    const translationsArray = Object.values(currentTranslations);

    // Validate: find all languages that are missing a title
    const invalidLanguages = selectedLanguages
      .filter(lang => {
        const translation = currentTranslations[lang.code];
        // A language is invalid if it has no translation entry or the title is empty.
        return !translation || !translation.title?.trim();
      })
      .map(lang => lang.name);

    if (invalidLanguages.length > 0) {
      toast.error(`Title is required for all selected languages. Missing for: ${invalidLanguages.join(', ')}.`);

      // For better UX, find the first invalid language and switch to it
      const firstInvalidLang = selectedLanguages.find(lang => {
        const translation = currentTranslations[lang.code];
        return !translation || !translation.title?.trim();
      });

      if (firstInvalidLang && firstInvalidLang.code !== editingLanguage) {
        handleEditLanguage(firstInvalidLang.code);
      }
      return;
    }

    // If validation passes, update the main state and call the onSave prop
    setTranslations(currentTranslations);
    onSave(translationsArray);
    setHasUnsavedChanges(false);
    toast.success("All translations saved successfully!");
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
                <CardTitle>Translation Management</CardTitle>
                <CardDescription>
                  Manage translations for this {entityType.replace('_', ' ')} across multiple languages
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
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    editingLanguage === language.code ? 'ring-2 ring-primary bg-primary/5' : ''
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
                      <StatusIcon className={`h-4 w-4 ${
                        status === 'complete' ? 'text-green-500' :
                        status === 'partial' ? 'text-yellow-500' : 'text-gray-400'
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
            <div className="flex items-center space-x-2 pt-4 border-t">
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
              <form className="space-y-6" onChange={saveCurrentFormData}>
                {/* Basic Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Title *</span>
                          {editingLanguage !== defaultLanguage.code && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={generateAITranslation}
                              disabled={isGeneratingAI}
                              className="h-6 px-2 text-xs"
                            >
                              {isGeneratingAI && aiGenerationLanguage === editingLanguage ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Zap className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter description"
                            className="resize-none h-20"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Specifications for models */}
                {hasSpecifications && (
                  <FormField
                    control={form.control}
                    name={"specifications" as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specifications</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"storage": "128GB", "color": "Black", "screen_size": "6.1 inches"}'
                            className="resize-none h-24 font-mono text-sm"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter specifications in JSON format for structured data
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* SEO Fields - Collapsible */}
                <Collapsible open={isSeoOpen} onOpenChange={setIsSeoOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" type="button">
                      <span className="flex items-center">
                        SEO Settings
                        <Badge variant="secondary" className="ml-2">Optional</Badge>
                      </span>
                      {isSeoOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="meta_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="SEO optimized title" 
                                {...field}
                                value={field.value || ""} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="meta_keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Keywords</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="keyword1, keyword2, keyword3" 
                                {...field}
                                value={field.value || ""} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="meta_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="SEO optimized description (150-160 characters recommended)"
                              className="resize-none h-20"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
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
