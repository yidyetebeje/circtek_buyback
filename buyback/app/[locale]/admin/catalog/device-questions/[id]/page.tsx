"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Globe, PenSquare } from 'lucide-react';

import { DeviceQuestionSetForm, QuestionSetSubmitValues } from '@/components/admin/catalog/device-question-set-form';
import { useDeviceQuestionSet, useUpdateDeviceQuestionSet, useDeviceQuestionSetTranslations } from '@/hooks/catalog/useDeviceQuestionSets';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionSetTranslationManager, QuestionSetTranslation } from '@/components/admin/catalog/question-set-translation-manager';
import { UpdateQuestionSetPayload, QuestionForUpdatePayload } from '@/lib/api/catalog/deviceQuestionSetService';
import { QuestionInputType } from '@/types/catalog/device-questions';
import { Language } from '@/types/catalog';
import { languageService } from '@/lib/api/catalog/languageService';
import { deviceQuestionSetService } from '@/lib/api/catalog/deviceQuestionSetService';

// Type for the comprehensive translation response from the API
interface ComprehensiveTranslationResponse {
  languageId: number;
  questionSetId: number;
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
}

export default function EditDeviceQuestionSetPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('AdminCatalog');
  const tCore = useTranslations('Core');

  const idParam = typeof params.id === 'string' ? params.id : undefined;
  const questionSetId = idParam ? parseInt(idParam, 10) : undefined;
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);

  const {
    data: apiResponse,
    isLoading: isLoadingSet,
    isError,
    error
  } = useDeviceQuestionSet(questionSetId);

  // Fetch question set translations
  const {
    data: translationsData,
    isLoading: isLoadingTranslations,
    refetch: refetchTranslations
  } = useDeviceQuestionSetTranslations(questionSetId);

  const { mutate: updateQuestionSet, isPending: isUpdating } = useUpdateDeviceQuestionSet(questionSetId);

  const questionSetData = apiResponse?.data;

  // Fetch languages on component mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoadingLanguages(true);
        console.log('🔍 Starting to fetch languages...');
        const response = await languageService.getLanguages(1, 100); // Get all languages
        console.log('🔍 Languages API response:', response);
        if (response.data) {
          const languageData = response.data;
          console.log('🔍 Language data extracted:', languageData);
          setLanguages(languageData);
          const defaultLang = languageData.find((lang: Language) => Boolean(lang.is_default));
          console.log('🔍 Default language found:', defaultLang);
          if (defaultLang) {
            setDefaultLanguage(defaultLang);
          } else if (languageData.length > 0) {
            setDefaultLanguage(languageData[0]); // Fallback to first language
          }
        }
      } catch (error) {
        console.error('❌ Error fetching languages:', error);
        toast.error('Failed to load languages');
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    fetchLanguages();
  }, []);

  // Handle saving translations
  const handleSaveTranslations = async (updatedTranslations: QuestionSetTranslation[]) => {
    if (!questionSetId) return;

    try {
      // Update each translation via the API
      for (const translation of updatedTranslations) {
        try {
          // Check if translation exists, if so update, otherwise create
          const existingTranslations = translationsData?.data || [];
          const existingTranslation = existingTranslations.find(
            t => t.languageId === translation.language_id
          );

          const translationPayload = {
            displayName: translation.displayName,
            description: translation.description || undefined,
          };

          if (existingTranslation) {
            // Update existing question set translation
            await deviceQuestionSetService.updateQuestionSetTranslation(
              questionSetId,
              translation.language_id,
              translationPayload
            );
          } else {
            // Create new question set translation
            await deviceQuestionSetService.createQuestionSetTranslation(questionSetId, {
              languageId: translation.language_id,
              ...translationPayload,
            });
          }

          // Handle question translations
          if (translation.questions && Array.isArray(translation.questions)) {
            for (const questionTranslation of translation.questions) {
              if (questionTranslation.title && questionTranslation.title.trim()) {
                try {
                  // Try to update first, if it fails, create new
                  await deviceQuestionSetService.updateQuestionTranslation(
                    questionTranslation.id,
                    translation.language_id,
                    {
                      title: questionTranslation.title,
                      tooltip: questionTranslation.tooltip || undefined,
                      category: questionTranslation.category || undefined,
                    }
                  );
                } catch (_) {
                  // If update fails (translation doesn't exist), create new
                  try {
                    await deviceQuestionSetService.createQuestionTranslation(
                      questionTranslation.id,
                      {
                        languageId: translation.language_id,
                        title: questionTranslation.title,
                        tooltip: questionTranslation.tooltip || undefined,
                        category: questionTranslation.category || undefined,
                      }
                    );
                  } catch (createError) {
                    console.error(`Error creating question translation for question ${questionTranslation.id}:`, createError);
                  }
                }

                // Handle option translations
                if (questionTranslation.options && Array.isArray(questionTranslation.options)) {
                  for (const optionTranslation of questionTranslation.options) {
                    if (optionTranslation.title && optionTranslation.title.trim()) {
                      try {
                        // Try to update first, if it fails, create new
                        await deviceQuestionSetService.updateOptionTranslation(
                          optionTranslation.id,
                          translation.language_id,
                          {
                            title: optionTranslation.title,
                          }
                        );
                      } catch (_) {
                        // If update fails (translation doesn't exist), create new
                        try {
                          await deviceQuestionSetService.createOptionTranslation(
                            optionTranslation.id,
                            {
                              languageId: translation.language_id,
                              title: optionTranslation.title,
                            }
                          );
                        } catch (createError) {
                          console.error(`Error creating option translation for option ${optionTranslation.id}:`, createError);
                        }
                      }
                    }
                  }
                }
              }
            }
          }

        } catch (translationError) {
          console.error(`Error saving translation for language ${translation.language_id}:`, translationError);
          throw new Error(`Failed to save translation for language ${translation.language_id}`);
        }
      }

      // Refetch translations to get updated data
      await refetchTranslations();
      toast.success('Translations updated successfully');
    } catch (error) {
      console.error('Error saving translations:', error);
      toast.error('Failed to save translations');
    }
  };

  const handleSubmit = (values: QuestionSetSubmitValues) => {
    if (!questionSetId) return;

    const formattedQuestions: QuestionForUpdatePayload[] = values.questions.map(q => ({
      id: q.id, // Preserve ID for existing questions
      title: q.title,
      inputType: q.inputType as QuestionInputType, // Cast to enum
      isRequired: q.isRequired,
      orderNo: q.orderNo,
      options: q.options.map(opt => ({
        id: opt.id, // Preserve ID for existing options
        title: opt.title,
        priceModifier: opt.priceModifier ?? undefined,
        isDefault: opt.isDefault,
        orderNo: opt.orderNo,
      })),
    }));

    const payload: UpdateQuestionSetPayload = {
      displayName: values.name, // Use 'name' from form, map to 'displayName' for API
      description: values.description,
      questions: formattedQuestions, // Include the questions in the payload
    };

    updateQuestionSet(payload, {
      onSuccess: (response) => {
        toast.success(t('deviceQuestionSetUpdated', { name: response?.data?.displayName || values.name }));
        router.push('/admin/catalog/device-questions');
      },
      onError: (error: Error) => {
        toast.error(t('errorUpdatingDeviceQuestionSet', { message: error.message || tCore('unknownError') }));
      },
    });
  };

  const handleCancel = () => {
    router.push('/admin/catalog/device-questions');
  };

  // Access the actual translations from the API response and map to compatible format
  const questionSetTranslations = (() => {
    console.log('🔍 Building questionSetTranslations from:', { translationsData, defaultLanguage, questionSetData });

    // The API returns a comprehensive structure, but we need to map it to the component's expected format
    const translationList = (translationsData?.data || []).map((translation: ComprehensiveTranslationResponse) => ({
      language_id: translation.languageId,
      entity_id: translation.questionSetId,
      displayName: translation.displayName,
      description: translation.description || '',
      questions: translation.questions || [],
    })) as QuestionSetTranslation[];

    console.log('🔍 Mapped translation list:', translationList);

    // Check if there's already a translation for the default language
    const hasDefaultLanguageTranslation = defaultLanguage &&
      translationList.some(t => t.language_id === defaultLanguage.id);

    console.log('🔍 Has default language translation:', hasDefaultLanguageTranslation);

    // If no default language translation exists, use the main question set data as fallback
    if (defaultLanguage && !hasDefaultLanguageTranslation && questionSetData && questionSetId) {
      const defaultTranslation: QuestionSetTranslation = {
        language_id: defaultLanguage.id,
        entity_id: questionSetId,
        displayName: questionSetData.displayName || '',
        description: questionSetData.description || '',
        questions: questionSetData.questions.map(q => ({
          id: q.id,
          title: q.title,
          tooltip: '',
          category: '',
          options: q.options.map(o => ({
            id: o.id,
            title: o.title,
          })),
        })),
      };

      console.log('🔍 Adding default translation:', defaultTranslation);
      // Add the default translation to the beginning of the list
      translationList.unshift(defaultTranslation);
    }

    console.log('🔍 Final translation list:', translationList);
    return translationList;
  })();

  if (isLoadingSet || isLoadingTranslations) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-gray-600">{tCore('loadingDetails')}</p>
        </div>
        <Skeleton className="h-12 w-1/3 mt-8" />
        <Skeleton className="h-96 w-full mt-4" />
      </div>
    );
  }

  if (isError || !questionSetData) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCore('back')}
        </Button>
        <h2 className="text-2xl font-semibold text-red-600">{t('errorLoadingData')}</h2>
        <p className="text-gray-500 mt-2">
          {error?.message || t('deviceQuestionSetNotFound')}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tCore('back')}
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">
          {t('editDeviceQuestionSetTitle', { name: questionSetData.displayName })}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('editDeviceQuestionSetDescription')}
        </p>
      </div>

      {/* Tabs for form and translations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="edit" className="flex items-center">
            <PenSquare className="w-4 h-4 mr-2" /> Edit Question Set
          </TabsTrigger>
          <TabsTrigger value="translations" className="flex items-center">
            <Globe className="w-4 h-4 mr-2" /> Translations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <DeviceQuestionSetForm
            initialData={{
              name: questionSetData.displayName, // Use displayName as the form 'name'
              description: questionSetData.description ?? undefined,
              id: questionSetData.id.toString(),
              questions: questionSetData.questions,
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isUpdating}
          />
        </TabsContent>

        <TabsContent value="translations" className="space-y-4">
          {isLoadingTranslations || isLoadingLanguages ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading translations...</span>
            </div>
          ) : defaultLanguage ? (
            <div className="space-y-4">
              {/* AI Translation Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">AI Translation Available</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Use the &ldquo;Generate with AI&rdquo; button to automatically translate content from {defaultLanguage.name} to other languages.
                      The AI will maintain technical accuracy and optimize the content for each target language.
                    </p>
                  </div>
                </div>
              </div>

              <QuestionSetTranslationManager
                questionSet={questionSetData}
                defaultLanguage={defaultLanguage}
                availableLanguages={languages}
                initialTranslations={questionSetTranslations}
                onSave={handleSaveTranslations}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center p-8">
              <span className="text-gray-500">No languages available. Please add languages first.</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 