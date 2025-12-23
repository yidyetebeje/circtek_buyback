"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion, Mail, Plus } from "lucide-react";

interface SupportLayoutProps {
    children: React.ReactNode;
}

export default function SupportLayout({ children }: SupportLayoutProps) {
    const t = useTranslations("AdminSidebar");
    const pathname = usePathname();

    const supportTabs: PageTab[] = [
        {
            key: "faqs",
            label: t("faqs"),
            href: "/admin/faqs",
            icon: MessageCircleQuestion,
        },
        {
            key: "email-templates",
            label: t("emailTemplates"),
            href: "/admin/email-templates",
            icon: Mail,
        },
    ];

    // Determine which action button to show based on current route
    const getActionButton = () => {
        // Don't show action buttons on /new or /[id] pages
        if (pathname.includes('/new') || pathname.match(/\/\d+$/) || pathname.includes('/edit')) {
            return null;
        }

        if (pathname.endsWith('/faqs')) {
            return (
                <Button asChild>
                    <Link href="/admin/faqs/new">
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Create New FAQ</span>
                    </Link>
                </Button>
            );
        }
        if (pathname.endsWith('/email-templates')) {
            return (
                <Button asChild>
                    <Link href="/admin/email-templates/new">
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Add Template</span>
                    </Link>
                </Button>
            );
        }
        return null;
    };

    // Check if we are on a details page (new or edit/view id)
    const isDetailsPage = pathname.includes('/new') || pathname.match(/\/\d+$/) || pathname.includes('/edit');

    if (isDetailsPage) {
        return <div className="space-y-12">{children}</div>;
    }

    return (
        <div className="space-y-12">
            <AdminHeader
                title="Customer Support"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Support", isCurrentPage: true },
                ]}
                actions={getActionButton()}
            />
            <PageTabs tabs={supportTabs} />
            {children}
        </div>
    );
}

