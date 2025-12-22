"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Users, MapPin, PlusCircle } from "lucide-react";

interface AdminUsersLayoutProps {
    children: React.ReactNode;
}

export default function AdminUsersLayout({ children }: AdminUsersLayoutProps) {
    const t = useTranslations("AdminSidebar");
    const pathname = usePathname();
    const router = useRouter();

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

    // Determine which action button to show based on current route
    const getActionButton = () => {
        // Don't show action buttons on /new or /[id] pages
        if (pathname.includes('/new') || pathname.match(/\/\d+$/)) {
            return null;
        }

        if (pathname.endsWith('/users')) {
            return (
                <Button onClick={() => router.push('/admin/users/new?role=shop_manager')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="font-semibold">Create Shop Manager</span>
                </Button>
            );
        }
        if (pathname.endsWith('/locations')) {
            return (
                <Button asChild>
                    <Link href="/admin/locations/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Create New Location</span>
                    </Link>
                </Button>
            );
        }
        return null;
    };

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
                actions={getActionButton()}
            />
            <PageTabs tabs={adminTabs} />
            {children}
        </div>
    );
}

