"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeDisplay({ value, size = 180, className = "" }: QrCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    QRCode.toDataURL(value, {
      width: size,
      margin: 1.5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Erro ao gerar QR Code:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (isLoading) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-2xl bg-white p-4 shadow-sm border border-slate-200 ${className}`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-2xl bg-muted p-4 text-xs text-muted-foreground ${className}`}
      >
        Erro ao gerar QR
      </div>
    );
  }

  return (
    <div className={`inline-block rounded-2xl bg-white p-3 shadow-md border border-slate-200/80 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR Code para ${value}`}
        width={size}
        height={size}
        className="block rounded-lg"
      />
    </div>
  );
}
