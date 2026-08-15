import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "UniFAP • Estoque & Multimídia | Centro Universitário Paraíso",
    template: "%s | UniFAP Suporte TI & Multimídia",
  },
  description:
    "Sistema Integrado de Gestão de Estoque, Patrimônio, Armário Físico, Empréstimos e Manutenções do Setor de Suporte de TI & Multimídia do Centro Universitário Paraíso (UniFAP).",
  keywords: ["UniFAP", "Centro Universitário Paraíso", "Estoque", "Suporte TI", "Multimídia", "Patrimônio", "Empréstimos", "Armário"],
  authors: [{ name: "Suporte de TI & Multimídia - UniFAP" }],
  icons: {
    icon: "/brand/logo-unifap-quadrada.png",
    apple: "/brand/logo-unifap-quadrada.png",
  },
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
