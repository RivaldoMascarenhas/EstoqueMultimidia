import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "UniFAP - Gestão de Estoque & TI",
    template: "%s | UniFAP Estoque & TI",
  },
  description:
    "Sistema oficial de controle de estoque, patrimônio, armário físico, empréstimos e manutenção do Suporte de TI e Multimídia da UniFAP.",
  keywords: ["UniFAP", "Estoque", "TI", "Multimídia", "Patrimônio", "Empréstimos", "Armário"],
  authors: [{ name: "Suporte TI UniFAP" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
