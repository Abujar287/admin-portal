import React, { useState, useMemo } from 'react';
import { AgentUser, OrderItem, DateFilterType, FollowupHistoryItem } from '../types';
import {
  BarChart2,
  Calendar,
  Layers,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  TrendingUp,
  MapPin,
  Tag
} from 'lucide-react';

interface AgentSummaryViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  followupHistory?: FollowupHistoryItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export const AgentSummaryView: React.FC<AgentSummaryViewProps> = ({
  currentAgent,
  orders,
  followupHistory = [],
  onRefresh,
  isRefreshing
}) => {
  // Single Unified Date Filter
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [breakdownTab, setBreakdownTab] = useState<'channel' | 'category' | 'city' | 'status'>('channel');

  // Helper date checker
  const matchDate = (dateVal: string, filterType: DateFilterType, startVal: string, endVal: string): boolean => {
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
      if (!startVal || !endVal) return true;
      const s = new Date(startVal).getTime();
      const e = new Date(endVal).getTime();
      return targetTime >= s && targetTime <= e;
    }
    return true;
  };

  // Maps for delivered and cancelled dates
  const orderDeliveredDateMap = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.delivered_date) map.set(String(o.id || o.order_id), o.delivered_date);
    });
    followupHistory.forEach((h) => {
      if (!h.isUndone && (h.newStatus || '').toLowerCase() === 'delivered' && h.timestamp) {
        map.set(String(h.orderId || (h as any).order_id), h.timestamp);
      }
    });
    return map;
  }, [orders, followupHistory]);

  const orderCancelledDateMap = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.cancelled_date) map.set(String(o.id || o.order_id), o.cancelled_date);
    });
    followupHistory.forEach((h) => {
      if (!h.isUndone && (h.newStatus || '').toLowerCase() === 'cancelled' && h.timestamp) {
        map.set(String(h.orderId || (h as any).order_id), h.timestamp);
      }
    });
    return map;
  }, [orders, followupHistory]);

  // Aggregate stats
  const stats = useMemo(() => {
    let createdCount = 0;
    let totalOrderValue = 0;
    let deliveredCount = 0;
    let deliveredValue = 0;
    let cancelledCount = 0;
    let cancelledValue = 0;
    let openCount = 0;
    let openValue = 0;

    const channelMap: Record<string, { total: number; delivered: number; cancelled: number; value: number }> = {};
    const categoryMap: Record<string, { total: number; delivered: number; cancelled: number; value: number }> = {};
    const cityMap: Record<string, { total: number; delivered: number; cancelled: number; value: number }> = {};
    const statusMap: Record<string, { count: number; value: number }> = {};

    orders.forEach((o) => {
      const oid = String(o.id || o.order_id);
      const cDate = o.create_date || o.createDate || o.createdAt || '';
      const dDate = orderDeliveredDateMap.get(oid) || '';
      const canDate = orderCancelledDateMap.get(oid) || '';

      const matchCreated = matchDate(cDate, dateFilter, startDate, endDate);
      const matchDelivered = dDate ? matchDate(dDate, dateFilter, startDate, endDate) : false;
      const matchCancelled = canDate ? matchDate(canDate, dateFilter, startDate, endDate) : false;

      const st = (o.followup_status || o.followupStatus || o.order_status || o.orderStatus || 'Pending').toLowerCase();
      const val = Number(o.order_value || o.orderValue || 0) || 0;
      const channel = o.order_channel || o.orderChannel || 'Default';
      const category = o.product_category || o.productCategory || 'General';
      const city = o.city || o.delivery_area || o.deliveryArea || 'Other';
      const statusLabel = o.followup_status || o.followupStatus || o.order_status || 'Pending';

      if (matchCreated) {
        createdCount++;
        totalOrderValue += val;

        // channel breakdown
        if (!channelMap[channel]) channelMap[channel] = { total: 0, delivered: 0, cancelled: 0, value: 0 };
        channelMap[channel].total++;
        channelMap[channel].value += val;

        // category breakdown
        if (!categoryMap[category]) categoryMap[category] = { total: 0, delivered: 0, cancelled: 0, value: 0 };
        categoryMap[category].total++;
        categoryMap[category].value += val;

        // city breakdown
        if (!cityMap[city]) cityMap[city] = { total: 0, delivered: 0, cancelled: 0, value: 0 };
        cityMap[city].total++;
        cityMap[city].value += val;

        // status breakdown
        if (!statusMap[statusLabel]) statusMap[statusLabel] = { count: 0, value: 0 };
        statusMap[statusLabel].count++;
        statusMap[statusLabel].value += val;

        if (st !== 'delivered' && st !== 'cancelled') {
          openCount++;
          openValue += val;
        }
      }

      if (matchDelivered && st === 'delivered') {
        deliveredCount++;
        deliveredValue += val;
        if (channelMap[channel]) channelMap[channel].delivered++;
        if (categoryMap[category]) categoryMap[category].delivered++;
        if (cityMap[city]) cityMap[city].delivered++;
      }

      if (matchCancelled && st === 'cancelled') {
        cancelledCount++;
        cancelledValue += val;
        if (channelMap[channel]) channelMap[channel].cancelled++;
        if (categoryMap[category]) categoryMap[category].cancelled++;
        if (cityMap[city]) cityMap[city].cancelled++;
      }
    });

    const deliveryRatio = createdCount > 0 ? ((deliveredCount / createdCount) * 100).toFixed(1) : '0';
    const cancellationRatio = createdCount > 0 ? ((cancelledCount / createdCount) * 100).toFixed(1) : '0';

    return {
      createdCount,
      totalOrderValue,
      deliveredCount,
      deliveredValue,
      cancelledCount,
      cancelledValue,
      openCount,
      openValue,
      deliveryRatio,
      cancellationRatio,
      channelMap,
      categoryMap,
      cityMap,
      statusMap
    };
  }, [orders, dateFilter, startDate, endDate, orderDeliveredDateMap, orderCancelledDateMap]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <span>Summary & Analytics Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time KPIs, served orders, conversion ratios, and breakdown across channels and categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 cursor-pointer shadow-xs"
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

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          )}

          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Created Orders</span>
          <p className="text-2xl font-black text-indigo-700 mt-1">{stats.createdCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Total Orders Placed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Served / Delivered</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.deliveredCount}</p>
          <span className="text-[10px] text-emerald-600 font-bold">{stats.deliveryRatio}% Success Rate</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cancelled Orders</span>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.cancelledCount}</p>
          <span className="text-[10px] text-red-500 font-bold">{stats.cancellationRatio}% Cancel Rate</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open / In-Progress</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.openCount}</p>
          <span className="text-[10px] text-amber-600 font-bold">Pending Followups</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Order Value</span>
          <p className="text-xl font-black text-slate-900 mt-1">৳{stats.totalOrderValue.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 font-medium">Delivered: ৳{stats.deliveredValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Breakdown Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBreakdownTab('channel')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                breakdownTab === 'channel'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Order Channels
            </button>
            <button
              onClick={() => setBreakdownTab('category')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                breakdownTab === 'category'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Product Categories
            </button>
            <button
              onClick={() => setBreakdownTab('city')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                breakdownTab === 'city'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Shipping Cities
            </button>
            <button
              onClick={() => setBreakdownTab('status')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                breakdownTab === 'status'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Order Statuses
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing breakdown for {orders.length} total orders
          </span>
        </div>

        {/* Breakdown Tables */}
        <div className="overflow-x-auto">
          {breakdownTab === 'channel' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Channel Name</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Cancelled</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(stats.channelMap).map(([ch, data]) => {
                  const rate = data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={`ch-${ch}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{ch}</td>
                      <td className="py-3 px-4 font-bold">{data.total}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">{data.delivered}</td>
                      <td className="py-3 px-4 text-red-600 font-bold">{data.cancelled}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{rate}%</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">৳{data.value.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {breakdownTab === 'category' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Cancelled</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(stats.categoryMap).map(([cat, data]) => {
                  const rate = data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={`cat-${cat}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{cat}</td>
                      <td className="py-3 px-4 font-bold">{data.total}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">{data.delivered}</td>
                      <td className="py-3 px-4 text-red-600 font-bold">{data.cancelled}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{rate}%</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">৳{data.value.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {breakdownTab === 'city' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Cancelled</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(stats.cityMap).map(([city, data]) => {
                  const rate = data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={`city-${city}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{city}</td>
                      <td className="py-3 px-4 font-bold">{data.total}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">{data.delivered}</td>
                      <td className="py-3 px-4 text-red-600 font-bold">{data.cancelled}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{rate}%</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">৳{data.value.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {breakdownTab === 'status' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Status Name</th>
                  <th className="py-3 px-4">Order Count</th>
                  <th className="py-3 px-4">Share of Total</th>
                  <th className="py-3 px-4">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(stats.statusMap).map(([st, data]) => {
                  const pct = stats.createdCount > 0 ? ((data.count / stats.createdCount) * 100).toFixed(1) : '0';
                  return (
                    <tr key={`st-${st}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {st}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold">{data.count}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{pct}%</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">৳{data.value.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
