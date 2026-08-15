"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [hasOverflow, setHasOverflow] = React.useState(false);
    const stateRef = React.useRef({
      isDown: false,
      startX: 0,
      scrollLeft: 0,
      hasMoved: false,
    });

    // Detectar se a tabela tem overflow horizontal
    React.useEffect(() => {
      const checkOverflow = () => {
        if (containerRef.current) {
          const el = containerRef.current;
          setHasOverflow(el.scrollWidth > el.clientWidth);
        }
      };

      checkOverflow();
      window.addEventListener("resize", checkOverflow);
      return () => window.removeEventListener("resize", checkOverflow);
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignorar se o clique foi em um botão, input, select, link ou elemento interativo
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("select") ||
        target.closest("textarea") ||
        target.closest("[role='menuitem']") ||
        target.closest("[data-state]") ||
        target.closest(".no-drag")
      ) {
        return;
      }

      if (!containerRef.current) return;
      stateRef.current.isDown = true;
      stateRef.current.hasMoved = false;
      stateRef.current.startX = e.pageX - containerRef.current.offsetLeft;
      stateRef.current.scrollLeft = containerRef.current.scrollLeft;
    };

    const handleMouseLeave = () => {
      stateRef.current.isDown = false;
      setIsDragging(false);
    };

    const handleMouseUp = () => {
      stateRef.current.isDown = false;
      setTimeout(() => setIsDragging(false), 50);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!stateRef.current.isDown || !containerRef.current) return;
      const x = e.pageX - containerRef.current.offsetLeft;
      const walk = (x - stateRef.current.startX) * 1.5;

      if (Math.abs(walk) > 4) {
        stateRef.current.hasMoved = true;
        setIsDragging(true);
        containerRef.current.scrollLeft = stateRef.current.scrollLeft - walk;
      }
    };

    return (
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "relative w-full overflow-x-auto rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm transition-all select-none scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30",
          hasOverflow ? "cursor-grab active:cursor-grabbing" : "",
          isDragging ? "cursor-grabbing" : "",
          containerClassName
        )}
      >
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    );
  }
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-muted/40 text-muted-foreground border-b border-border/80 text-xs font-semibold uppercase tracking-wider",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border/50 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
