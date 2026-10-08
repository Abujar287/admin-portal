import React, { useState, useMemo } from 'react';
import { AgentUser, OrderItem } from '../types';
import { 
  RotateCw, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DashboardViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentAgent,
  orders,
  onRefresh,
  isRefreshing
}) => {
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');

  // Filter based on viewMode
  const activeOrders = useMemo(() => {
    if (viewMode === 'all') {
      return orders;
    }
    return orders.filter(
      (o) => o.agentId.toLowerCase() === currentAgent.user.toLowerCase()
    );
  }, [orders, currentAgent.user, viewMode]);

  // Aggregate stats matching original specification
  const stats = useMemo(() => {
    let totalCreated = activeOrders.length;
    let deliveredCount = 0;
    let openCount = 0;
    let totalVal = 0;
    let deliveredVal = 0;
    let deliveredProfit = 0;

    const channelMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};

    activeOrders.forEach((o) => {
      const val = Number(o.orderValue) || 0;
      const profit = Number(o.profit) || 0;
      const isDelivered = o.followupStatus.toLowerCase() === 'delivered';

      totalVal += val;
      if (isDelivered) {
        deliveredCount++;
        deliveredVal += val;
        deliveredProfit += profit;
      } else {
        openCount++;
      }

      channelMap[o.orderChannel] = (channelMap[o.orderChannel] || 0) + 1;
      categoryMap[o.productCategory] = (categoryMap[o.productCategory] || 0) + 1;
    });

    const deliveryRate = totalCreated > 0 ? Math.round((deliveredCount / totalCreated) * 100) : 0;
    const profitMargin = deliveredVal > 0 ? Math.round((deliveredProfit / deliveredVal) * 100) : 0;

    return {
      totalCreated,
      deliveredCount,
      openCount,
      totalVal,
      deliveredVal,
      deliveredProfit,
      deliveryRate,
      profitMargin,
      channelMap,
      categoryMap
    };
  }, [activeOrders]);

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance Dashboard</h1>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('mine')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'mine'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Stats ({currentAgent.user})
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Sheet Orders ({orders.length})
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'mine' ? (
              <>Lifetime order statistics and profit analytics for <span className="font-semibold text-blue-700">{currentAgent.user}</span></>
            ) : (
              <>Aggregated lifetime statistics across all agents and channels in Google Sheet</>
            )}
          </p>
        </div>

        <button
          onClick={() => onRefresh()}
          disabled={isRefreshing}
          className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-70 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : '🔄 Refresh Stats'}</span>
        </button>
      </div>

      {/* 6 Core Cards matching user's original HTML structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Created Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Created Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#1e3a8a]">{stats.totalCreated}</span>
            <span className="text-xs text-slate-400 ml-2">all time</span>
          </div>
        </div>

        {/* Card 2: Delivered Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Delivered Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600">{stats.deliveredCount}</span>
            <span className="text-xs text-emerald-700/80 ml-2 font-medium">({stats.deliveryRate}% fulfillment)</span>
          </div>
        </div>

        {/* Card 3: Open / Pending Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Open / Pending Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-600">{stats.openCount}</span>
            <span className="text-xs text-slate-400 ml-2">in delivery pipeline</span>
          </div>
        </div>

        {/* Card 4: Total Order Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Order Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              ৳
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#1e3a8a]">
              ৳ {stats.totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 5: Delivered Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Delivered Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ৳
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600">
              ৳ {stats.deliveredVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 6: Delivered Profit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Delivered Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600">
              ৳ {stats.deliveredProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders by Channel */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Orders by Channel</h3>
            <span className="text-[11px] text-slate-400">{Object.keys(stats.channelMap).length} Active Channels</span>
          </div>

          <div className="space-y-3">
            {Object.keys(stats.channelMap).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders recorded yet.</p>
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

        {/* Orders by Product Category */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Orders by Category</h3>
            <span className="text-[11px] text-slate-400">{Object.keys(stats.categoryMap).length} Categories</span>
          </div>

          <div className="space-y-3">
            {Object.keys(stats.categoryMap).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders recorded yet.</p>
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
