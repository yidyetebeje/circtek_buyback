"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
    Building,
    Truck,
    Gift,
    Package,
    Layers,
    ArrowRightLeft,
    RefreshCw,
    MapPin,
} from "lucide-react";

interface ShopLayoutProps {
    children: React.ReactNode;
}

export default function ShopLayout({ children }: ShopLayoutProps) {
    const params = useParams();
    const shopId = params.id as string;
    const t = useTranslations("AdminSidebar");

    const shopTabs: PageTab[] = [
        {
            key: "shop",
            label: t("myShop") || "My Shop",
            href: `/admin/shops/${shopId}`,
            icon: Building,
        },
        {
            key: "shipping",
            label: t("shippingSettings") || "Shipping",
            href: `/admin/shops/${shopId}/shipping`,
            icon: Truck,
        },
        {
            key: "tremendous",
            label: t("tremendousRewards") || "Rewards",
            href: `/admin/shops/${shopId}/tremendous`,
            icon: Gift,
        },
        {
            key: "locations",
            label: t("locations") || "Locations",
            href: `/admin/shops/${shopId}/locations`,
            icon: MapPin,
        },
        {
            key: "orders",
            label: t("orders"),
            href: "/admin/orders",
            icon: Package,
        },
        {
            key: "stock",
            label: t("stock") || "Stock",
            href: "/admin/stock",
            icon: Layers,
        },
        {
            key: "store-transfer",
            label: t("storeTransfers") || "Transfers",
            href: "/admin/store-transfer",
            icon: ArrowRightLeft,
        },
        {
            key: "backmarket",
            label: "Back Market",
            href: "/admin/backmarket",
            icon: RefreshCw,
        },
    ];

    return (
        <div className="space-y-4">
            <AdminHeader
                title="Shop Management"
                breadcrumbs={[
                    { href: "/admin/dashboards", label: "Admin" },
                    { label: "Shop", isCurrentPage: true },
                ]}
            />
            <PageTabs tabs={shopTabs} />
            {children}
        </div>
    );
}
