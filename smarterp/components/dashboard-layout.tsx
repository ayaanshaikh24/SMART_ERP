'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { ShortcutsPanel } from '@/components/shortcuts-panel';
import { CommandPalette } from '@/components/command-palette';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Package, 
  Receipt, 
  ShoppingBag, 
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function SidebarLink({ href, icon, label, active }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-accent text-accent-foreground shadow-sm border-l-4 border-emerald-500' 
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const links = [
    { href: '/', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
    { href: '/customers', icon: <Users className="h-4 w-4" />, label: 'Customer Ledgers' },
    { href: '/suppliers', icon: <Truck className="h-4 w-4" />, label: 'Supplier Ledgers' },
    { href: '/stock-items', icon: <Package className="h-4 w-4" />, label: 'Stock Items' },
    { href: '/sales-vouchers', icon: <Receipt className="h-4 w-4" />, label: 'Sales Vouchers' },
    { href: '/purchase-vouchers', icon: <ShoppingBag className="h-4 w-4" />, label: 'Purchase Vouchers' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar border-r border-border flex-shrink-0">
        <div className="flex items-center h-16 px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-emerald-400 tracking-wide">
            <span className="bg-emerald-500 text-white p-1.5 rounded-md leading-none font-extrabold text-sm">SE</span>
            SmartERP
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map((link) => (
            <SidebarLink 
              key={link.href} 
              href={link.href} 
              icon={link.icon} 
              label={link.label} 
              active={pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))}
            />
          ))}
        </nav>
        <div className="p-4 border-t border-border bg-sidebar-accent/30">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-2 mb-3">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="text-xs">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 px-2 mb-3">
            <div className="overflow-hidden">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Logged In As</p>
              <p className="text-sm font-medium text-sidebar-foreground truncate" title={user.email}>{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile navigation header */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 md:hidden bg-sidebar border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <span className="bg-emerald-500 text-white px-2 py-1 rounded font-extrabold text-xs">SE</span>
            SmartERP
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <div 
              className="w-64 bg-sidebar h-full border-r border-border flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-border">
                <span className="flex items-center gap-2 font-bold text-lg text-emerald-400">
                  <span className="bg-emerald-500 text-white p-1.5 rounded font-extrabold text-xs">SE</span>
                  SmartERP
                </span>
                <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                {links.map((link) => (
                  <SidebarLink 
                    key={link.href} 
                    href={link.href} 
                    icon={link.icon} 
                    label={link.label} 
                    active={pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))}
                  />
                ))}
              </nav>
              <div className="p-4 border-t border-border bg-sidebar-accent/30">
                <div className="px-2 mb-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">User</p>
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Keyboard navigation overlays */}
      <ShortcutsPanel />
      <CommandPalette />
    </div>
  );
}
