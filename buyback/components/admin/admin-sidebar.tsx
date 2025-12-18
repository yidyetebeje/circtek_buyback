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
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/90 hover:text-white hover:bg-white/10"
      )}>
        <Icon size={16} />
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
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-white/15 text-white shadow-sm"
            : "text-white/90 hover:text-white hover:bg-white/10"
        )}>
          <Icon size={16} />
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
  const { data: session } = useSession();

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/en/admin/login' });
  };

  return (
    <aside className="fixed left-0 top-0 z-40 w-16 h-screen bg-white border-r border-gray-200 shadow-sm">
      <div className="flex flex-col h-full pt-20">
        {/* Empty space to push avatar to bottom */}
        <div className="flex-1"></div>

        {/* User Avatar at bottom */}
        {session && (
          <div className="p-4 flex justify-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-10 h-10 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
                  title={session.user?.name || 'User Menu'}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || undefined} />
                    <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                      {getUserInitials(session.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="right">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-gray-500">{session.user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
}

export function AdminTopBar() {
  const t = useTranslations('AdminSidebar');
  const pathname = usePathname();
  const config = useAtomValue(displayConfigAtom);
  const { data: session } = useSession();
  const roleSlug = session?.user?.roleSlug;
  const canManageUsersLocations = roleSlug === 'admin' || roleSlug === 'client';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className="fixed top-0 left-0 right-0 z-50 shadow-lg border-b border-gray-600/20" style={{ backgroundColor: '#7f8282' }}>
      <div className="flex items-center px-6 py-4">
        {/* Logo Section */}
        <Link href="/admin" className="flex items-center gap-3 min-w-0 mr-8">
          {config.logoUrl ? (
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src={config.logoUrl}
                alt={config.shopName || "Company Logo"}
                fill
                style={{ objectFit: 'contain' }}
                className="rounded-md"
              />
            </div>
          ) : (
            <div className="p-1.5 bg-primary/10 rounded-md flex-shrink-0">
              <ShoppingBag size={18} className="text-primary" />
            </div>
          )}
          <h1 className="font-semibold tracking-tight text-lg text-white hidden sm:block">
            {config.shopName || "Refurbished.nl"}
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2 flex-1">
          {/* Dashboard - Keep as single item */}
          <TopBarItem
            icon={LayoutDashboard}
            label={t('dashboards')}
            href="/admin/dashboards"
            isActive={isActive("/admin/dashboards")}
          />

          {/* Shop Management Dropdown */}
          <NavigationDropdown
            isActive={isGroupActive(shopManagementItems)}
            icon={Building}
            label="Shop Management"
            items={shopManagementItems}
          />

          {/* Catalog Dropdown */}
          <NavigationDropdown
            isActive={isGroupActive(catalogItems)}
            icon={ShoppingBag}
            label={t('catalog')}
            items={catalogItems}
          />

          {/* Customer Service Dropdown */}
          <NavigationDropdown
            isActive={isGroupActive(customerServiceItems)}
            icon={MessageCircleQuestion}
            label="Customer Service"
            items={customerServiceItems}
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

          {/* Admin Dropdown (if user has permissions) */}
          {adminItems.length > 0 && (
            <NavigationDropdown
              isActive={isGroupActive(adminItems)}
              icon={Users}
              label="Administration"
              items={adminItems}
            />
          )}
        </nav>

        {/* Mobile Menu */}
        <div className="flex items-center ml-auto">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-all duration-200"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/20" style={{ backgroundColor: '#7f8282' }}>
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

            {/* Shop Management Submenu */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-white">
                <Building size={16} />
                Shop Management
              </div>
              <div className="pl-6 space-y-1">
                {shopManagementItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Catalog Submenu */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-white">
                <ShoppingBag size={16} />
                {t('catalog')}
              </div>
              <div className="pl-6 space-y-1">
                {catalogItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Customer Service Submenu */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-white">
                <MessageCircleQuestion size={16} />
                Customer Service
              </div>
              <div className="pl-6 space-y-1">
                {customerServiceItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

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

            {/* Administration Submenu (if user has permissions) */}
            {adminItems.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-white">
                  <Users size={16} />
                  Administration
                </div>
                <div className="pl-6 space-y-1">
                  {adminItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      )}

    </header>
  );
}
