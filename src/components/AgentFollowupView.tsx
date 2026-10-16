import React, { useState, useMemo } from 'react';
import { AgentUser, OrderItem, FollowupHistoryItem } from '../types';
import { TIME_SLOTS, getTimeSlots } from '../data/mockOrders';
import { isOrderAssignedToAgent } from '../utils/agentMatching';
import {
  History,
  RotateCw,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

interface AgentFollowupViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  followupHistory?: FollowupHistoryItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onUpdateOrderStatus: (
    orderId: string,
    updates: Partial<OrderItem>,
    updatedBy?: string,
    notes?: string
  ) => Promise<boolean | void>;
}

export const AgentFollowupView: React.FC<AgentFollowupViewProps> = ({
  currentAgent,
  orders,
  followupHistory = [],
  onRefresh,
  isRefreshing,
  onUpdateOrderStatus
}) => {
  // Quick updater states
  const [quickUpdateOrderId, setQuickUpdateOrderId] = useState<string>('');
  const [quickUpdateStatus, setQuickUpdateStatus] = useState<string>('Pending');
  const [quickUpdateOrderValue, setQuickUpdateOrderValue] = useState<string>('');
  const [quickUpdateProfit, setQuickUpdateProfit] = useState<string>('');
  const [quickUpdateScheduleDate, setQuickUpdateScheduleDate] = useState<string>('');
  const [quickUpdateScheduledTime, setQuickUpdateScheduledTime] = useState<string>('');
  const [quickUpdateNotes, setQuickUpdateNotes] = useState<string>('');
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [followupSearch, setFollowupSearch] = useState<string>('');

  // Agent permissions
  const perms = currentAgent.permissions || {
    canCreate: true,
    canUpdateStatus: true,
    canChangeSchedule: true,
    canChangeValue: true,
    canAddProfit: true,
    canCancel: true,
    allowedOrderStatuses: ['Pending', 'In Progress', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled']
  };

  const allowedStatuses = useMemo(() => {
    if (perms.allowedOrderStatuses && perms.allowedOrderStatuses.length > 0) {
      return perms.allowedOrderStatuses;
    }
    return ['Pending', 'In Progress', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled'];
  }, [perms.allowedOrderStatuses]);

  // Filter orders relevant to this agent
  const myAgentOrders = useMemo(() => {
    return orders.filter((o) => isOrderAssignedToAgent(o, currentAgent));
  }, [orders, currentAgent]);

  // Handle order selection
  const handleSelectOrder = (orderId: string) => {
    setQuickUpdateOrderId(orderId);
    setStatusMessage('');
    const ord = orders.find((o) => String(o.id) === String(orderId) || String(o.order_id) === String(orderId));
    if (ord) {
      const currentSt = ord.followup_status || ord.followupStatus || ord.order_status || ord.orderStatus || 'Pending';
      setQuickUpdateStatus(currentSt);
      setQuickUpdateOrderValue(ord.order_value !== undefined ? String(ord.order_value) : String(ord.orderValue || ''));
      setQuickUpdateProfit(ord.profit !== undefined ? String(ord.profit) : '');
      setQuickUpdateScheduleDate(ord.schedule_date || ord.scheduleDate || '');
      setQuickUpdateScheduledTime(ord.schedule_time || ord.scheduledTime || '');
    }
  };

  // Handle Quick Submit
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUpdateOrderId) return;

    if (perms.canUpdateStatus === false) {
      setStatusMessage('Access Denied: You do not have permission to update status.');
      return;
    }

    setIsSavingStatus(true);
    setStatusMessage('');

    try {
      const updates: Partial<OrderItem> = {
        followup_status: quickUpdateStatus,
        followupStatus: quickUpdateStatus,
        order_status: 'Pending',
        orderStatus: 'Pending'
      };

      if (perms.canChangeSchedule !== false) {
        if (quickUpdateScheduleDate) {
          updates.schedule_date = quickUpdateScheduleDate;
          updates.scheduleDate = quickUpdateScheduleDate;
        }
        if (quickUpdateScheduledTime) {
          updates.schedule_time = quickUpdateScheduledTime;
          updates.scheduledTime = quickUpdateScheduledTime;
        }
      }

      if (perms.canChangeValue !== false && quickUpdateOrderValue !== '') {
        const val = parseFloat(quickUpdateOrderValue);
        if (!isNaN(val)) {
          updates.order_value = val;
          updates.orderValue = val;
        }
      }

      if (perms.canAddProfit !== false && quickUpdateProfit !== '') {
        const pVal = parseFloat(quickUpdateProfit);
        if (!isNaN(pVal)) {
          updates.profit = pVal;
        }
      }

      const agentActor = `${currentAgent.name || currentAgent.user} (@${currentAgent.user})`;
      await onUpdateOrderStatus(quickUpdateOrderId, updates, agentActor, quickUpdateNotes);
      setStatusMessage(`Order #${quickUpdateOrderId} updated successfully!`);
      setQuickUpdateNotes('');
    } catch (err: any) {
      setStatusMessage(`Error updating order: ${err?.message || 'Failed to update'}`);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Filter history relevant to this agent or agent's orders
  const filteredHistory = useMemo(() => {
    const myOrderIds = new Set(myAgentOrders.map((o) => String(o.id || o.order_id)));
    return followupHistory.filter((h) => {
      const isMyOrder = myOrderIds.has(String(h.orderId || (h as any).order_id));
      const isMyAction = h.updatedBy === currentAgent.user || h.updatedBy === currentAgent.name;
      if (!isMyOrder && !isMyAction) return false;

      if (!followupSearch.trim()) return true;
      const q = followupSearch.toLowerCase();
      return (
        String(h.followupId || '').toLowerCase().includes(q) ||
        String(h.orderId || (h as any).order_id || '').toLowerCase().includes(q) ||
        String(h.customerName || (h as any).customer_name || '').toLowerCase().includes(q) ||
        String(h.previousStatus || '').toLowerCase().includes(q) ||
        String(h.newStatus || (h as any).new_status || '').toLowerCase().includes(q) ||
        String(h.notes || '').toLowerCase().includes(q) ||
        String(h.updatedBy || '').toLowerCase().includes(q)
      );
    });
  }, [followupHistory, myAgentOrders, currentAgent.user, currentAgent.name, followupSearch]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Followup Status & Order Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Update followup status, schedule date & time slot, order value, and record audit remarks directly for your customer followups.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Orders</span>
          </button>
        </div>
      </div>

      {/* Quick Status Updater Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white">Order Followup Status & Schedule Updater</h3>
            <p className="text-[11px] text-indigo-200">
              Pick your Order ID, choose followup status, schedule slot, and save notes.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
            statusMessage.includes('Error') || statusMessage.includes('Denied')
              ? 'bg-red-500/20 text-red-200 border border-red-500/30'
              : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleQuickSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Pick Order */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Select Order ID
              </label>
              <select
                value={quickUpdateOrderId}
                onChange={(e) => handleSelectOrder(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 cursor-pointer"
              >
                <option value="">-- Choose Order ID --</option>
                {myAgentOrders.map((ord) => (
                  <option key={`ord-opt-${ord.id}`} value={ord.id}>
                    #{ord.id} - {ord.customer_name || ord.customerName || 'Customer'} (
                    {ord.followup_status || ord.followupStatus || ord.order_status || 'Pending'})
                  </option>
                ))}
              </select>
            </div>

            {/* Followup Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                New Followup Status
              </label>
              <select
                value={quickUpdateStatus}
                onChange={(e) => setQuickUpdateStatus(e.target.value)}
                disabled={perms.canUpdateStatus === false}
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 cursor-pointer disabled:opacity-50"
              >
                {allowedStatuses.map((st) => (
                  <option key={`st-opt-${st}`} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Schedule Date
              </label>
              <input
                type="date"
                value={quickUpdateScheduleDate}
                onChange={(e) => setQuickUpdateScheduleDate(e.target.value)}
                disabled={perms.canChangeSchedule === false}
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 disabled:opacity-50"
              />
            </div>

            {/* Schedule Time Slot */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Scheduled Time Slot
              </label>
              <select
                value={quickUpdateScheduledTime}
                onChange={(e) => setQuickUpdateScheduledTime(e.target.value)}
                disabled={perms.canChangeSchedule === false}
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Select Time Slot --</option>
                {quickUpdateScheduledTime && !getTimeSlots().includes(quickUpdateScheduledTime) && (
                  <option value={quickUpdateScheduledTime}>{quickUpdateScheduledTime}</option>
                )}
                {getTimeSlots().map((slot, idx) => (
                  <option key={`slot-${slot}-${idx}`} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Value */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Order Value (৳)
              </label>
              <input
                type="number"
                step="any"
                value={quickUpdateOrderValue}
                onChange={(e) => setQuickUpdateOrderValue(e.target.value)}
                disabled={perms.canChangeValue === false}
                placeholder="Order value in BDT"
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 disabled:opacity-50"
              />
            </div>

            {/* Profit */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Profit (৳)
              </label>
              <input
                type="number"
                step="any"
                value={quickUpdateProfit}
                onChange={(e) => setQuickUpdateProfit(e.target.value)}
                disabled={perms.canAddProfit === false}
                placeholder="Profit in BDT"
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Remarks & Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                Followup Remarks / Audit Notes
              </label>
              <input
                type="text"
                value={quickUpdateNotes}
                onChange={(e) => setQuickUpdateNotes(e.target.value)}
                placeholder="e.g. Customer confirmed delivery on evening slot, schedule adjusted."
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium placeholder:text-slate-500 focus:border-indigo-400"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickUpdateOrderId('');
                  setQuickUpdateStatus('Pending');
                  setQuickUpdateOrderValue('');
                  setQuickUpdateProfit('');
                  setQuickUpdateScheduleDate('');
                  setQuickUpdateScheduledTime('');
                  setQuickUpdateNotes('');
                  setStatusMessage('');
                }}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!quickUpdateOrderId || isSavingStatus}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30 active:scale-[0.99]"
              >
                {isSavingStatus ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Update Followup</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Historical Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Followup Status & Audit Log History</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              History of followup modifications, schedule adjustments, and notes.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={followupSearch}
              onChange={(e) => setFollowupSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <th className="py-3 px-3.5 whitespace-nowrap text-indigo-700">Followup ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Order ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Customer Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Previous Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap">New Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Order Value</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Schedule</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Updated By</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 font-semibold">
                    No followup records found for your orders. Update an order status above to log your first record!
                  </td>
                </tr>
              ) : (
                filteredHistory.map((h, idx) => (
                  <tr key={`fhist-${h.id || idx}`} className="group hover:bg-amber-100/90 transition-colors cursor-pointer">
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-indigo-600 font-bold">
                      {h.followupId || `#${h.id}`}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">
                      #{h.orderId || (h as any).order_id}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {h.timestamp}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-800">
                      {h.customerName || (h as any).customer_name || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {h.previousStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (h.newStatus || '').toLowerCase() === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : (h.newStatus || '').toLowerCase() === 'cancelled'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {h.newStatus || (h as any).new_status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold">
                      {h.orderValue !== undefined ? `৳${Number(h.orderValue).toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap text-[11px]">
                      {h.scheduleDate ? `${h.scheduleDate} ${h.scheduledTime || ''}` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {h.updatedBy || 'Agent'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate" title={h.notes}>
                      {h.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
