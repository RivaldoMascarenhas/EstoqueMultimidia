"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { 
  Menu, 
  Search, 
  Sun, 
  Moon, 
  Bell, 
  LogOut, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  User,
  ExternalLink
} from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenSearch?: () => void;
}

export function Header({ onToggleMobileSidebar, onOpenSearch }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    setMounted(true);
    fetchNotifications();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const isDark = (resolvedTheme || theme) === "dark";
    setTheme(isDark ? "light" : "dark");
  };

  const userRole = session?.user?.role || "OPERADOR";
  const userName = session?.user?.name || "Usuário";
  const userEmail = session?.user?.email || "usuario@unifap.br";
  const userAvatar = session?.user?.avatarUrl || null;

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      default: return "consulta";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isDarkMode = mounted && (resolvedTheme || theme) === "dark";

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-border/80 bg-background/80 px-3 sm:px-6 backdrop-blur-md transition-all">
      {/* Left: Hamburger (Mobile) + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 rounded-xl shrink-0"
          onClick={onToggleMobileSidebar}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Breadcrumbs />
      </div>

      {/* Right: Search, Notifications, Theme, User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Global Quick Search Button */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 rounded-xl border border-input bg-card/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:border-border hover:bg-card/90 transition-all"
        >
          <Search className="h-3.5 w-3.5 text-primary" />
          <span>Buscar itens, patrimônio, caixas...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Mobile Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden rounded-xl"
          onClick={onOpenSearch}
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Alternar tema"
        >
          {mounted ? (
            isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-400 transition-all" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600 transition-all" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </Button>

        {/* Notification Bell Dropdown */}
        <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl text-muted-foreground hover:text-foreground focus:ring-0 focus-visible:ring-0 focus:outline-none"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-2 rounded-2xl bg-card border-border shadow-xl">
            <DropdownMenuLabel className="flex items-center justify-between py-1.5 px-2">
              <span className="font-bold text-foreground text-xs">Alertas & Notificações</span>
              {unreadCount > 0 ? (
                <span className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} pendente{unreadCount > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Tudo em dia
                </span>
              )}
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="my-1" />

            <div className="space-y-1.5 py-1 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80 mb-2" />
                  <p className="font-semibold text-foreground">Nenhum alerta pendente</p>
                  <p className="text-[11px]">Estoque, empréstimos e manutenções estão em conformidade.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    asChild
                    className="p-0 rounded-xl cursor-pointer focus:bg-transparent"
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-xl border transition-all hover:scale-[1.01]",
                        item.severity === "danger"
                          ? "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200"
                          : item.severity === "warning"
                          ? "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
                          : "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-200"
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          "w-4 h-4 shrink-0 mt-0.5",
                          item.severity === "danger"
                            ? "text-rose-600 dark:text-rose-400"
                            : item.severity === "warning"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-blue-600 dark:text-blue-400"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-xs truncate">
                            {item.title}
                          </p>
                          <span className="text-[9px] opacity-75 font-mono">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </div>

            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem asChild className="text-center justify-center text-xs font-semibold text-primary py-2 cursor-pointer">
              <Link href="/relatorios">
                Ver Central de Relatórios & Inventário →
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-accent/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-xs font-bold text-white shadow-sm overflow-hidden ring-1 ring-primary/20">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover rounded-xl" />
                ) : (
                  getInitials(userName)
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {userRole.toLowerCase()}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl bg-card border-border shadow-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground leading-none">
                    {userName}
                  </p>
                  <Badge variant={getRoleVariant(userRole)} className="text-[10px] px-1.5 py-0">
                    {userRole}
                  </Badge>
                </div>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 text-xs cursor-pointer">
              <Link href="/perfil">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Meu Perfil & Foto</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Nível de Acesso: {userRole}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="gap-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Encerrar Sessão</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
