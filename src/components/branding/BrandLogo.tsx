"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  variant?: "default" | "white" | "square" | "square-white";
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  variant = "default",
  width,
  height,
  className,
  priority = false,
}: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);

  const assetMap = {
    default: {
      src: "/branding/unifap-logo.svg",
      defaultW: 220,
      defaultH: 60,
      aspect: "h-11 w-auto object-contain",
    },
    white: {
      src: "/branding/unifap-logo-white.svg",
      defaultW: 220,
      defaultH: 60,
      aspect: "h-11 w-auto object-contain",
    },
    square: {
      src: "/branding/unifap-logo-square.svg",
      defaultW: 56,
      defaultH: 56,
      aspect: "w-11 h-11 object-contain",
    },
    "square-white": {
      src: "/branding/unifap-logo-square.svg",
      defaultW: 56,
      defaultH: 56,
      aspect: "w-11 h-11 object-contain",
    },
  };

  const current = assetMap[variant] || assetMap.default;
  const w = width || current.defaultW;
  const h = height || current.defaultH;

  if (hasError) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center font-black tracking-tight rounded-xl px-3.5 py-2 border select-none",
          variant === "white" || variant === "square-white"
            ? "text-white border-white/20 bg-white/10"
            : "text-[#002B49] border-slate-200 bg-white shadow-sm",
          className
        )}
      >
        <span className="text-sm font-extrabold tracking-tight">
          Uni<span className="text-[#EAA023]">FAP</span>
        </span>
        <span className="text-[10px] uppercase font-bold ml-1.5 opacity-70">
          Sorteios
        </span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center justify-center shrink-0", className)}>
      <Image
        src={current.src}
        alt="UniFAP — Centro Universitário Paraíso"
        width={w}
        height={h}
        priority={priority}
        onError={() => {
          setHasError(true);
        }}
        className={current.aspect}
      />
    </div>
  );
}
