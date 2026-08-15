"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  Package, 
  LayoutDashboard, 
  Archive, 
  Boxes,
  Monitor, 
  Handshake, 
  Wrench, 
  History, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X,
  QrCode,
  ShieldCheck,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userRole = session?.user?.role || "OPERADOR";
  const userName = session?.user?.name || "Usuário";

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      default: return "consulta";
    }
  };

  const navSections: NavSection[] = [
    {
      title: "PRINCIPAL",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "OPERAÇÃO & ESTOQUE",
      items: [
        {
          title: "Estoque",
          href: "/estoque",
          icon: Package,
        },
        {
          title: "Armário Físico",
          href: "/armario",
          icon: Archive,
        },
        {
          title: "Caixas & QR Code",
          href: "/caixas",
          icon: Boxes,
        },
        {
          title: "Patrimônio",
          href: "/patrimonio",
          icon: Monitor,
        },
        {
          title: "Empréstimos",
          href: "/emprestimos",
          icon: Handshake,
        },
        {
          title: "Manutenção",
          href: "/manutencao",
          icon: Wrench,
        },
        {
          title: "Movimentações",
          href: "/movimentacoes",
          icon: History,
        },
      ],
    },
    {
      title: "GESTÃO & SISTEMA",
      items: [
        {
          title: "Relatórios",
          href: "/relatorios",
          icon: BarChart3,
        },
        {
          title: "Usuários",
          href: "/usuarios",
          icon: Users,
          roles: ["ADMIN", "GESTOR"],
        },
        {
          title: "Configurações",
          href: "/configuracoes",
          icon: Settings,
          roles: ["ADMIN", "GESTOR"],
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/80">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 shadow-md shadow-primary-500/20 text-white font-bold transition-transform group-hover:scale-105">
              <Package className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  UniFAP <span className="text-primary font-normal text-xs">TI</span>
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Estoque & Patrimônio
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-6 py-4 px-3">
          {navSections.map((section, idx) => {
            const filteredItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </p>
                )}
                <nav className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        title={isCollapsed ? item.title : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 relative",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {!isCollapsed && (
                          <span className="truncate flex-1">{item.title}</span>
                        )}
                        {!isCollapsed && item.badge && (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / User Profile & Desktop Collapse Button */}
      <div className="p-3 border-t border-border/80 space-y-2">
        {/* User Card */}
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl bg-card/80 p-2 border border-border/60 backdrop-blur-sm",
            isCollapsed && "justify-center p-1.5"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-500 text-xs font-bold text-white shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate leading-tight">
                {userName}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant={getRoleVariant(userRole)} className="text-[9px] px-1.5 py-0 h-4">
                  {userRole}
                </Badge>
              </div>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sair da conta"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex justify-end pt-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-[11px]">Recolher Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border/80 bg-card/95 backdrop-blur-xl transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Sheet */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border shadow-2xl md:hidden transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
