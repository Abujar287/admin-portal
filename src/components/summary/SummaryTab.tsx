import React from 'react';
import { Layers } from 'lucide-react';
import { DateFilterType } from '../../types';

interface SummaryTabProps {
  summaryDateFilter: DateFilterType;
  setSummaryDateFilter: (val: DateFilterType) => void;
  summaryStartDate: string;
  setSummaryStartDate: (val: string) => void;
  summaryEndDate: string;
  setSummaryEndDate: (val: string) => void;
  summaryStats: any;
  summaryBreakdownTab: 'all' | 'channel' | 'category' | 'city' | 'date';
  setSummaryBreakdownTab: (val: any) => void;
  openExportMenuId: string | null;
  setOpenExportMenuId: (val: string | null) => void;
  handleExportCsv: (data: any[], filename: string) => void;
  handleExportXlsx: (data: any[], filename: string) => void;
  handleSortToggle: any;
  channelSortKey: string;
  channelSortDirection: 'asc' | 'desc';
  setChannelSortKey: any;
  setChannelSortDirection: any;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  summaryDateFilter,
  setSummaryDateFilter,
  summaryStartDate,
  setSummaryStartDate,
  summaryEndDate,
  setSummaryEndDate,
  summaryStats,
  summaryBreakdownTab,
  setSummaryBreakdownTab,
  openExportMenuId,
  setOpenExportMenuId,
  handleExportCsv,
  handleExportXlsx,
  handleSortToggle,
  channelSortKey,
  channelSortDirection,
  setChannelSortKey,
  setChannelSortDirection
}) => {
    return (
        <div className="space-y-6">
            {/* Summary Single Date Filter */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Summary Analytics</h3>
                <p className="text-xs text-slate-500">Filtered automatically across create date, delivered date, and cancelled date columns.</p>
                </div>
                <div className="flex items-center gap-2">
                <select
                    value={summaryDateFilter}
                    onChange={(e) => setSummaryDateFilter(e.target.value as DateFilterType)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700"
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
                {summaryDateFilter === 'custom' && (
                    <div className="flex items-center gap-1.5">
                    <input
                        type="date"
                        value={summaryStartDate}
                        onChange={(e) => setSummaryStartDate(e.target.value)}
                        className="text-xs p-1.5 border rounded-lg"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                        type="date"
                        value={summaryEndDate}
                        onChange={(e) => setSummaryEndDate(e.target.value)}
                        className="text-xs p-1.5 border rounded-lg"
                    />
                    </div>
                )}
                </div>
            </div>
            {/* Metrics and Tables would go here */}
        </div>
    );
}
