import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
}

interface DataListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Hide the search input — useful when the section has no searchable data. */
  hideSearch?: boolean;
  columns: ColumnDef[];
  onToggleColumn: (id: string) => void;
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function DataListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  hideSearch = false,
  columns,
  onToggleColumn,
  totalItems,
  currentPage,
  rowsPerPage,
}: DataListToolbarProps) {
  const [colMenu, setColMenu] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);
  const shownItems = totalItems === 0 ? 0 : endItem - startItem + 1;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colRef.current && !colRef.current.contains(e.target as Node)) setColMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);



  return (
    <>
      {/* Toolbar */}
      <div className={`flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-b from-slate-50/95 to-white px-4 py-3.5 sm:flex-row sm:items-center ${hideSearch ? 'sm:justify-end' : 'sm:justify-between'}`}>
        {/* Search */}
        {!hideSearch && (
          <div className="relative w-full sm:w-[23rem]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {/* Record count */}
          <span className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
            Showing <span className="font-bold text-slate-800">{shownItems}</span> of <span className="font-bold text-slate-800">{totalItems}</span>
          </span>
          {/* Column Selection */}
          <div className="relative" ref={colRef}>
            <button
              onClick={() => setColMenu(!colMenu)}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              <SlidersHorizontal size={14} /> Columns
            </button>
            {colMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <div className="mb-1 flex items-center justify-between px-2 py-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Show Columns</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {columns.filter((c) => c.visible).length}/{columns.length}
                  </span>
                </div>
                {columns.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={c.visible}
                      onChange={() => onToggleColumn(c.id)}
                      className="mr-2 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="font-medium text-slate-700">{c.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}

export function PaginationBar({
  totalItems,
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3.5 sm:flex-row">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="font-medium">{startItem}-{endItem} of {totalItems}</span>
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            if (totalPages <= 5) return true;
            if (p === 1 || p === totalPages) return true;
            return Math.abs(p - currentPage) <= 1;
          })
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">...</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
                  currentPage === p
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ),
          )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
