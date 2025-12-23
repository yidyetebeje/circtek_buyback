"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OperationsTabs } from "@/components/admin/operations-tabs";

interface BackMarketLayoutProps {
    children: React.ReactNode;
}

export default function BackMarketLayout({ children }: BackMarketLayoutProps) {
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
