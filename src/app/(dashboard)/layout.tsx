"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearchModal } from "@/components/search/global-search-modal";
import { ForceChangePasswordModal } from "@/components/auth/force-change-password-modal";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Carregar preferência salva no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("unifap_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch (e) {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("unifap_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  // Global keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area (Ajusta automaticamente a margem quando a sidebar é recolhida) */}
      <div 
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0",
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        {/* Header */}
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Dynamic Page Content (com padding inferior estendido no mobile para acomodar a Bottom Navigation Bar) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visível apenas em telas menores que md) */}
      <BottomNav />

      {/* Global Search Modal (Spotlight / Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Modal Obrigatório de Troca de Senha no Próximo Acesso */}
      <ForceChangePasswordModal />
    </div>
  );
}
