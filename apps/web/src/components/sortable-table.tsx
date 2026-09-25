"use client";

import { Children, Fragment, cloneElement, isValidElement, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { sortTableRows, type TableSort, type TableSortDirection, type TableSortValue } from '@/lib/table-sorting';

type NodeProps = { children?: ReactNode; colSpan?: number; className?: string; value?: TableSortValue; 'data-sort-value'?: TableSortValue; 'data-sortable'?: boolean; 'aria-hidden'?: boolean | 'true'; };
type Element = ReactElement<NodeProps>;
function elements(nodes: ReactNode): Element[] {
  return Children.toArray(nodes).flatMap(node => isValidElement<NodeProps>(node) ? node.type === Fragment ? elements(node.props.children) : [node] : []);
}
function nodeText(node: ReactNode, primary = false): string {
  return Children.toArray(node).map(item => {
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (!isValidElement<NodeProps>(item) || item.props['aria-hidden'] || item.type === 'svg' || primary && item.type === 'small') return '';
    if (item.props.children != null) return nodeText(item.props.children, primary);
    return item.props.value == null ? '' : String(item.props.value);
  }).join(' ').replace(/\s+/g, ' ').trim();
}
function cellValue(cell: Element): TableSortValue {
  if (Object.hasOwn(cell.props, 'data-sort-value')) return cell.props['data-sort-value'];
  return nodeText(cell.props.children, true) || nodeText(cell.props.children);
}
function rowValue(row: Element, index: number): TableSortValue {
  let offset = 0;
  for (const cell of elements(row.props.children)) {
    const span = cell.props.colSpan || 1;
    if (index >= offset && index < offset + span) return span > 1 ? null : cellValue(cell);
    offset += span;
  }
  return null;
}

export function ColumnSortButton({ children, direction, onClick }: { children: ReactNode; direction?: TableSortDirection | false; onClick: () => void }) {
  return <button type="button" className="column-sort-button" onClick={onClick} title={`Sort ${direction === 'asc' ? 'descending' : 'ascending'}`}>
    <span>{children}</span><svg className="column-sort-arrows" width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" focusable="false">
      <path className={direction === 'asc' ? 'active' : undefined} d="M3 6 6 3 9 6"/>
      <path className={direction === 'desc' ? 'active' : undefined} d="m3 10 3 3 3-3"/>
    </svg>
  </button>;
}

type SortableTableProps = ComponentProps<'table'> & {
  pageStart?: number; pageSize?: number; onSortChange?: (sort: TableSort) => void;
  sort?: TableSort | null; manualSorting?: boolean;
};

// Sort React rows before pagination. Keeping row keys and handlers intact preserves
// selections, evidence drawers and editable fields without mutating the DOM.
export function SortableTable({ children, pageStart = 0, pageSize, onSortChange, sort: controlledSort, manualSorting = false, style, ...props }: SortableTableProps) {
  const [localSort, setSort] = useState<TableSort | null>(null);
  const sort = controlledSort === undefined ? localSort : controlledSort;
  const toggle = (column: number) => {
    const next: TableSort = { column, direction: sort?.column === column && sort.direction === 'asc' ? 'desc' : 'asc' };
    setSort(next); onSortChange?.(next);
  };
  const parts = elements(children).map(part => {
    if (part.type === 'thead') return cloneElement(part, {}, elements(part.props.children).map(row => {
      let index = 0;
      return cloneElement(row, {}, elements(row.props.children).map(cell => {
        const column = index; index += cell.props.colSpan || 1;
        const title = nodeText(cell.props.children);
        const sortable = cell.props['data-sortable'] !== false && !!title && !/^(select|actions?|details|inspect)$/i.test(title) && (cell.props.colSpan || 1) === 1;
        if (!sortable) return cell;
        const direction = sort?.column === column ? sort.direction : undefined;
        return cloneElement(cell as ReactElement<ComponentProps<'th'>>, { scope: 'col', 'aria-sort': direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none' },
          <ColumnSortButton direction={direction} onClick={() => toggle(column)}>{cell.props.children}</ColumnSortButton>);
      }));
    }));
    if (part.type === 'tbody') {
      const rows = elements(part.props.children);
      const ordered = sort && !manualSorting ? sortTableRows(rows, row => rowValue(row, sort.column), sort.direction) : rows;
      return cloneElement(part, {}, pageSize == null ? ordered : ordered.slice(pageStart, pageStart + pageSize));
    }
    return part;
  });
  return <table {...props} data-sortable-table style={{...style, width:style?.width||"100%", tableLayout:"fixed"}}>{parts}</table>;
}
