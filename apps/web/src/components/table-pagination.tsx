"use client";

import { sortTableRows, type TableSort, type TableSortValue } from '@/lib/table-sorting';
import { SortableTable } from './sortable-table';
import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";
import { num } from "@/lib/api";

export const DEFAULT_PAGE_SIZE = 50;

export function TablePagination({
  totalRows, pageIndex, pageSize, onPageChange, onPageSizeChange,
  label = "Table", noun = "records",
}: {
  totalRows: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label?: string;
  noun?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = totalRows ? pageIndex * pageSize + 1 : 0;
  const end = Math.min((pageIndex + 1) * pageSize, totalRows);
  return <nav className="table-footer" aria-label={`${label} pagination`}>
    <span role="status">{num(start)}–{num(end)} of {num(totalRows)} {totalRows === 1 ? noun.replace(/s$/, "") : noun}</span>
    <label className="select-field">
      <span className="sr-only">Rows per page</span>
      <select aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
        {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}
      </select>
    </label>
    <div>
      <span>Page {num(pageIndex + 1)} of {num(pageCount)}</span>
      <Button variant="outline" size="icon-sm" aria-label="First page" disabled={pageIndex === 0} onClick={() => onPageChange(0)}><ChevronsLeft size={16} /></Button>
      <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)}><ChevronLeft size={16} /></Button>
      <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageIndex + 1)}><ChevronRight size={16} /></Button>
      <Button variant="outline" size="icon-sm" aria-label="Last page" disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageCount - 1)}><ChevronsRight size={16} /></Button>
    </div>
  </nav>;
}

type PaginatedTableProps<T> = {
  rows: T[];
  label: string;
  headers: ReactNode;
  children: (row: T, index: number) => ReactNode;
  scope?: string;
  sortValue?: (row: T, column: number) => TableSortValue;
  noun?: string;
};

// A changed report scope starts a new page selection without changing its data.
export function PaginatedTable<T>(props: PaginatedTableProps<T>) {
  return <PaginatedTableBody key={props.scope} {...props} />;
}

function PaginatedTableBody<T>({ rows, label, headers, children, noun, sortValue }: PaginatedTableProps<T>) {
  const [requestedPage, setPage] = useState(0);
  const [sort, setSort] = useState<TableSort | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const page = Math.min(requestedPage, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const start = page * pageSize;
  // Data-backed tables sort the complete dataset, then create only the visible
  // React rows. Legacy tables retain their existing rendered-cell sorting.
  const ordered=useMemo(()=>sortValue&&sort?sortTableRows(rows,row=>sortValue(row,sort.column),sort.direction):rows,[rows,sort,sortValue]);
  const visible=sortValue?ordered.slice(start,start+pageSize):rows;
  return <>
    <div className="table-scroll">
      <SortableTable className="risk-table" aria-label={label} pageStart={sortValue?0:start} pageSize={pageSize} manualSorting={!!sortValue} sort={sortValue?sort:undefined} onSortChange={next=>{if(sortValue)setSort(next);setPage(0);}}>
        <thead><tr>{headers}</tr></thead>
        <tbody>{visible.map((row, index) => children(row, sortValue?start+index:index))}</tbody>
      </SortableTable>
    </div>
    <TablePagination label={label} noun={noun} totalRows={rows.length} pageIndex={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} />
  </>;
}
