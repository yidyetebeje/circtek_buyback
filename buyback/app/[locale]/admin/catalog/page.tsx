import { redirect } from 'next/navigation';

interface CatalogPageProps {
  params: Promise<{ locale: string }>;
}

// In Next.js App Router, page components receive params as a Promise
export default async function CatalogPage({ params }: CatalogPageProps) {
  const { locale } = await params;
  
  // Redirect to the categories page while preserving the locale
  redirect(`/${locale}/admin/catalog/categories`);
  
  // This won't be rendered, but is needed for TypeScript
  return null;
}
