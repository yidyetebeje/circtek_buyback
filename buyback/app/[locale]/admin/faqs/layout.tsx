"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { MessageCircleQuestion, Mail } from "lucide-react";

interface SupportLayoutProps {
    children: React.ReactNode;
}

export default function SupportLayout({ children }: SupportLayoutProps) {
    const t = useTranslations("AdminSidebar");

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

    return (
        <div className="space-y-4">
            <AdminHeader
                title="Customer Support"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Support", isCurrentPage: true },
                ]}
            />
            <PageTabs tabs={supportTabs} />
            {children}
        </div>
    );
}
