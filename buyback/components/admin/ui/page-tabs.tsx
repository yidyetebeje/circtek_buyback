"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageTab {
    key: string;
    label: string;
    href: string;
    icon?: LucideIcon;
    badge?: number;
}

interface PageTabsProps {
    tabs: PageTab[];
    className?: string;
}

/**
 * PageTabs - A reusable tab navigation component for admin pages
 * Styled to match the Angular project's DaisyUI tabs design pattern
 * Uses URL-based navigation (clicking a tab navigates to the route)
 * Responsive: tabs wrap to new lines on smaller screens
 */
export function PageTabs({ tabs, className }: PageTabsProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (!pathname) return false;

        // Remove locale prefix (e.g. /en, /nl) if present
        // Matches /en, /en/, /en/..., but not /enable
        const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');

        // Ensure standard format with leading slash but no double slashes
        const cleanPathname = pathnameWithoutLocale.startsWith('/')
            ? pathnameWithoutLocale
            : `/${pathnameWithoutLocale}`;

        // Remove trailing slashes for comparison
        const finalPathname = cleanPathname.length > 1 && cleanPathname.endsWith('/')
            ? cleanPathname.slice(0, -1)
            : cleanPathname;

        const cleanHref = href.endsWith('/') ? href.slice(0, -1) : href;

        // Check if current path matches exactly or starts with the href (for nested routes)
        // Verify we're matching complete segments by ensuring next char is / or end of string
        if (finalPathname === cleanHref) return true;
        if (finalPathname.startsWith(`${cleanHref}/`)) return true;

        return false;
    };

    return (
        <nav className={cn("w-full", className)}>
            <div
                role="tablist"
                className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-muted rounded-xl w-fit border border-gray-100 dark:border-none"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = isActive(tab.href);

                    return (
                        <Link
                            key={tab.key}
                            href={tab.href}
                            role="tab"
                            aria-selected={active}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                                active
                                    ? "bg-primary text-primary-foreground ring-1 ring-black/5"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {Icon && <Icon size={16} />}
                            <span>{tab.label}</span>
                            {tab.badge != null && (
                                <span
                                    className={cn(
                                        "ml-1 px-2 py-0.5 text-xs rounded-full",
                                        active
                                            ? "bg-primary/20 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
