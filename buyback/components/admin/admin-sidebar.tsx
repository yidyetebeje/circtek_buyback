"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useAtomValue } from 'jotai';
import { displayConfigAtom } from '@/store/atoms';
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  LayoutDashboard,
  ShoppingBag,
  ChevronDown,
  Layers,
  Store,
  Infinity,
  Smartphone,
  Building,
  Users,
  MessageCircleQuestion,
  Mail,
  FlaskConical,
  FileQuestion,
  Star,
  Package,
  ShoppingCart,
  MapPin,
  LogOut,
  Menu,
  ArrowRightLeft,
  Truck,
  Gift,
  RefreshCw,
  Coins,
} from "lucide-react";

interface TopBarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
}

const TopBarItem = ({ icon: Icon, label, href, isActive }: TopBarItemProps) => {
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-base font-semibold transition-all duration-200",
        isActive
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/90 hover:text-white hover:bg-white/10"
      )}>
        <Icon size={18} />
        <span>{label}</span>
      </div>
    </Link>
  );
};

interface DropdownProps {
  isActive: boolean;
  icon: LucideIcon;
  label: string;
  items: { href: string; icon: LucideIcon; label: string }[];
}

const NavigationDropdown = ({ isActive, icon: Icon, label, items }: DropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-semibold transition-all duration-200",
          isActive
            ? "bg-white/15 text-white shadow-sm"
            : "text-white/90 hover:text-white hover:bg-white/10"
        )}>
          <Icon size={18} />
          <span>{label}</span>
          <ChevronDown size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="w-full">
              <item.icon size={16} className="mr-2" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



export function AdminSidebar() {
  const config = useAtomValue(displayConfigAtom);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 w-[80px] h-screen bg-background dark:bg-sidebar border-r border-border shadow-sm flex-col items-center py-4">
      <Link href="/admin" className="flex items-center justify-center w-full mb-6">
        {config.logoUrl ? (
          <div className="relative w-10 h-10">
            <Image
              src={config.logoUrl}
              alt={config.shopName || "Company Logo"}
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-md"
            />
          </div>
        ) : (
          <div className="p-2 bg-primary/10 rounded-md">
            <ShoppingBag size={24} className="text-primary" />
          </div>
        )}
      </Link>
    </aside>
  );
}

export function AdminTopBar() {
  const t = useTranslations('AdminSidebar');
  const pathname = usePathname();
  const { data: session } = useSession();
  const config = useAtomValue(displayConfigAtom);
  const roleSlug = session?.user?.roleSlug;
  const canManageUsersLocations = roleSlug === 'admin' || roleSlug === 'client';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/en/admin/login' });
  };

  const isActive = (path: string) => {
    if (!pathname) return false;
    const cleanPathname = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const cleanPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    return cleanPathname === cleanPath || cleanPathname.startsWith(`${cleanPath}/`);
  };

  // Group navigation items into logical categories
  const shopManagementItems = [
    { href: `/admin/shops/${process.env.NEXT_PUBLIC_SHOP_ID}`, icon: Building, label: t('myShop') || "My Shop" },
    { href: `/admin/shops/${process.env.NEXT_PUBLIC_SHOP_ID}/shipping`, icon: Truck, label: t('shippingSettings') || "Shipping Settings" },
    { href: `/admin/shops/${process.env.NEXT_PUBLIC_SHOP_ID}/tremendous`, icon: Gift, label: t('tremendousRewards') || "Tremendous Rewards" },
    { href: "/admin/orders", icon: Package, label: t('orders') },
    { href: "/admin/stock", icon: Layers, label: t('stock') || 'Stock' },
    { href: "/admin/store-transfer", icon: ArrowRightLeft, label: t('storeTransfers') || 'Store Transfers' },
    { href: "/admin/backmarket", icon: RefreshCw, label: "Back Market" },
  ];

  const catalogItems = [
    { href: "/admin/catalog/categories", icon: Layers, label: t('categories') },
    { href: "/admin/catalog/brands", icon: Store, label: t('brands') },
    { href: "/admin/catalog/model-series", icon: Infinity, label: t('modelSeries') },
    { href: "/admin/catalog/models", icon: Smartphone, label: t('models') },
    { href: "/admin/catalog/device-questions", icon: FileQuestion, label: t('deviceQuestions') },
    { href: "/admin/catalog/featured-products", icon: Star, label: t('featuredProducts') },
  ];

  const customerServiceItems = [
    { href: "/admin/faqs", icon: MessageCircleQuestion, label: t('faqs') },
    { href: "/admin/email-templates", icon: Mail, label: t('emailTemplates') },
  ];

  const adminItems = [];
  if (canManageUsersLocations) {
    adminItems.push(
      { href: "/admin/users", icon: Users, label: t('users') },
      { href: "/admin/locations", icon: MapPin, label: t('locations') || 'Locations' }
    );
  }

  const isGroupActive = (items: { href: string }[]) => {
    return items.some(item => isActive(item.href));
  };

  return (
    <header className="fixed top-0 left-0 md:left-[80px] right-0 z-50 shadow-lg border-b border-white/10 transition-all duration-300 bg-[#7f8282]">
      <div className="flex items-center justify-between px-6 py-4">

        {/* Mobile Logo - visible only on small screens */}
        <Link href="/admin" className="md:hidden flex items-center">
          {config.logoUrl ? (
            <div className="relative w-8 h-8">
              <Image
                src={config.logoUrl}
                alt={config.shopName || "Company Logo"}
                fill
                style={{ objectFit: 'contain' }}
                className="rounded-md"
              />
            </div>
          ) : (
            <div className="p-1.5 bg-white/10 rounded-md">
              <ShoppingBag size={20} className="text-white" />
            </div>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 flex-1">
          {/* Dashboard - Keep as single item */}
          <TopBarItem
            icon={LayoutDashboard}
            label={t('dashboards')}
            href="/admin/dashboards"
            isActive={isActive("/admin/dashboards")}
          />

          {/* Shop Management - Flat link, tabs on page */}
          <TopBarItem
            icon={Building}
            label="Shop"
            href={`/admin/shops/${process.env.NEXT_PUBLIC_SHOP_ID}`}
            isActive={isGroupActive(shopManagementItems)}
          />

          {/* Catalog - Flat link, tabs on page */}
          <TopBarItem
            icon={ShoppingBag}
            label={t('catalog')}
            href="/admin/catalog"
            isActive={isGroupActive(catalogItems)}
          />

          {/* Customer Service - Flat link, tabs on page */}
          <TopBarItem
            icon={MessageCircleQuestion}
            label="Support"
            href="/admin/faqs"
            isActive={isGroupActive(customerServiceItems)}
          />

          {/* Diagnostics - Separate item */}
          <TopBarItem
            icon={FlaskConical}
            label={t('diagnostics')}
            href="/admin/diagnostics"
            isActive={isActive("/admin/diagnostics")}
          />

          {/* Buy Device - Separate item */}
          <TopBarItem
            icon={ShoppingCart}
            label={t('buyDevice') || 'Buy Device'}
            href="/admin/buy-device"
            isActive={isActive("/admin/buy-device")}
          />

          {/* Administration - Flat link, tabs on page (if user has permissions) */}
          {adminItems.length > 0 && (
            <TopBarItem
              icon={Users}
              label="Admin"
              href="/admin/users"
              isActive={isGroupActive(adminItems)}
            />
          )}
        </nav>

        {/* Right Section: Mobile Menu & User Profile */}
        <div className="flex items-center ml-auto gap-4">

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-all duration-200"
          >
            <Menu size={20} />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Actions (Logout) - Hidden on mobile, shown in mobile menu instead */}
          {session && (
            <button
              onClick={handleSignOut}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/20 bg-[#7f8282]">
          <nav className="px-4 py-2 space-y-1 max-h-96 overflow-y-auto">
            {/* Dashboard */}
            <Link
              href="/admin/dashboards"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive("/admin/dashboards")
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboard size={16} />
              {t('dashboards')}
            </Link>

            {/* Shop - Single link, tabs on page */}
            <Link
              href={`/admin/shops/${process.env.NEXT_PUBLIC_SHOP_ID}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isGroupActive(shopManagementItems)
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Building size={16} />
              Shop
            </Link>

            {/* Catalog - Single link, tabs on page */}
            <Link
              href="/admin/catalog"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isGroupActive(catalogItems)
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <ShoppingBag size={16} />
              {t('catalog')}
            </Link>

            {/* Support - Single link, tabs on page */}
            <Link
              href="/admin/faqs"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isGroupActive(customerServiceItems)
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <MessageCircleQuestion size={16} />
              Support
            </Link>

            {/* Diagnostics - Separate item */}
            <Link
              href="/admin/diagnostics"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive("/admin/diagnostics")
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FlaskConical size={16} />
              {t('diagnostics')}
            </Link>

            {/* Buy Device - Separate item */}
            <Link
              href="/admin/buy-device"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive("/admin/buy-device")
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <ShoppingCart size={16} />
              {t('buyDevice') || 'Buy Device'}
            </Link>

            {/* Admin - Single link (if user has permissions) */}
            {adminItems.length > 0 && (
              <Link
                href="/admin/users"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isGroupActive(adminItems)
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users size={16} />
                Admin
              </Link>
            )}

            {/* Sign Out Button - Mobile only */}
            {session && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full mt-2 bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            )}
          </nav>
        </div>
      )}

    </header>
  );
}
