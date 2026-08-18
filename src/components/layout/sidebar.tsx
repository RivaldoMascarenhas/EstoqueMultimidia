"use client";

import React from "react";
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
  Server,
  Camera,
  CalendarDays,
  School
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  const userName = session?.user?.name || "Usuário";
  const userAvatar = session?.user?.avatarUrl || null;

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      case "ACADEMIC_SUPPORT": return "academic";
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
      <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div>
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
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Sections */}
          <div className={cn("space-y-6 py-4", collapsed ? "px-2" : "px-3")}>
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
        </div>

        {/* Footer / User Profile & Desktop Collapse Button */}
        <div className={cn("border-t border-border/80 space-y-2", collapsed ? "p-2" : "p-3")}>
          {/* User Card Link to /perfil */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/perfil"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center rounded-xl bg-card/80 hover:bg-accent/80 border border-border/60 backdrop-blur-sm transition-all group flex-1",
                collapsed ? "justify-center h-10 w-10 mx-auto p-0" : "gap-2.5 p-2"
              )}
              title={collapsed ? `${userName} (${userRole}) - Meu Perfil` : "Ver Meu Perfil"}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-xs font-bold text-white shadow-sm overflow-hidden ring-1 ring-primary/20">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover rounded-xl" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate leading-tight">
                    {userName}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant={getRoleVariant(userRole)} className="text-[9px] px-1.5 py-0 h-4">
                      {userRole === "ACADEMIC_SUPPORT" ? "APOIO ACADÊMICO" : userRole}
                    </Badge>
                  </div>
                </div>
              )}
            </Link>

            {!collapsed && (
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
          {!isMobileView && (
            <div className="hidden md:flex justify-center pt-1">
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "flex items-center justify-center rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
                  collapsed ? "h-9 w-9" : "w-full gap-2 py-2"
                )}
                title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-[11px]">Recolher Sidebar</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border/80 bg-card/95 backdrop-blur-xl transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {renderSidebarContent(false)}
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
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}
