"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { 
  PlusCircle, 
  X, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Save,
  Languages,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight
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
import { aiTranslationService } from '@/lib/api/catalog/aiTranslationService';
import { QuestionSet } from '@/types/catalog/device-questions';

// Simplified form type to avoid TypeScript depth issues
type FormValues = {
  displayName: string;
  description?: string;
  questions: Array<{
    id: number;
    title: string;
    tooltip?: string;
    category?: string;
    options: Array<{
      id: number;
      title: string;
    }>;
  }>;
};

export type QuestionSetTranslation = {
  language_id: number;
  entity_id?: number;
  displayName: string;
  description?: string;
  questions: Array<{
    id: number;
    title: string;
    tooltip?: string;
    category?: string;
    options: Array<{
      id: number;
      title: string;
    }>;
  }>;
};

// Simple Progress component inline
const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = "" }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}>
    <div
      className="h-full bg-primary transition-all duration-300 ease-in-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

interface QuestionSetTranslationManagerProps {
  questionSet: QuestionSet;
  defaultLanguage: Language;
  availableLanguages: Language[];
  initialTranslations?: QuestionSetTranslation[];
  onSave: (translations: QuestionSetTranslation[]) => void;
}

export function QuestionSetTranslationManager({
  questionSet,
  defaultLanguage,
  availableLanguages,
  initialTranslations = [],
  onSave,
}: QuestionSetTranslationManagerProps) {
  const [translations, setTranslations] = useState<Record<string, QuestionSetTranslation>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [selectedLanguageForAdd, setSelectedLanguageForAdd] = useState<Language | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationLanguage, setAiGenerationLanguage] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  
  const form = useForm<FormValues>({
    defaultValues: {
      displayName: "",
      description: "",
      questions: questionSet.questions.map(q => ({
        id: q.id,
        title: "",
        tooltip: "",
        category: "",
        options: q.options.map(o => ({
          id: o.id,
          title: "",
        })),
      })),
    },
  });

  // Initialize translations
  useEffect(() => {
   
    
    const languages = [defaultLanguage];
    const translationsMap: Record<string, QuestionSetTranslation> = {};
    
    // Always include default language translation if we have the original data
    translationsMap[defaultLanguage.code] = {
      language_id: defaultLanguage.id,
      entity_id: questionSet.id,
      displayName: questionSet.displayName,
      description: questionSet.description || "",
      questions: questionSet.questions.map(q => ({
        id: q.id,
        title: q.title,
        tooltip: "",
        category: "",
        options: q.options.map(o => ({
          id: o.id,
          title: o.title,
        })),
      })),
    };
    
    if (initialTranslations.length > 0) {
     
      
      initialTranslations.forEach((translation) => {
        const language = availableLanguages.find(l => l.id === translation.language_id);
       
       
        
        if (language) {
          // Add language to selected list if not already there
          if (!languages.some(l => l.id === language.id)) {
            languages.push(language);
           
          }
          
          // Store the complete translation, overriding default if it's the same language
          translationsMap[language.code] = {
            language_id: translation.language_id,
            entity_id: translation.entity_id || questionSet.id,
            displayName: translation.displayName || "",
            description: translation.description || "",
            questions: translation.questions || questionSet.questions.map(q => ({
              id: q.id,
              title: "",
              tooltip: "",
              category: "",
              options: q.options.map(o => ({
                id: o.id,
                title: "",
              })),
            })),
          };
         
        } else {
          console.warn('🔧 ❌ Language not found for ID:', translation.language_id, 'Available languages:', availableLanguages.map(l => `${l.id}=${l.name}`));
        }
      });
    }
    
   
   
    
    setSelectedLanguages(languages);
    setTranslations(translationsMap);
    setEditingLanguage(defaultLanguage.code);
  }, [defaultLanguage, initialTranslations, availableLanguages, questionSet]);

  // Load form data when editing language changes
  useEffect(() => {
    if (editingLanguage && Object.keys(translations).length > 0) {
     
      const translation = translations[editingLanguage];
      
      if (translation) {
       
        form.setValue('displayName', translation.displayName || '');
        form.setValue('description', translation.description || '');
        
        // Load questions
        questionSet.questions.forEach((question, qIndex) => {
          const translatedQuestion = translation.questions?.find(q => q.id === question.id);
          form.setValue(`questions.${qIndex}.title`, translatedQuestion?.title || '');
          form.setValue(`questions.${qIndex}.tooltip`, translatedQuestion?.tooltip || '');
          form.setValue(`questions.${qIndex}.category`, translatedQuestion?.category || '');
          
          // Load options
          question.options.forEach((option, oIndex) => {
            const translatedOption = translatedQuestion?.options?.find(o => o.id === option.id);
            form.setValue(`questions.${qIndex}.options.${oIndex}.title`, translatedOption?.title || '');
          });
        });
        
        // Trigger form re-render
        setTimeout(() => {
          form.trigger();
        }, 100);
      } else {
       
        // Reset form for new language
        form.reset({
          displayName: "",
          description: "",
          questions: questionSet.questions.map(q => ({
            id: q.id,
            title: "",
            tooltip: "",
            category: "",
            options: q.options.map(o => ({
              id: o.id,
              title: "",
            })),
          })),
        });
      }
    }
  }, [editingLanguage, translations, questionSet, form]);

  // Toggle question expansion
  const toggleQuestion = (questionId: number) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Generate AI translation for the current editing language
  const generateAITranslation = async () => {
    if (!editingLanguage || editingLanguage === defaultLanguage.code) {
      toast.error("Cannot generate AI translation for the default language");
      return;
    }

    const defaultTranslation = translations[defaultLanguage.code];
    
    // Build source data from default translation or original question set
    const sourceData = {
      title: defaultTranslation?.displayName || questionSet.displayName,
      description: defaultTranslation?.description || questionSet.description || '',
      questions: questionSet.questions.map(q => {
        const defaultQuestionTranslation = defaultTranslation?.questions?.find(qt => qt.id === q.id);
        return {
          id: q.id,
          title: defaultQuestionTranslation?.title || q.title,
          tooltip: defaultQuestionTranslation?.tooltip || '',
          category: defaultQuestionTranslation?.category || '',
          options: q.options.map(o => {
            const defaultOptionTranslation = defaultQuestionTranslation?.options?.find(ot => ot.id === o.id);
            return {
              id: o.id,
              title: defaultOptionTranslation?.title || o.title,
            };
          }),
        };
      }),
    };

    if (!sourceData.title.trim()) {
      toast.error("Please provide a display name in the default language before generating AI translation");
      return;
    }

    setIsGeneratingAI(true);
    setAiGenerationLanguage(editingLanguage);

    try {
     
        entityType: 'question_set',
        sourceLanguage: defaultLanguage.code,
        targetLanguage: editingLanguage,
        questionsCount: sourceData.questions.length
      });

      const translation = await aiTranslationService.generateSingleTranslation(
        'question_set',
        defaultLanguage.code,
        editingLanguage,
        sourceData
      );

     

      if (translation) {
        // Update form with AI-generated translation
        form.setValue('displayName', translation.title);
        form.setValue('description', translation.description || '');
        
        // Check if questions are included in the response
        if (translation.questions && Array.isArray(translation.questions) && translation.questions.length > 0) {
         
          
          // Update questions and options - use index-based matching since AI doesn't return IDs
          translation.questions.forEach((translatedQuestion, translatedIndex) => {
           
            
            // Use the index directly since questions are returned in the same order
            const formQuestionIndex = translatedIndex;
            
            if (formQuestionIndex < questionSet.questions.length) {
             
              
              // Update question fields
              if (translatedQuestion.title) {
                form.setValue(`questions.${formQuestionIndex}.title`, translatedQuestion.title);
              }
              
              if (translatedQuestion.tooltip) {
                form.setValue(`questions.${formQuestionIndex}.tooltip`, translatedQuestion.tooltip);
              }
              
              if (translatedQuestion.category) {
                form.setValue(`questions.${formQuestionIndex}.category`, translatedQuestion.category);
              }
              
              // Update option translations - also use index-based matching
              if (translatedQuestion.options && Array.isArray(translatedQuestion.options) && translatedQuestion.options.length > 0) {
               
                
                translatedQuestion.options.forEach((translatedOption, optionIndex) => {
                 
                  
                  // Use index-based matching for options too
                  if (optionIndex < questionSet.questions[formQuestionIndex].options.length && translatedOption.title) {
                   
                    form.setValue(`questions.${formQuestionIndex}.options.${optionIndex}.title`, translatedOption.title);
                  }
                });
              } else {
               
              }
            } else {
              console.warn(`Question index ${translatedIndex} is out of bounds`);
            }
          });
          
          // Force form re-render by getting and setting values
          const currentValues = form.getValues();
         
          
          // Trigger form re-render
          setTimeout(() => {
            form.trigger();
          }, 100);
          
        } else {
          console.warn('No questions found in AI translation response');
          toast.error("AI translation didn't include question translations. Please try again.");
          return;
        }

        // Save the AI-generated translation
        saveCurrentFormData();
        
        toast.success(`AI translation generated for ${selectedLanguages.find(l => l.code === editingLanguage)?.name}!`);
      } else {
        console.error('AI translation returned null');
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
    
    let totalFields = 2; // displayName (required), description (optional)
    let filledFields = 0;
    
    if (translation.displayName?.trim()) filledFields++;
    if (translation.description?.trim()) filledFields++;
    
    // Count questions and options
    questionSet.questions.forEach(question => {
      totalFields += 3; // title (required), tooltip, category
      const translatedQuestion = translation.questions?.find(q => q.id === question.id);
      if (translatedQuestion?.title?.trim()) filledFields++;
      if (translatedQuestion?.tooltip?.trim()) filledFields++;
      if (translatedQuestion?.category?.trim()) filledFields++;
      
      question.options.forEach(option => {
        totalFields += 1; // title (required)
        const translatedOption = translatedQuestion?.options?.find(o => o.id === option.id);
        if (translatedOption?.title?.trim()) filledFields++;
      });
    });
    
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  };

  // Get status badge for language
  const getLanguageStatus = (languageCode: string) => {
    const translation = translations[languageCode];
    if (!translation || !translation.displayName?.trim()) {
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
    // Form loading is now handled by the useEffect above
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
        entity_id: questionSet.id,
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
      handleEditLanguage(defaultLanguage.code);
    }
    
    setHasUnsavedChanges(true);
    toast.success("Language removed");
  };

  // Handle final save
  const handleSave = () => {
    saveCurrentFormData();
    
    // Filter out incomplete translations (ones without displayName)
    const completeTranslations = Object.values(translations).filter(translation => 
      translation.displayName && translation.displayName.trim().length > 0
    );
    
    if (completeTranslations.length === 0) {
      toast.error("Please fill in at least one complete translation with a display name.");
      return;
    }
    
    onSave(completeTranslations);
    setHasUnsavedChanges(false);
    toast.success(`${completeTranslations.length} translation${completeTranslations.length !== 1 ? 's' : ''} saved successfully!`);
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
                <CardTitle>Question Set Translation Management</CardTitle>
                <CardDescription>
                  Manage translations for &ldquo;{questionSet.displayName}&rdquo; including all questions and options
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
                {/* Question Set Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter display name" {...field} />
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

                {/* Questions Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Questions ({questionSet.questions.length})</h3>
                  {questionSet.questions.map((question, qIndex) => (
                    <Card key={question.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <Collapsible
                          open={expandedQuestions[question.id]}
                          onOpenChange={() => toggleQuestion(question.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                              <div className="flex items-center space-x-2">
                                {expandedQuestions[question.id] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="font-medium">
                                  Question {qIndex + 1}: {question.title}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {question.options.length} options
                                </Badge>
                              </div>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`questions.${qIndex}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Question Title *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter question title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`questions.${qIndex}.tooltip`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Tooltip</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Enter tooltip" 
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
                                name={`questions.${qIndex}.category`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Enter category" 
                                        {...field}
                                        value={field.value || ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Options */}
                            {question.options.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium">Options ({question.options.length})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {question.options.map((option, oIndex) => (
                                    <FormField
                                      key={option.id}
                                      control={form.control}
                                      name={`questions.${qIndex}.options.${oIndex}.title`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm">
                                            Option {oIndex + 1}: {option.title}
                                          </FormLabel>
                                          <FormControl>
                                            <Input placeholder="Enter option title" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
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
              {(() => {
                const completeCount = Object.values(translations).filter(t => 
                  t.displayName && t.displayName.trim().length > 0
                ).length;
                return (
                  <span className="ml-2">
                    • {completeCount} ready to save
                  </span>
                );
              })()}
              {hasUnsavedChanges && (
                <span className="text-orange-600 ml-2">• Unsaved changes</span>
              )}
            </div>
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Complete Translations</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 