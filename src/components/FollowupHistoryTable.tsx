import React, { useState } from 'react';
import { 
  History, 
  RotateCw, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import { FollowupHistoryItem, OrderItem, DateFilterType } from '../types';
import { formatActorUsernameId } from '../services/orderService';

export interface FollowupHistoryTableProps {
  title?: string;
  subtitle?: string;
  recordsCount: number;
  paginatedRecords: FollowupHistoryItem[];
  orders: OrderItem[];
  // Date filter (based on timestamp)
  dateFilter: DateFilterType;
  onDateFilterChange: (val: DateFilterType) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  // Updated by name filter
  updatedByNameFilter: string;
  onUpdatedByNameFilterChange: (val: string) => void;
  availableUpdatedByNames: string[];
  // Followup status filter
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  availableStatuses: string[];
  // Search with dropdown (matching orders table search design)
  searchType: string;
  onSearchTypeChange: (val: string) => void;
  searchValue: string;
  onSearchValueChange: (val: string) => void;
  onSearchEnter?: () => void;
  // Pagination
  page: number;
  onPageChange: (p: number | ((prev: number) => number)) => void;
  pageSize: number | 'all';
  onPageSizeChange: (size: number | 'all') => void;
  totalPages: number;
  // Actions
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExportCsv?: (data: FollowupHistoryItem[], filename: string) => void;
  onExportXlsx?: (data: FollowupHistoryItem[], filename: string) => void;
  allFilteredRecords?: FollowupHistoryItem[];
  onViewOrder: (order: OrderItem) => void;
  onUndoFollowup?: (historyId: string, orderId: string, previousStatus: string, updatedBy?: string) => void;
  onViewCustomer?: (customerId: string) => void;
}

export const FollowupHistoryTable: React.FC<FollowupHistoryTableProps> = ({
  title = 'Followup History & Audit Logs',
  subtitle = 'Universal customer followups filter by timestamp date, updated_by_name, and search fields.',
  recordsCount,
  paginatedRecords,
  orders,
  dateFilter,
  onDateFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  updatedByNameFilter,
  onUpdatedByNameFilterChange,
  availableUpdatedByNames,
  statusFilter,
  onStatusFilterChange,
  availableStatuses,
  searchType,
  onSearchTypeChange,
  searchValue,
  onSearchValueChange,
  onSearchEnter,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalPages,
  onRefresh,
  isRefreshing = false,
  onExportCsv,
  onExportXlsx,
  allFilteredRecords = [],
  onViewOrder,
  onUndoFollowup,
  onViewCustomer
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* 1. Filters & Search Control Card - Universal Compact Design */}
      <div className="bg-[#242936] rounded-2xl p-4 sm:p-5 border border-slate-700 shadow-xs text-white">
        {/* Filters Row - Same design as Orders Table */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timestamp Date Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white mb-1">
              Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value as DateFilterType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-600 bg-[#1a1e27] text-white font-medium focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 self-end pb-0.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    onStartDateChange('');
                    onEndDateChange('');
                  }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold px-1.5 py-1 cursor-pointer self-end pb-1.5 rounded hover:bg-rose-50"
                  title="Clear range"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Updated By Name Filter */}
          <div className="flex-1 min-w-[170px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              updated_by_name
            </label>
            <select
              value={updatedByNameFilter}
              onChange={(e) => onUpdatedByNameFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
            >
              <option key="fol-up-name-all" value="All">All Operators / Managers</option>
              {availableUpdatedByNames.map((name, nIdx) => (
                <option key={`fol-up-name-${name}-${nIdx}`} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Followup Status Filter */}
          <div className="min-w-[130px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              followup_status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
            >
              <option key="fol-st-all" value="all">All Statuses</option>
              {availableStatuses.map((s, idx) => (
                <option key={`fol-st-${s}-${idx}`} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Combined Search with Export button placed above search input border */}
          <div className="flex-2 min-w-[280px]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Search
              </label>
              {(onExportCsv || onExportXlsx) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>📥 Export</span>
                    {(allFilteredRecords?.length ?? 0) > 0 && (
                      <span className="text-[10px] bg-emerald-800 text-emerald-100 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                        {allFilteredRecords.length}
                      </span>
                    )}
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 w-60 text-slate-800">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                        <span>Filtered Logs</span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">{(allFilteredRecords?.length ?? 0)} records</span>
                      </div>
                      <div className="py-1 space-y-0.5">
                        {onExportCsv && (
                          <button
                            type="button"
                            onClick={() => {
                              const exportList = (allFilteredRecords && allFilteredRecords.length > 0) ? allFilteredRecords : paginatedRecords;
                              onExportCsv(exportList, `followup_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
                              setIsExportMenuOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-emerald-50 hover:text-emerald-800 rounded-lg font-medium cursor-pointer flex items-center justify-between"
                          >
                            <span className="flex items-center gap-1.5">📄 <span>Export All Filtered (CSV)</span></span>
                            <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{allFilteredRecords?.length ?? paginatedRecords.length}</span>
                          </button>
                        )}
                        {onExportXlsx && (
                          <button
                            type="button"
                            onClick={() => {
                              const exportList = (allFilteredRecords && allFilteredRecords.length > 0) ? allFilteredRecords : paginatedRecords;
                              onExportXlsx(exportList, `followup_audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
                              setIsExportMenuOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-emerald-50 hover:text-emerald-800 rounded-lg font-medium cursor-pointer flex items-center justify-between"
                          >
                            <span className="flex items-center gap-1.5">📊 <span>Export All Filtered (Excel)</span></span>
                            <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{allFilteredRecords?.length ?? paginatedRecords.length}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={searchType}
                onChange={(e) => onSearchTypeChange(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
              >
                <option value="order_id">order_id</option>
                <option value="customer_id">customer_id</option>
                <option value="customer_mobile">customer_mobile</option>
                <option value="customer_name">customer_name</option>
                <option value="user_name">user_name</option>
              </select>
              <input
                type="text"
                placeholder={`Search ${searchType}... (e.g. 1002)`}
                value={searchValue}
                onChange={(e) => onSearchValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onSearchEnter) {
                    onSearchEnter();
                  }
                }}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-100"
              />
              {searchValue.trim() && (
                <button
                  type="button"
                  onClick={() => onSearchValueChange('')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                  title="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Followup Data Table Card */}
      <div className="bg-[#242936] rounded-2xl border border-slate-700 shadow-xs overflow-hidden text-white">
        {/* Table Top Toolbar */}
        <div className="p-3 border-b border-slate-700 bg-[#1e2330] flex items-center justify-between text-white">
          <span className="text-xs font-bold text-white">
            Showing {recordsCount} followup record(s)
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-2 py-1 text-xs rounded border border-slate-600 bg-[#1a1e27] text-white font-medium focus:outline-hidden"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table Viewport */}
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse text-xs text-white">
            <thead>
              <tr className="bg-[#1e2330] text-white font-bold border-b border-slate-700 sticky top-0 z-10 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 whitespace-nowrap text-white">Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-white">Order ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-white">updated_by</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-white">action</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-white">status change</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-white bg-[#242936]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold">
                    No followup history records matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((hist, histIdx) => {
                  const targetOrder = orders.find(o => String(o.order_id || o.id) === String(hist.orderId));
                  
                  return (
                    <tr 
                      key={`fol-row-${hist.id || hist.followupId || histIdx}-${histIdx}`} 
                      className="transition-colors hover:bg-slate-800/60"
                    >
                      <td className="py-3 px-3.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {hist.timestamp}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => targetOrder && onViewOrder(targetOrder)}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-md font-mono font-bold text-xs border border-blue-500/30 transition-all cursor-pointer"
                        >
                          #{hist.orderId}
                        </button>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-blue-300 whitespace-nowrap font-bold">
                        {formatActorUsernameId(hist.updatedByName, hist.updatedBy)}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-purple-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] uppercase">
                          {hist.action || 'Followup'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-xs text-[#E2E8F0]">
                        <div className="max-w-[300px] truncate" title={hist.notes}>
                          {hist.notes || `Order #${hist.orderId} status changed`}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => targetOrder && onViewOrder(targetOrder)}
                            className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors cursor-pointer"
                            title="View Order Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {onUndoFollowup && !hist.isUndone && (
                            <button
                              type="button"
                              onClick={() => onUndoFollowup(String(hist.id || hist.followupId), String(hist.orderId), hist.previousStatus || 'Pending', hist.updatedBy)}
                              className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Undo/Revert Status"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Bottom Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({recordsCount} total records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(1)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
              >
                « First
              </button>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-indigo-600 text-white font-bold rounded shadow-xs">
                {page}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
              >
                Next
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(totalPages)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors"
              >
                Last »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
