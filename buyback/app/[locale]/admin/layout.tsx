'use client';

import React from "react";
import { AdminTopBar, AdminSidebar } from "@/components/admin/admin-sidebar";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { usePathname } from "next/navigation";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});
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
    <div className="min-h-screen bg-muted/40">
      {/* Admin top bar */}
      <AdminTopBar />

      {/* Admin sidebar */}
      <AdminSidebar />

      {/* Main content area with padding to account for the fixed top bar and sidebar */}
      <main className="pt-20 pl-0 lg:pl-[80px] w-full"> {/* pt-20 for top bar, pl-[80px] for desktop sidebar */}
        <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ReactQueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className={poppins.className}>
          <AdminLayoutContent>{children}</AdminLayoutContent>
          <Toaster />
        </div>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}