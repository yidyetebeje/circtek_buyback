"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FAQForm, FAQFormValues } from '@/components/admin/catalog/faq-form';
import { useRouter } from 'next/navigation';
import { useCreateFAQ } from '@/hooks/catalog/useFAQs';
import { Language } from '@/types/catalog';
import { toast } from 'sonner';
import { languageService } from '@/lib/api/catalog/languageService';

export default function NewFAQPage() {
  const router = useRouter();
  const { mutate: createFAQ, isPending } = useCreateFAQ();

  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(null);

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

    fetchLanguages();
  }, []);

  const handleSubmit = (data: FAQFormValues) => {
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID;
    if (!shopId) {
      toast.error('Shop ID is not configured. Please set NEXT_PUBLIC_SHOP_ID.');
      return;
    }

    const payload = {
      ...data,
      shop_id: parseInt(shopId, 10),
      client_id: 1, // This will be overwritten by the backend
    };
    
    createFAQ(payload, {
      onSuccess: () => {
        toast.success('FAQ created successfully');
        router.push('/admin/faqs');
      },
      onError: (error: Error) => {
        toast.error(error?.message || 'Failed to create FAQ');
      }
    });
  };

  if (isLoadingLanguages) {
    return (
      <div className="w-full py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading languages...</span>
      </div>
    );
  }

  return (
    <div className="w-full py-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/faqs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to FAQs
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New FAQ</h1>
          <p className="text-muted-foreground">Add a new frequently asked question for your shop</p>
        </div>
      </div>
      
      <FAQForm 
        onSubmit={handleSubmit} 
        isLoading={isPending}
        availableLanguages={languages}
        defaultLanguage={defaultLanguage}
      />
    </div>
  );
} 