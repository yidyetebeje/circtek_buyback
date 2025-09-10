import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

interface AdminPageLoadingProps {
  breadcrumbCount?: number;
}

export const AdminPageLoading: React.FC<AdminPageLoadingProps> = ({ breadcrumbCount = 2 }) => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          {Array.from({ length: breadcrumbCount }).map((_, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                <Skeleton className="h-6 w-20" />
              </BreadcrumbItem>
              {index < breadcrumbCount - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      
      <Skeleton className="h-10 w-56 mb-6" />
      
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
};
