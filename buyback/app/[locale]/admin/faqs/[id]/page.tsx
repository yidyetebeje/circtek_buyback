"use client";

import React from 'react';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFAQ, useDeleteFAQ } from '@/hooks/catalog/useFAQs';
import { toast } from 'sonner';

export default function FAQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const faqId = parseInt(params.id as string);
  
  const { data: faqResponse, isLoading, error } = useFAQ(faqId);
  const { mutate: deleteFAQ, isPending: isDeleting } = useDeleteFAQ();

  const faq = faqResponse?.data;

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteFAQ(faqId, {
        onSuccess: () => {
          toast.success('FAQ deleted successfully');
          router.push('/admin/faqs');
        },
        onError: (error: Error) => {
          toast.error(error?.message || 'Failed to delete FAQ');
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full py-10">
        <div className="flex justify-center items-center">
          <div className="text-muted-foreground">Loading FAQ details...</div>
        </div>
      </div>
    );
  }

  if (error || !faq) {
    return (
      <div className="w-full py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">FAQ not found</h1>
          <p className="text-muted-foreground mt-2">
            The FAQ you&apos;re looking for doesn&apos;t exist or has been deleted.
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
    <div className="w-full py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/faqs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to FAQs
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">FAQ Details</h1>
            <p className="text-muted-foreground">View and manage this FAQ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/faqs/${faq.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={faq.is_published ? "default" : "secondary"}>
              {faq.is_published ? "Published" : "Draft"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Order: {faq.order_no || 0}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Created: {faq.created_at ? new Date(faq.created_at).toLocaleDateString() : 'N/A'}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Question</h3>
            <p className="text-gray-700">{faq.question}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Answer</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Shop ID</h4>
            <p className="text-sm">{faq.shop_id}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Client ID</h4>
            <p className="text-sm">{faq.client_id}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 