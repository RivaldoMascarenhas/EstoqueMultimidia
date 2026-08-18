"use client";

import React from "react";
import { ThemeProvider } from "./theme-provider";
import { SessionProvider } from "./session-provider";
import { LogoutProvider } from "@/components/auth/logout-provider";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LogoutProvider>
          {children}
        </LogoutProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            className: "border font-sans shadow-lg",
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
