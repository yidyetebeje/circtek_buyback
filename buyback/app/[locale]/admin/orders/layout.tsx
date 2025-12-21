"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";

interface OrdersLayoutProps {
    children: React.ReactNode;
}

export default function OrdersLayout({ children }: OrdersLayoutProps) {
    return (
        <div className="space-y-12">
            <AdminHeader
                title="Orders Management"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Orders", isCurrentPage: true },
                ]}
            />
            {children}
        </div>
    );
}
