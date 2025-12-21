"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Users, MapPin } from "lucide-react";

interface AdminLocationsLayoutProps {
    children: React.ReactNode;
}

export default function AdminLocationsLayout({ children }: AdminLocationsLayoutProps) {
    const t = useTranslations("AdminSidebar");

    const adminTabs: PageTab[] = [
        {
            key: "users",
            label: t("users"),
            href: "/admin/users",
            icon: Users,
        },
        {
            key: "locations",
            label: t("locations") || "Locations",
            href: "/admin/locations",
            icon: MapPin,
        },
    ];

    return (
        <div className="space-y-4">
            <AdminHeader
                title="Administration"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Administration", isCurrentPage: true },
                ]}
            />
            <PageTabs tabs={adminTabs} />
            {children}
        </div>
    );
}
