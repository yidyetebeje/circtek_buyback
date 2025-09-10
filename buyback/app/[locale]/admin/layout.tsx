'use client';

import React from "react";
import { AdminTopBar, AdminSidebar } from "@/components/admin/admin-sidebar";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname?.includes('/admin/login');
  
  // If this is the login page, don't show the top bar
  if (isLoginPage) {
    return (
      <main className="w-full min-h-screen">
        {children}
      </main>
    );
  }
  
  // Normal admin layout with top bar and sidebar for all other admin pages
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin top bar */}
      <AdminTopBar />
      
      {/* Admin sidebar */}
      <AdminSidebar />
      
      {/* Main content area with padding to account for the fixed top bar and sidebar */}
      <main className="pt-20 pl-16 w-full"> {/* pt-20 for top bar, pl-16 for sidebar */}
        <div className="p-4 md:p-6 lg:p-8 w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ReactQueryProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
      <Toaster />
    </ReactQueryProvider>
  );
}