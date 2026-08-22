"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  ChevronLeft, 
  ChevronRight, 
  X,
  Camera,
  CalendarDays,
  School
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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

export function Sidebar({ 
  isMobileOpen, 
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = session?.user?.role || "OPERADOR";

  // Travar o scroll da página de fundo no mobile enquanto o menu lateral estiver aberto
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isMobileOpen]);

  const navSections: NavSection[] = [
    {
      title: "PRINCIPAL",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Agenda Operacional",
          href: "/agenda",
          icon: CalendarDays,
          badge: "Turnos",
        },
        {
          title: "Salas & Infra",
          href: "/salas",
          icon: School,
        },
        {
          title: "Scanner Mobile",
          href: "/scanner",
          icon: Camera,
          badge: "QR",
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
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
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Armário Físico",
          href: "/armario",
          icon: Archive,
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Caixas & QR Code",
          href: "/caixas",
          icon: Boxes,
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Patrimônio",
          href: "/patrimonio",
          icon: Monitor,
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Empréstimos",
          href: "/emprestimos",
          icon: Handshake,
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Manutenção",
          href: "/manutencao",
          icon: Wrench,
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Movimentações",
          href: "/movimentacoes",
          icon: History,
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
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
          roles: ["ADMIN", "GESTOR", "OPERADOR"],
        },
        {
          title: "Usuários",
          href: "/usuarios",
          icon: Users,
          roles: ["ADMIN"],
        },
        {
          title: "Configurações",
          href: "/configuracoes",
          icon: Settings,
          roles: ["ADMIN"],
        },
      ],
    },
  ];

  const renderSidebarContent = (isMobileView: boolean) => {
    const collapsed = isMobileView ? false : isCollapsed;

    return (
      <div className="flex h-full flex-col overflow-hidden overscroll-contain">
        {/* Brand Header (Fixo no Topo) */}
        <div className="shrink-0">
          <div className={cn(
            "flex h-16 items-center border-b border-border/80 transition-all",
            collapsed ? "justify-center px-0" : "justify-between px-4"
          )}>
            <Link href="/dashboard" className="flex items-center gap-3 group" title="UniFAP - Centro Universitário Paraíso">
              {collapsed ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 shadow-sm p-1">
                  <img
                    src="/brand/logo-unifap-quadrada.png"
                    alt="UniFAP"
                    className="h-full w-full object-contain dark:hidden"
                  />
                  <img
                    src="/brand/logo-unifap-quadrada-negativa.png"
                    alt="UniFAP"
                    className="h-full w-full object-contain hidden dark:block"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-auto flex items-center">
                    <img
                      src="/brand/logo-unifap.png"
                      alt="UniFAP"
                      className="h-8 w-auto object-contain dark:hidden"
                    />
                    <img
                      src="/brand/logo-unifap-negativa.png"
                      alt="UniFAP"
                      className="h-8 w-auto object-contain hidden dark:block"
                    />
                  </div>
                  <div className="flex flex-col border-l border-border/80 pl-2">
                    <span className="text-[11px] font-bold text-foreground leading-tight">
                      Suporte TI
                    </span>
                    <span className="text-[9px] text-muted-foreground leading-none">
                      Multimídia
                    </span>
                  </div>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            {isMobileView && (
              <button
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
                title="Fechar menu"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Sections (Área Rolável com Contenção de Scroll) */}
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-y-contain overflow-x-hidden touch-pan-y space-y-6 py-4",
          collapsed ? "px-2" : "px-3"
        )}>
          {navSections.map((section, idx) => {
            const filteredItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!collapsed ? (
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </p>
                ) : (
                  <div className="h-px bg-border/60 mx-2 my-2" />
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
                        title={collapsed ? item.title : undefined}
                        className={cn(
                          "group flex items-center rounded-xl text-xs font-medium transition-all duration-150 relative",
                          collapsed
                            ? "justify-center h-10 w-10 mx-auto px-0"
                            : "gap-3 px-3 py-2.5 w-full",
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
                        {!collapsed && (
                          <span className="truncate flex-1">{item.title}</span>
                        )}
                        {!collapsed && item.badge && (
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

        {/* Desktop Collapse Button (Fixo no Rodapé apenas para Desktop) */}
        {!isMobileView && (
          <div className={cn("shrink-0 border-t border-border/80", collapsed ? "p-2" : "p-3")}>
            <button
              onClick={onToggleCollapse}
              className={cn(
                "flex items-center justify-center rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all cursor-pointer",
                collapsed ? "h-9 w-9 mx-auto" : "w-full gap-2 py-2 px-3 border border-border/40 hover:border-border/80"
              )}
              title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-[11px] font-medium">Recolher Menu</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border/80 bg-card/95 backdrop-blur-xl transition-all duration-300 overscroll-contain",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200 touch-none"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Sheet */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border shadow-2xl md:hidden transition-transform duration-300 ease-in-out overscroll-contain touch-pan-y",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}
