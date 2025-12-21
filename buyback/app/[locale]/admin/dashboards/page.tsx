import { Metadata } from "next";
import { DashboardClient } from "@/components/admin/DashboardClient";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import QueryProvider from "@/providers/query-provider";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "View platform statistics and analytics",
};

export default async function AdminDashboardPage() {
  const session = await auth();

  // Double-check authentication in case middleware fails
  if (!session) {
    redirect("/en/admin/login");
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Dashboard"
        breadcrumbs={[
          { label: 'Admin', isCurrentPage: true }
        ]}
      />
      <QueryProvider>
        <DashboardClient shopId={Number(process.env.NEXT_PUBLIC_SHOP_ID || 0)} />
      </QueryProvider>
    </div>
  );
} 