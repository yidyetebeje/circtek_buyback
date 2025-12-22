"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Users, MapPin } from "lucide-react";

interface AdminLocationsLayoutProps {
    children: React.ReactNode;
}

export default function AdminLocationsLayout({ children }: AdminLocationsLayoutProps) {
    const t = useTranslations("AdminSidebar");

    const pathname = usePathname();

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

    // Check if we are on a details page (new or edit/view id)
    const isDetailsPage = pathname.includes('/new') || pathname.match(/\/\d+$/);

    if (isDetailsPage) {
        return <div className="space-y-12">{children}</div>;
    }

    return (
        <div className="space-y-12">
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
