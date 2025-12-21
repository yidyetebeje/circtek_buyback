"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import {
    Layers,
    Store,
    Infinity,
    Smartphone,
    FileQuestion,
    Star,
    PlusCircle,
} from "lucide-react";

interface CatalogLayoutProps {
    children: React.ReactNode;
}

export default function CatalogLayout({ children }: CatalogLayoutProps) {
    const t = useTranslations("AdminSidebar");
    const tCore = useTranslations("Core");
    const pathname = usePathname();

    const catalogTabs: PageTab[] = [
        {
            key: "categories",
            label: t("categories"),
            href: "/admin/catalog/categories",
            icon: Layers,
        },
        {
            key: "brands",
            label: t("brands"),
            href: "/admin/catalog/brands",
            icon: Store,
        },
        {
            key: "model-series",
            label: t("modelSeries"),
            href: "/admin/catalog/model-series",
            icon: Infinity,
        },
        {
            key: "models",
            label: t("models"),
            href: "/admin/catalog/models",
            icon: Smartphone,
        },
        {
            key: "device-questions",
            label: t("deviceQuestions"),
            href: "/admin/catalog/device-questions",
            icon: FileQuestion,
        },
        {
            key: "featured-products",
            label: t("featuredProducts"),
            href: "/admin/catalog/featured-products",
            icon: Star,
        },
    ];

    // Determine which action button to show based on current route
    const getActionButton = () => {
        // Don't show action buttons on /new or /[id] pages
        if (pathname.includes('/new') || pathname.match(/\/\d+$/)) {
            return null;
        }

        if (pathname.endsWith('/catalog/categories')) {
            return (
                <Button asChild>
                    <Link href="/admin/catalog/categories/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Create New Category</span>
                    </Link>
                </Button>
            );
        }
        if (pathname.endsWith('/catalog/brands')) {
            return (
                <Button asChild>
                    <Link href="/admin/catalog/brands/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Create New Brand</span>
                    </Link>
                </Button>
            );
        }
        if (pathname.endsWith('/catalog/model-series')) {
            return (
                <Button asChild>
                    <Link href="/admin/catalog/model-series/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Create New Series</span>
                    </Link>
                </Button>
            );
        }
        if (pathname.endsWith('/catalog/models')) {
            return (
                <Button asChild>
                    <Link href="/admin/catalog/models/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="font-semibold">Create New Model</span>
                    </Link>
                </Button>
            );
        }
        if (pathname.endsWith('/catalog/device-questions')) {
            return (
                <Button asChild>
                    <Link href="/admin/catalog/device-questions/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="font-semibold">{tCore('addNew')}</span>
                    </Link>
                </Button>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4">
            <AdminHeader
                title={t("catalog")}
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: t("catalog"), isCurrentPage: true },
                ]}
                actions={getActionButton()}
            />
            <PageTabs tabs={catalogTabs} />
            {children}
        </div>
    );
}

