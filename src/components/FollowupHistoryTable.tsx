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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        {/* Filters Row - Same design as Orders Table */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timestamp Date Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Date
            </label>
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value as DateFilterType)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
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
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-1 w-24">
                      {onExportCsv && (
                        <button
                          type="button"
                          onClick={() => {
                            onExportCsv(allFilteredRecords, 'followup_audit_logs.csv');
                            setIsExportMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 rounded text-slate-700 font-medium cursor-pointer"
                        >
                          CSV
                        </button>
                      )}
                      {onExportXlsx && (
                        <button
                          type="button"
                          onClick={() => {
                            onExportXlsx(allFilteredRecords, 'followup_audit_logs.xlsx');
                            setIsExportMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 rounded text-slate-700 font-medium cursor-pointer"
                        >
                          XLSX
                        </button>
                      )}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-slate-700">
          <span className="text-xs font-bold">
            Showing {recordsCount} followup record(s)
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-2 py-1 text-xs rounded border border-slate-300 bg-white font-medium"
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
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 whitespace-nowrap">Order ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Customer Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Previous Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap">New Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Order Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Order Value</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Schedule</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Updated By</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Updated By Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-purple-700">Action Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Remarks / Notes</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400 font-semibold">
                    No followup history records matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((hist, histIdx) => {
                  return (
                    <tr 
                      key={`fol-row-${hist.id || hist.followupId || histIdx}-${histIdx}`} 
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const ord = orders.find((o) => String(o.order_id || o.id) === String(hist.orderId));
                            if (ord) onViewOrder(ord);
                          }}
                          className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Click to view full order details & journey"
                        >
                          <span>#{hist.orderId}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400" />
                        </button>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {hist.timestamp}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap font-medium">
                        {onViewCustomer ? (
                          <button
                            type="button"
                            onClick={() => {
                              const ord = orders.find((o) => String(o.order_id || o.id) === String(hist.orderId));
                              const cId = ord ? String(ord.customer_id || ord.customerId || '') : '';
                              if (cId) {
                                onViewCustomer(cId);
                              } else if (hist.customerContact) {
                                onViewCustomer(hist.customerContact);
                              }
                            }}
                            className="hover:underline text-slate-900 hover:text-indigo-600 font-bold cursor-pointer text-left"
                            title="Click to view Customer 360 profile"
                          >
                            {hist.customerName || '-'}
                          </button>
                        ) : (
                          hist.customerName || '-'
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {hist.customerContact || '-'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {hist.previousStatus || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {hist.newStatus || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {hist.orderStatus || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                         {(Number(hist.orderValue) || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-[11px] text-slate-600 whitespace-nowrap">
                        {hist.scheduledTime ? `${hist.scheduleDate || ''} (${hist.scheduledTime})` : (hist.scheduleDate || '-')}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {(() => {
                          const val = String(hist.updatedBy || '').replace(/\s*\([^)]*\)/g, '').trim();
                          if (val === '1' || val.toLowerCase() === 'manager') return 'Manager';
                          return val || '-';
                        })()}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {(() => {
                          const name = hist.updatedByName || hist.updatedBy || '';
                          const clean = String(name).replace(/\s*\([^)]*\)/g, '').trim();
                          if (clean === '1' || clean.toLowerCase() === 'manager') return 'Manager';
                          return clean || '-';
                        })()}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-purple-700 whitespace-nowrap">
                        {hist.action || 'Followup'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={hist.notes}>
                        {hist.notes || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const ord = orders.find((o) => String(o.order_id || o.id) === String(hist.orderId));
                              if (ord) onViewOrder(ord);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                          >
                            View Order
                          </button>
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
