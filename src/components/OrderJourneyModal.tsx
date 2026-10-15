/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OrderItem, FollowupHistoryItem } from '../types';
import { OrderService } from '../services/orderService';
import { TIME_SLOTS } from '../data/mockOrders';
import {
  X,
  Edit3,
  Copy,
  Check,
  Package,
  AlertTriangle
} from 'lucide-react';

interface OrderJourneyModalProps {
  order: OrderItem | null;
  onClose: () => void;
  followupHistory: FollowupHistoryItem[];
  currentUser: {
    name: string;
    user: string;
    role: string;
  };
  onUpdateOrderStatus?: (
    orderId: string,
    updates: Partial<OrderItem>,
    updatedBy?: string,
    notes?: string
  ) => Promise<void>;
  onRefreshOrders?: () => Promise<void>;
  canEdit?: boolean;
}

export const OrderJourneyModal: React.FC<OrderJourneyModalProps> = ({
  order,
  onClose,
  followupHistory,
  currentUser,
  onUpdateOrderStatus,
  onRefreshOrders,
  canEdit = true
}) => {
  if (!order) return null;

  const orderId = String(order.order_id || order.id || '');
  const [copiedId, setCopiedId] = useState(false);

  // Independent Single Action States
  const [singleStatus, setSingleStatus] = useState<string>(
    order.followup_status || order.followupStatus || 'Pending'
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [singleValue, setSingleValue] = useState<string>(
    String(order.order_value ?? order.orderValue ?? '')
  );
  const [isUpdatingValue, setIsUpdatingValue] = useState(false);
  const [valueMsg, setValueMsg] = useState<string | null>(null);

  const [singleProfit, setSingleProfit] = useState<string>(
    String(order.profit ?? '')
  );
  const [singleProfitPercent, setSingleProfitPercent] = useState<string>(() => {
    const oVal = Number(order.order_value ?? order.orderValue ?? 0);
    const prVal = Number(order.profit ?? 0);
    return oVal > 0 && prVal > 0 ? ((prVal / oVal) * 100).toFixed(1).replace(/\.0$/, '') : '';
  });
  const [isUpdatingProfit, setIsUpdatingProfit] = useState(false);
  const [profitMsg, setProfitMsg] = useState<string | null>(null);

  const [singleScheduleDate, setSingleScheduleDate] = useState<string>(
    order.schedule_date || order.scheduleDate || ''
  );
  const [isUpdatingScheduleDate, setIsUpdatingScheduleDate] = useState(false);
  const [scheduleDateMsg, setScheduleDateMsg] = useState<string | null>(null);

  const [singleScheduleTime, setSingleScheduleTime] = useState<string>(
    order.schedule_time || order.scheduledTime || ''
  );
  const [isUpdatingScheduleTime, setIsUpdatingScheduleTime] = useState(false);
  const [scheduleTimeMsg, setScheduleTimeMsg] = useState<string | null>(null);

  const handleProfitChange = (valStr: string) => {
    setSingleProfit(valStr);
    const pVal = parseFloat(valStr);
    const oVal = singleValue !== '' ? parseFloat(singleValue) : Number(order.order_value ?? order.orderValue ?? 0);
    if (oVal > 0 && !isNaN(pVal)) {
      setSingleProfitPercent(((pVal / oVal) * 100).toFixed(1).replace(/\.0$/, ''));
    } else {
      setSingleProfitPercent('');
    }
  };

  const handleProfitPercentChange = (pctStr: string) => {
    setSingleProfitPercent(pctStr);
    const pct = parseFloat(pctStr);
    const oVal = singleValue !== '' ? parseFloat(singleValue) : Number(order.order_value ?? order.orderValue ?? 0);
    if (oVal > 0 && !isNaN(pct)) {
      setSingleProfit(String(Math.round((oVal * pct) / 100)));
    } else {
      setSingleProfit('');
    }
  };

  const handleApplyProfitPreset = (pct: number) => {
    setSingleProfitPercent(String(pct));
    const oVal = singleValue !== '' ? parseFloat(singleValue) : Number(order.order_value ?? order.orderValue ?? 0);
    if (oVal > 0) {
      setSingleProfit(String(Math.round((oVal * pct) / 100)));
    }
  };

  const handleUpdateProfitOnly = async () => {
    if (!onUpdateOrderStatus || singleProfit === '') return;
    setIsUpdatingProfit(true);
    setProfitMsg(null);
    try {
      const parsedProfit = parseFloat(singleProfit) || 0;
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;

      await onUpdateOrderStatus(
        orderId,
        {
          profit: parsedProfit
        },
        userDisplayName,
        `Profit updated to ৳${parsedProfit.toLocaleString()}`
      );
      setProfitMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setProfitMsg(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingProfit(false);
    }
  };

  const handleCopyOrderId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleUpdateStatusOnly = async () => {
    if (!onUpdateOrderStatus) return;
    setIsUpdatingStatus(true);
    setStatusMsg(null);
    try {
      const isDeliv = singleStatus.toLowerCase() === 'delivered';
      const isCanc = singleStatus.toLowerCase() === 'cancelled';

      if (isDeliv) {
        if (!singleProfit || parseFloat(singleProfit) <= 0) {
          if (!order.profit || order.profit <= 0) {
            setStatusMsg('Profit required!');
            setIsUpdatingStatus(false);
            return;
          }
        }
      }

      const nowTs = OrderService.getBdtTimestamp();
      const currentVal = singleValue !== '' ? parseFloat(singleValue) : Number(order.order_value ?? order.orderValue ?? 0);
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;

      let finalProfit = 0;
      if (isDeliv) {
        if (singleProfit !== '') {
          finalProfit = parseFloat(singleProfit) || 0;
        } else if (order.profit) {
          finalProfit = order.profit;
        } else {
          finalProfit = Math.round(currentVal * 0.20);
        }
      } else {
        finalProfit = singleProfit !== '' ? parseFloat(singleProfit) || 0 : (order.profit || 0);
      }

      await onUpdateOrderStatus(
        orderId,
        {
          followup_status: singleStatus,
          followupStatus: singleStatus,
          order_status: 'Pending',
          orderStatus: 'Pending',
          profit: finalProfit,
          delivered_date: isDeliv ? nowTs : '',
          deliveredDate: isDeliv ? nowTs : '',
          cancelled_date: isCanc ? nowTs : '',
          cancelledDate: isCanc ? nowTs : '',
          followup_date: nowTs,
          followupDate: nowTs
        },
        userDisplayName,
        `Status updated to ${singleStatus}`
      );
      setStatusMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 600);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateValueOnly = async () => {
    if (!onUpdateOrderStatus || singleValue === '') return;
    setIsUpdatingValue(true);
    setValueMsg(null);
    try {
      const parsedVal = parseFloat(singleValue);
      const isDeliv = (order.followup_status || order.followupStatus || '').toLowerCase() === 'delivered';
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;

      let calculatedProfit = order.profit || 0;
      if (singleProfitPercent !== '') {
        calculatedProfit = Math.round((parsedVal * parseFloat(singleProfitPercent)) / 100);
        setSingleProfit(String(calculatedProfit));
      } else if (singleProfit !== '') {
        calculatedProfit = parseFloat(singleProfit) || 0;
      } else if (isDeliv) {
        calculatedProfit = Math.round(parsedVal * 0.20);
      }

      await onUpdateOrderStatus(
        orderId,
        {
          order_value: parsedVal,
          orderValue: parsedVal,
          profit: calculatedProfit
        },
        userDisplayName,
        `Price updated to ৳${parsedVal.toLocaleString()}`
      );
      setValueMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setValueMsg(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingValue(false);
    }
  };

  const handleUpdateScheduleDateOnly = async () => {
    if (!onUpdateOrderStatus) return;
    setIsUpdatingScheduleDate(true);
    setScheduleDateMsg(null);
    try {
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;
      await onUpdateOrderStatus(
        orderId,
        {
          schedule_date: singleScheduleDate,
          scheduleDate: singleScheduleDate
        },
        userDisplayName,
        `Schedule Date updated to ${singleScheduleDate}`
      );
      setScheduleDateMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setScheduleDateMsg(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingScheduleDate(false);
    }
  };

  const handleUpdateScheduleTimeOnly = async () => {
    if (!onUpdateOrderStatus) return;
    setIsUpdatingScheduleTime(true);
    setScheduleTimeMsg(null);
    try {
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;
      await onUpdateOrderStatus(
        orderId,
        {
          schedule_time: singleScheduleTime,
          scheduledTime: singleScheduleTime
        },
        userDisplayName,
        `Time Slot updated to ${singleScheduleTime}`
      );
      setScheduleTimeMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setScheduleTimeMsg(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingScheduleTime(false);
    }
  };

  const isDelivered = (order.followup_status || order.followupStatus || '').toLowerCase() === 'delivered';
  const isCancelled = (order.followup_status || order.followupStatus || '').toLowerCase() === 'cancelled';
  const isLocked = isDelivered || isCancelled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-extrabold flex items-center justify-center text-xs shadow-md ring-2 ring-white/20">
              #{orderId}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                  <span>Order Details &amp; Quick Updates</span>
                  <button
                    onClick={handleCopyOrderId}
                    title="Copy Order ID"
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px] flex items-center gap-1 font-mono"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </h2>
                
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isDelivered
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : isCancelled
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  ● {order.followup_status || order.followupStatus || 'Pending'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80 mt-0.5">
                Customer: <strong className="text-white">{order.customer_name || order.customerName}</strong> ({order.customer_mobile || order.customerContact}) • Agent: <strong className="text-white">{order.agent_name || order.agentName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/60">

          {isLocked && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>This order is {isDelivered ? 'Delivered' : 'Cancelled'} and can no longer be edited.</span>
            </div>
          )}

          {/* COMPACT INDIVIDUAL UPDATE ACTIONS (SIDE-BY-SIDE WITH SMALL FONT & UPDATE BUTTONS UNDERNEATH) */}
          {canEdit && !isLocked && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quick Field Updates</span>
                </h3>
                <span className="text-[10px] text-slate-400">Edit fields side-by-side</span>
              </div>

              {singleStatus.toLowerCase() === 'delivered' ? (
                <div className="col-span-2 sm:col-span-3 lg:col-span-5 p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                      ✓ Delivered Selected — Enter Profit, Value &amp; % manually
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    {/* 1. Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
                      <select
                        value={singleStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSingleStatus(val);
                          if (val.toLowerCase() !== 'delivered') {
                            setSingleProfit('');
                            setSingleProfitPercent('');
                          } else {
                            setSingleProfit('');
                            setSingleProfitPercent('');
                          }
                        }}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* 2. Profit (৳) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Profit (৳) *Required*</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={singleProfit}
                        onChange={(e) => handleProfitChange(e.target.value)}
                        placeholder="Enter profit manually"
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-emerald-400 bg-white text-emerald-700 shadow-2xs"
                      />
                    </div>

                    {/* 3. Value (৳) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Value (৳)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={singleValue}
                        onChange={(e) => setSingleValue(e.target.value)}
                        placeholder="Order value"
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white shadow-2xs"
                      />
                    </div>

                    {/* 4. % */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">% (Percentage)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={singleProfitPercent}
                          onChange={(e) => handleProfitPercentChange(e.target.value)}
                          placeholder="%"
                          className="w-full px-3 pr-7 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-indigo-700 shadow-2xs"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Update Button Right Below */}
                  <div className="flex items-center justify-between pt-2">
                    {statusMsg ? (
                      <span className="text-xs font-bold text-emerald-700">{statusMsg}</span>
                    ) : <span />}
                    <button
                      type="button"
                      disabled={isUpdatingStatus || !singleProfit || parseFloat(singleProfit) <= 0}
                      onClick={handleUpdateStatusOnly}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Update Delivered Status & Profit'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  
                  {/* 1. Status */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Status
                      </label>
                      <select
                        value={singleStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSingleStatus(val);
                          if (val.toLowerCase() === 'delivered') {
                            setSingleProfit('');
                            setSingleProfitPercent('');
                          }
                        }}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      {statusMsg ? (
                        <span className="text-[10px] font-bold text-emerald-600">{statusMsg}</span>
                      ) : <span />}
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={handleUpdateStatusOnly}
                        className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                      >
                        {isUpdatingStatus ? '...' : 'Update'}
                      </button>
                    </div>
                  </div>

                  {/* 2. Order Value */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Value (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={singleValue}
                        onChange={(e) => setSingleValue(e.target.value)}
                        placeholder="Price"
                        className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      {valueMsg ? (
                        <span className="text-[10px] font-bold text-emerald-600">{valueMsg}</span>
                      ) : <span />}
                      <button
                        type="button"
                        disabled={isUpdatingValue || singleValue === ''}
                        onClick={handleUpdateValueOnly}
                        className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                      >
                        {isUpdatingValue ? '...' : 'Update'}
                      </button>
                    </div>
                  </div>

                  {/* 4. Schedule Date */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Schedule Date
                      </label>
                      <input
                        type="date"
                        value={singleScheduleDate}
                        onChange={(e) => setSingleScheduleDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      {scheduleDateMsg ? (
                        <span className="text-[10px] font-bold text-emerald-600">{scheduleDateMsg}</span>
                      ) : <span />}
                      <button
                        type="button"
                        disabled={isUpdatingScheduleDate || !singleScheduleDate}
                        onClick={handleUpdateScheduleDateOnly}
                        className="w-full py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                      >
                        {isUpdatingScheduleDate ? '...' : 'Update'}
                      </button>
                    </div>
                  </div>

                  {/* 5. Schedule Time */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Time Slot
                      </label>
                      <select
                        value={singleScheduleTime}
                        onChange={(e) => setSingleScheduleTime(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white cursor-pointer"
                      >
                        <option value="">-- Slot --</option>
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      {scheduleTimeMsg ? (
                        <span className="text-[10px] font-bold text-emerald-600">{scheduleTimeMsg}</span>
                      ) : <span />}
                      <button
                        type="button"
                        disabled={isUpdatingScheduleTime}
                        onClick={handleUpdateScheduleTimeOnly}
                        className="w-full py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                      >
                        {isUpdatingScheduleTime ? '...' : 'Update'}
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ALL 22 PROPERTIES / DETAILS GRID */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 border-b pb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>All Order Properties for #{orderId}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {[
                { label: 'order_id', value: order.order_id || order.id },
                { label: 'customer_id', value: order.customer_id || order.customerId },
                { label: 'customer_mobile', value: order.customer_mobile || order.customerContact },
                { label: 'customer_name', value: order.customer_name || order.customerName },
                { label: 'gender', value: order.gender },
                { label: 'create_date', value: OrderService.formatDateTime(order.create_date || order.createDate) },
                { label: 'order_channel', value: order.order_channel || order.orderChannel },
                { label: 'agent_id', value: order.agent_id || order.agentId },
                { label: 'agent_name', value: order.agent_name || order.agentName },
                { label: 'product_category', value: order.product_category || order.productCategory },
                { label: 'product_name', value: order.product_name || order.productName },
                { label: 'city', value: order.city },
                { label: 'delivery_area', value: order.delivery_area || order.deliveryArea },
                { label: 'address_details', value: order.address_details || order.addressDetails },
                { label: 'schedule_date', value: order.schedule_date || order.scheduleDate },
                { label: 'schedule_time', value: order.schedule_time || order.scheduledTime },
                { label: 'order_value', value: `৳ ${((order.order_value ?? order.orderValue) || 0).toLocaleString()}` },
                { label: 'order_status', value: order.order_status || order.orderStatus },
                { label: 'followup_status', value: order.followup_status || order.followupStatus },
                { label: 'profit', value: `৳ ${((order.profit ?? 0) || 0).toLocaleString()}` },
                { label: 'delivered_date', value: order.delivered_date ? OrderService.formatDateTime(order.delivered_date) : '-' },
                { label: 'cancelled_date', value: order.cancelled_date ? OrderService.formatDateTime(order.cancelled_date) : '-' }
              ].map((col, idx) => (
                <div key={`col-${idx}`} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                    {col.label}
                  </span>
                  <span className="font-semibold text-slate-800 break-words">{col.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ORDER HISTORY */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 border-b pb-2">Order History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-2">Timestamp</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Value</th>
                    <th className="py-2 px-2">Schedule</th>
                    <th className="py-2 px-2">Updated By</th>
                    <th className="py-2 px-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {followupHistory
                    .filter(h => String(h.orderId) === orderId)
                    .map((h, i) => (
                      <tr key={i} className="text-slate-700 hover:bg-slate-50">
                        <td className="py-2 px-2 font-mono whitespace-nowrap">{h.timestamp}</td>
                        <td className="py-2 px-2">
                           <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{h.previousStatus} ➔ {h.newStatus}</span>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">৳ {(h.orderValue || 0).toLocaleString()}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{h.scheduleDate} {h.scheduledTime}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {h.updatedByName || h.updatedBy?.replace(/\s*\(@.*\)/, '').replace('@', '_')}
                        </td>
                        <td className="py-2 px-2">
                           <div className="font-bold">{h.action}</div>
                           <div className="text-slate-500">{h.notes?.replace(/\(Status: (.*) -> (.*)\).*/, 'Status: $1 -> $2')}</div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Order #{orderId}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
