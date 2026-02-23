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
  columns,
  onToggleColumn,
  totalItems,
  rowsPerPage,
}: DataListToolbarProps) {
  const [colMenu, setColMenu] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);

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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-slate-50/80 border-b border-slate-200">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Record count */}
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Showing <span className="font-bold text-slate-800">{Math.min(totalItems, rowsPerPage)}</span> of <span className="font-bold text-slate-800">{totalItems}</span>
          </span>
          {/* Column Selection */}
          <div className="relative" ref={colRef}>
            <button
              onClick={() => setColMenu(!colMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm shrink-0 transition-colors"
            >
              <SlidersHorizontal size={14} /> Columns
            </button>
            {colMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 max-h-64 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Show Columns</p>
                {columns.map((c) => (
                  <label key={c.id} className="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={c.visible}
                      onChange={() => onToggleColumn(c.id)}
                      className="mr-2 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-slate-700">{c.label}</span>
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
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{startItem}–{endItem} of {totalItems}</span>
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="border border-slate-200 rounded px-1.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 bg-white transition-colors"
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
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] h-7 flex items-center justify-center border rounded text-xs font-semibold transition-colors ${
                  currentPage === p
                    ? 'bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ),
          )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 bg-white transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
