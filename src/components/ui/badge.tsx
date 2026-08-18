import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline:
          "text-foreground border-border",
        // Status Semânticos
        normal:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        low:
          "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
        critical:
          "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400 animate-pulse",
        available:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        loaned:
          "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400",
        maintenance:
          "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-400",
        damaged:
          "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
        overdue:
          "border-rose-500/50 bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold",
        // Perfis de Acesso (RBAC)
        admin:
          "border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold",
        gestor:
          "border-blue-500/40 bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold",
        operador:
          "border-indigo-500/40 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold",
        consulta:
          "border-slate-500/40 bg-slate-500/20 text-slate-700 dark:text-slate-300",
        academic:
          "border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "normal" || variant === "available" || variant === "admin"
              ? "bg-emerald-500"
              : variant === "low"
              ? "bg-amber-500"
              : variant === "critical" || variant === "damaged" || variant === "overdue"
              ? "bg-rose-500"
              : variant === "loaned" || variant === "gestor"
              ? "bg-blue-500"
              : variant === "maintenance"
              ? "bg-purple-500"
              : "bg-primary"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
