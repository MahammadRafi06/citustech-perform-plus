"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { useUrlState } from "@/hooks/workspace-state";
import {
  ArrowDownToLine,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Inbox,
  Info,
} from "lucide-react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { label, num } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Status({ value }: { value: string }) {
  if (
    ["High", "Medium", "Low", "Strong", "Moderate", "Limited"].includes(value)
  )
    return <span className="evidence-level">{value}</span>;
  return <span className="status">{label(value)}</span>;
}
export function Avatar({
  name,
  id,
  size = "",
}: {
  name: string;
  id?: string;
  size?: string;
}) {
  return (
    <span className={cn("member-avatar", size)}>
      {name
        ?.split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("") || "CT"}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Metric({
  label: heading,
  value,
  note,
  icon,
  accent = "blue",
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="metric"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="metric-top">
        <span>{heading}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">
        {note}
        {onClick && <ArrowRight size={14} />}
      </div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "Try adjusting your filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <Info size={16} />
      <span>{children}</span>
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const captureFocus = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const restoreFocus = (event: Event) => {
    if (
      opener.current?.isConnected &&
      !document.querySelector('[role="dialog"][data-state="open"]')
    ) {
      event.preventDefault();
      opener.current.focus();
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={captureFocus}
        onCloseAutoFocus={restoreFocus}
        className={cn("app-modal", className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || "Review the details below."}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const captureFocus = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const restoreFocus = (event: Event) => {
    if (
      opener.current?.isConnected &&
      !document.querySelector('[role="dialog"][data-state="open"]')
    ) {
      event.preventDefault();
      opener.current.focus();
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={captureFocus}
        onCloseAutoFocus={restoreFocus}
        className="app-drawer"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description || "Record details"}</SheetDescription>
        </SheetHeader>
        <div className="drawer-body">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
export function DataGrid<T extends { id: string }>({
  rows,
  columns,
  onRow,
  searchLabel = "Search records...",
  toolbar,
  exportAction,
  pageSize: initialPageSize = 25,
  defaultSearch = "",
  stateKey = "grid",
  selectedIds = [],
}: {
  rows: T[];
  columns: ColumnDef<T, unknown>[];
  onRow?: (r: T) => void;
  searchLabel?: string;
  toolbar?: React.ReactNode;
  exportAction?: (rows: T[]) => void;
  pageSize?: number;
  defaultSearch?: string;
  stateKey?: string;
  selectedIds?: string[];
}) {
  const [pageSize, setPageSize] = useUrlState(
    `${stateKey}_size`,
    initialPageSize,
  );
  const [density, setDensity] = useUrlState(
    `${stateKey}_density`,
    "comfortable",
  );
  const [globalFilter, setGlobalFilter] = useUrlState(
    `${stateKey}_q`,
    defaultSearch,
  );
  const [sorting, setSorting] = useUrlState<SortingState>(
    `${stateKey}_sort`,
    [],
  );
  const [pageIndex, setPageIndex] = useUrlState(`${stateKey}_page`, 0);
  const data = useMemo(() => rows, [rows]);
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination: { pageIndex: Math.max(0, pageIndex), pageSize },
    },
    onPaginationChange: (update) => {
      const next =
        typeof update === "function" ? update({ pageIndex, pageSize }) : update;
      setPageIndex(next.pageIndex);
    },
    autoResetPageIndex: false,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });
  useEffect(() => {
    if (pageIndex >= Math.max(table.getPageCount(), 1)) setPageIndex(0);
  }, [pageIndex, table.getPageCount()]);
  return (
    <div className={`data-grid density-${density}`}>
      <div className="table-tools">
        <div className="search-field">
          <Search size={16} />
          <Input
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPageIndex(0);
            }}
          />
        </div>
        <div className="table-tool-actions">
          {toolbar}
          <SelectField
            label="Row density"
            value={density}
            onChange={setDensity}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalFilter("")}
            >
              Clear
            </Button>
          )}
          {exportAction && (
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getFilteredRowModel().rows.length}
              onClick={() =>
                exportAction?.(
                  table.getFilteredRowModel().rows.map((r) => r.original),
                )
              }
            >
              <ArrowDownToLine size={14} />
              Export
            </Button>
          )}
        </div>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label={searchLabel.replace(/[…\.]+$/, "") + " table"}
        tabIndex={0}
      >
        <table>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id}>
                    {h.column.getCanSort() ? (
                      <button
                        onClick={h.column.getToggleSortingHandler()}
                        className={h.column.getCanSort() ? "sortable" : ""}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc"
                          ? " ↑"
                          : h.column.getIsSorted() === "desc"
                            ? " ↓"
                            : ""}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr
                key={r.id}
                className={`${onRow ? "clickable-row" : ""} ${selectedIds.includes(r.original.id) ? "row-selected" : ""}`}
                onClick={() => onRow?.(r.original)}
                tabIndex={onRow ? 0 : undefined}
                onKeyDown={(e) => {
                  if (
                    onRow &&
                    e.target === e.currentTarget &&
                    e.key === "Enter"
                  )
                    onRow(r.original);
                }}
              >
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!table.getRowModel().rows.length && (
        <Empty title="No matching records" />
      )}
      <div className="table-footer">
        <span>{num(table.getFilteredRowModel().rows.length)} records</span>
        <SelectField
          label="Rows per page"
          value={String(pageSize)}
          onChange={(v) => {
            setPageSize(Number(v));
            setPageIndex(0);
          }}
          options={[25, 50, 100].map((v) => ({
            value: String(v),
            label: `${v} / page`,
          }))}
        />
        <div>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
export function SelectField({
  value,
  onChange,
  options,
  label: heading,
  showLabel = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  showLabel?: boolean;
}) {
  return (
    <label className={cn("select-field", showLabel && "labeled")}>
      <span className={showLabel ? "select-label" : "sr-only"}>{heading}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={heading}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
