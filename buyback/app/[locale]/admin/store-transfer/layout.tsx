"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OperationsTabs } from "@/components/admin/operations-tabs";

interface StoreTransferLayoutProps {
    children: React.ReactNode;
}

export default function StoreTransferLayout({ children }: StoreTransferLayoutProps) {
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
