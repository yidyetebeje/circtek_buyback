"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FAQForm, FAQFormValues } from '@/components/admin/catalog/faq-form';
import { useFAQ, useUpdateFAQWithTranslations } from '@/hooks/catalog/useFAQs';
import { FAQ, Language } from '@/types/catalog';
import { toast } from 'sonner';
import { languageService } from '@/lib/api/catalog/languageService';

export default function EditFAQPage() {
  const params = useParams();
  const router = useRouter();
  const faqId = parseInt(params.id as string);
  
  const { data: faqResponse, isLoading: isLoadingFAQ, error: faqLoadingError } = useFAQ(faqId);
  const { mutate: updateFAQ, isPending: isUpdating } = useUpdateFAQWithTranslations(faqId);

  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);

  const faq = faqResponse?.data;

  const defaultFaqDataForManager = React.useMemo(() => {
    if (faq && faq.question && faq.answer) {
        return { question: faq.question, answer: faq.answer };
    }
    return undefined;
  }, [faq?.question, faq?.answer]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoadingLanguages(true);
        const response = await languageService.getLanguages(1, 100);
        if (response.data) {
          const languageData = response.data;
          setLanguages(languageData);
          const defaultLang = languageData.find((lang: Language) => lang.is_default === true || lang.is_default === 1);
          if (defaultLang) {
            setDefaultLanguage(defaultLang);
          } else if (languageData.length > 0) {
            setDefaultLanguage(languageData[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching languages:', err);
        toast.error('Failed to load languages');
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    if (faqId) {
      fetchLanguages();
    }
  }, [faqId]);

  const handleSubmit = (data: FAQFormValues) => {
    const payload: Partial<Omit<FAQ, 'translations'>> = {
      question: data.question,
      answer: data.answer,
      order_no: data.order_no,
      is_published: data.is_published,
    };

    updateFAQ(payload, {
      onSuccess: () => {
        toast.success('FAQ updated successfully');
      },
      onError: (err: Error) => {
        toast.error(err?.message || 'Failed to update FAQ core data');
      }
    });
  };

  const handleCancel = () => {
    router.push(faqId ? `/admin/faqs/${faqId}` : '/admin/faqs');
  };

  if (isLoadingFAQ || (faqId && isLoadingLanguages)) {
    return (
      <div className="w-full py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading FAQ details...</span>
      </div>
    );
  }

  if (faqLoadingError || (faqId && !faq)) {
    return (
      <div className="w-full py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">FAQ not found</h1>
          <p className="text-muted-foreground mt-2">
            The FAQ you&apos;re trying to edit doesn&apos;t exist or has been deleted.
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/faqs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to FAQs
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-10 px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href={faqId ? `/admin/faqs/${faqId}` : "/admin/faqs"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{faqId ? "Edit FAQ" : "Create FAQ"}</h1>
          <p className="text-muted-foreground">
            {faqId ? "Update the frequently asked question and its translations." : "Add a new frequently asked question."}
          </p>
        </div>
      </div>
      
      <FAQForm 
        initialData={faq}
        onSubmit={handleSubmit} 
        onCancel={handleCancel}
        isLoading={isUpdating}
        faqId={faqId}
        availableLanguages={languages}
        defaultLanguage={defaultLanguage}
        defaultFAQData={defaultFaqDataForManager}
      />
    </div>
  );
} 