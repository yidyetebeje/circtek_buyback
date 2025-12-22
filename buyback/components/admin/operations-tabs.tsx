"use client";

import { useTranslations } from "next-intl";
import { PageTabs, PageTab } from "@/components/admin/ui/page-tabs";
import {
    Package,
    Layers,
    ArrowRightLeft,
    RefreshCw,
} from "lucide-react";

export function OperationsTabs() {
    const t = useTranslations("AdminSidebar");

    const tabs: PageTab[] = [
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

    return <PageTabs tabs={tabs} />;
}
