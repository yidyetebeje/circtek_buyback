import { CategoryVariants, CategoryVariantType, CategoryType } from './category-variants';
import { CategoryTextConfig } from '@/types/shop';

export interface CategoryListProps {
  categories: CategoryType[];
  primaryColor: string;
  variant?: CategoryVariantType;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: Error | null;
  categoryTextConfig?: CategoryTextConfig;
}

export function CategoryList({ 
  categories, 
  primaryColor, 
  variant = 'default', 
  title, 
  subtitle, 
  isLoading = false,
  error = null,
  categoryTextConfig
}: CategoryListProps) {
  const CategoryComponent = CategoryVariants[variant] || CategoryVariants.default;
  
  if (isLoading) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4 w-full max-w-6xl px-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-300"></div>
                <div className="p-4 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center">
        <div className="text-red-500 font-medium">Failed to load categories</div>
        <p className="text-gray-500 mt-2">Please try again later</p>
      </div>
    );
  }

  // Handle empty state
  if (!categories || categories.length === 0) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center">
        <div className="text-gray-500 font-medium">No categories available</div>
      </div>
    );
  }
  
  // Render the selected category variant
  return <CategoryComponent categories={categories} primaryColor={primaryColor} title={title} subtitle={subtitle} categoryTextConfig={categoryTextConfig} />;
}