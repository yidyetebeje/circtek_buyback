"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OperationsTabs } from "@/components/admin/operations-tabs";

interface OrdersLayoutProps {
    children: React.ReactNode;
}

export default function OrdersLayout({ children }: OrdersLayoutProps) {
    const pathname = usePathname();

    // Check if we are on a details page (e.g., /admin/orders/123 or /admin/orders/abc-123)
    const isDetailsPage = pathname.includes('/new') || /\/orders\/[^/]+$/.test(pathname) && !pathname.endsWith('/orders');

    if (isDetailsPage) {
        return <div className="space-y-12">{children}</div>;
    }

    return (
        <div className="space-y-12">
            <AdminHeader
                title="Operations"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Operations", isCurrentPage: true },
                ]}
            />
            <OperationsTabs />
            {children}
        </div>
    );
}
