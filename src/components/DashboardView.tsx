import React, { useState, useMemo } from 'react';
import { AgentUser, OrderItem, DateFilterType, FollowupHistoryItem } from '../types';
import { RotateCw, CheckCircle2, Clock, Award, Layers, Calendar, XCircle } from 'lucide-react';

interface DashboardViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  followupHistory?: FollowupHistoryItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentAgent,
  orders,
  followupHistory = [],
  onRefresh,
  isRefreshing
}) => {
  // Single Unified Date Filter for Performance
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const matchDate = (dateVal: string, filterType: DateFilterType, startDateVal: string, endDateVal: string): boolean => {
    if (!dateVal || filterType === 'all' || !filterType) return true;
    const targetDate = new Date(dateVal.split(' ')[0]);
    if (isNaN(targetDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetTime = targetDate.setHours(0, 0, 0, 0);

    if (filterType === 'today') return targetTime === today.getTime();
    if (filterType === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      return targetTime === yest.getTime();
    }
    if (filterType === 'last7') {
      const limit = new Date(today);
      limit.setDate(today.getDate() - 6);
      return targetTime >= limit.getTime() && targetTime <= today.getTime();
    }
    if (filterType === 'last30') {
      const limit = new Date(today);
      limit.setDate(today.getDate() - 29);
      return targetTime >= limit.getTime() && targetTime <= today.getTime();
    }
    if (filterType === 'thisMonth') {
      return targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear();
    }
    if (filterType === 'lastMonth') {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return targetDate.getMonth() === lm.getMonth() && targetDate.getFullYear() === lm.getFullYear();
    }
    if (filterType === 'lastYear') {
      return targetDate.getFullYear() === today.getFullYear() - 1;
    }
    if (filterType === 'custom') {
      if (!startDateVal || !endDateVal) return true;
      const s = new Date(startDateVal).getTime();
      const e = new Date(endDateVal).getTime();
      return targetTime >= s && targetTime <= e;
    }
    return true;
  };

  // STRICTLY filter only for this agent
  const myAgentOrders = useMemo(() => {
    return orders.filter(
      (o) => o.agentId.toLowerCase() === currentAgent.user.toLowerCase()
    );
  }, [orders, currentAgent.user]);

  // Helper map for latest Delivered Date and Cancelled Date from followup history or order item
  const orderDeliveredDateMap = useMemo(() => {
    const map = new Map<string, string>();
    myAgentOrders.forEach(o => {
      if (o.deliveredDate) map.set(String(o.id), o.deliveredDate);
    });
    followupHistory.forEach(h => {
      if (h.newStatus?.toLowerCase() === 'delivered' && h.timestamp) {
        map.set(String(h.orderId), h.timestamp);
      }
    });
    return map;
  }, [myAgentOrders, followupHistory]);

  const orderCancelledDateMap = useMemo(() => {
    const map = new Map<string, string>();
    myAgentOrders.forEach(o => {
      if (o.cancelledDate) map.set(String(o.id), o.cancelledDate);
    });
    followupHistory.forEach(h => {
      if (h.newStatus?.toLowerCase() === 'cancelled' && h.timestamp) {
        map.set(String(h.orderId), h.timestamp);
      }
    });
    return map;
  }, [myAgentOrders, followupHistory]);

  const stats = useMemo(() => {
    let totalCreated = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let openCount = 0;
    let totalVal = 0;
    let deliveredVal = 0;
    let deliveredProfit = 0;

    const channelMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};

    myAgentOrders.forEach((o) => {
      const val = Number(o.orderValue) || 0;
      const profit = Number(o.profit) || 0;
      const fStatus = (o.followupStatus || '').toLowerCase();
      const delivDate = orderDeliveredDateMap.get(String(o.id)) || o.deliveredDate || '';
      const cancDate = orderCancelledDateMap.get(String(o.id)) || o.cancelledDate || '';

      // 1. Create Orders count & Total Order Value (Filtered by Create Date)
      if (matchDate(o.createDate, dateFilter, startDate, endDate)) {
        totalCreated++;
        totalVal += val;
        channelMap[o.orderChannel] = (channelMap[o.orderChannel] || 0) + 1;
        categoryMap[o.productCategory] = (categoryMap[o.productCategory] || 0) + 1;
      }

      // 2. Delivered Orders, Delivered Value, Delivered Profit (Filtered by Delivered Date)
      if (fStatus === 'delivered' || delivDate) {
        if (matchDate(delivDate || o.createDate, dateFilter, startDate, endDate)) {
          deliveredCount++;
          deliveredVal += val;
          deliveredProfit += profit;
        }
      }

      // 3. Cancelled Orders (Filtered by Cancelled Date)
      if (fStatus === 'cancelled' || cancDate) {
        if (matchDate(cancDate || o.createDate, dateFilter, startDate, endDate)) {
          cancelledCount++;
        }
      }

      // 4. Open Orders (Followup Status not in Delivered, Cancelled)
      if (fStatus !== 'delivered' && fStatus !== 'cancelled') {
        if (matchDate(o.createDate, dateFilter, startDate, endDate)) {
          openCount++;
        }
      }
    });

    const deliveryRate = totalCreated > 0 ? Math.round((deliveredCount / totalCreated) * 100) : 0;
    const cancelledRate = totalCreated > 0 ? Math.round((cancelledCount / totalCreated) * 100) : 0;
    
    // Bucket Size: Distinct customers
    const bucketSize = new Set(myAgentOrders.map(o => o.customerContact)).size;
    
    // NR Ratio = Profit / Delivered Value * 100
    const nrRatio = deliveredVal > 0 ? Number(((deliveredProfit / deliveredVal) * 100).toFixed(1)) : 0;

    return {
      totalCreated,
      deliveredCount,
      cancelledCount,
      openCount,
      totalVal,
      deliveredVal,
      deliveredProfit,
      deliveryRate,
      cancelledRate,
      bucketSize,
      nrRatio,
      channelMap,
      categoryMap
    };
  }, [myAgentOrders, dateFilter, startDate, endDate, orderDeliveredDateMap, orderCancelledDateMap]);

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Single Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personal performance and profit analytics for <span className="font-semibold text-blue-700">{currentAgent.user}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Unified Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-hidden focus:border-blue-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          )}

          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-70 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Core Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Row 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Create Orders</span>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">{stats.totalCreated}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Served Orders</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.deliveredCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Cancelled</span>
          <div className="text-2xl font-extrabold text-red-700 mt-1">{stats.cancelledCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Open Orders</span>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.openCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Open Order Val</span>
          <div className="text-xl font-bold text-slate-800 mt-1">৳ {(stats.totalVal - stats.deliveredVal - 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Order Value</span>
          <div className="text-xl font-bold text-slate-800 mt-1">৳ {stats.totalVal.toLocaleString()}</div>
        </div>

        {/* Row 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Deliv. Order Val</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">৳ {stats.deliveredVal.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Profit</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">৳ {stats.deliveredProfit.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Bucket Size</span>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats.bucketSize}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">NR Ratio</span>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats.nrRatio}%</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Deliv. Ratio</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.deliveryRate}%</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Cancelled Ratio</span>
          <div className="text-2xl font-extrabold text-red-700 mt-1">{stats.cancelledRate}%</div>
        </div>
      </div>

      {/* Channel and Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Orders by Channel</h3>
            <span className="text-[11px] text-slate-400">{Object.keys(stats.channelMap).length} Channels</span>
          </div>

          <div className="space-y-3">
            {Object.keys(stats.channelMap).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders match filter.</p>
            ) : (
              Object.entries(stats.channelMap).map(([ch, count]) => {
                const percentage = stats.totalCreated > 0 ? Math.round((count / stats.totalCreated) * 100) : 0;
                return (
                  <div key={ch} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800">{ch}</span>
                      <span className="text-slate-500 font-semibold">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Orders by Category</h3>
            <span className="text-[11px] text-slate-400">{Object.keys(stats.categoryMap).length} Categories</span>
          </div>

          <div className="space-y-3">
            {Object.keys(stats.categoryMap).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders match filter.</p>
            ) : (
              Object.entries(stats.categoryMap).map(([cat, count]) => {
                const percentage = stats.totalCreated > 0 ? Math.round((count / stats.totalCreated) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800">{cat}</span>
                      <span className="text-slate-500 font-semibold">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
