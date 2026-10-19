/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { OrderItem, FollowupHistoryItem } from '../types';
import { OrderService } from '../services/orderService';
import { TIME_SLOTS, getTimeSlots } from '../data/mockOrders';
import {
  X,
  Edit3,
  Copy,
  Check,
  Package,
  AlertTriangle,
  MapPin
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
  onViewCustomer?: (customerId: string) => void;
}

export const OrderJourneyModal: React.FC<OrderJourneyModalProps> = ({
  order,
  onClose,
  followupHistory,
  currentUser,
  onUpdateOrderStatus,
  onRefreshOrders,
  canEdit = true,
  onViewCustomer
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

  const [singleAddress, setSingleAddress] = useState<string>(
    order.address_details || order.addressDetails || ''
  );
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<string | null>(null);

  // Format operator name: clean IDs without '@' prefix
  const sessionRole = typeof window !== 'undefined' ? sessionStorage.getItem('portal_session_role') : null;
  const isManagerRole = 
    sessionRole === 'manager' ||
    currentUser.role === 'Manager' || 
    currentUser.user === '1' ||
    currentUser.user?.toLowerCase() === 'manager';

  // Use the actual current user details without hardcoding to 'Manager'
  const actorUserId = currentUser.user || '1';
  const actorUserName = currentUser.name || currentUser.user || 'User';
  const userDisplayName = `${actorUserName} (${actorUserId})`;

  const currentFStatus = (order.followup_status || order.followupStatus || '').toLowerCase();
  const currentOStatus = (order.order_status || order.orderStatus || '').toLowerCase();
  const isDelivered = currentFStatus === 'delivered' || currentOStatus === 'delivered';
  const isCancelled = currentFStatus === 'cancelled' || currentOStatus === 'cancelled';
  const isLocked = isDelivered || isCancelled;
  const canEditEffective = Boolean(canEdit && !isLocked);

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
    if (!canEditEffective || !onUpdateOrderStatus || singleProfit === '') return;
    setIsUpdatingProfit(true);
    setProfitMsg(null);
    try {
      const parsedProfit = parseFloat(singleProfit) || 0;

      await onUpdateOrderStatus(
        orderId,
        {
          profit: parsedProfit
        },
        userDisplayName,
        `Profit updated to ${parsedProfit.toLocaleString()}`
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
    if (!canEditEffective || !onUpdateOrderStatus) return;
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
    if (!canEditEffective || !onUpdateOrderStatus || singleValue === '') return;
    setIsUpdatingValue(true);
    setValueMsg(null);
    try {
      const parsedVal = parseFloat(singleValue);
      const isDeliv = (order.followup_status || order.followupStatus || '').toLowerCase() === 'delivered';

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
        `Price updated to ${parsedVal.toLocaleString()}`
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
    if (!canEditEffective || !onUpdateOrderStatus) return;
    setIsUpdatingScheduleDate(true);
    setScheduleDateMsg(null);
    try {
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
    if (!canEditEffective || !onUpdateOrderStatus) return;
    setIsUpdatingScheduleTime(true);
    setScheduleTimeMsg(null);
    try {
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

  const handleUpdateAddressOnly = async () => {
    if (!canEditEffective || !onUpdateOrderStatus || isUpdatingAddress) return;
    setIsUpdatingAddress(true);
    setAddressMsg(null);
    try {
      const trimmed = singleAddress.trim();
      await onUpdateOrderStatus(
        orderId,
        {
          address_details: trimmed,
          addressDetails: trimmed
        },
        userDisplayName,
        `Address updated to "${trimmed}"`
      );
      setAddressMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setAddressMsg(null), 2500);
    } catch (err) {
      console.error(err);
      setAddressMsg('Failed');
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
                Customer:{' '}
                {onViewCustomer ? (
                  <button
                    type="button"
                    onClick={() => onViewCustomer(String(order.customer_id || order.customerId))}
                    className="text-white font-bold hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-1"
                    title="Click to view Customer 360 profile & history"
                  >
                    <span>{order.customer_name || order.customerName}</span>
                    <span className="text-[10px] text-indigo-200">({order.customer_id || order.customerId})</span>
                  </button>
                ) : (
                  <strong className="text-white">{order.customer_name || order.customerName}</strong>
                )}{' '}
                ({order.customer_mobile || order.customerContact}) • Agent: <strong className="text-white">{order.agent_name || order.agentName}</strong>
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

          {!isLocked && !canEditEffective && (
            <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>View-only mode • Order editing is restricted to Manager access.</span>
            </div>
          )}

          {/* COMPACT INDIVIDUAL UPDATE ACTIONS */}
          {canEditEffective && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>Quick Field Updates</span>
                </h3>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Pro Mode Enabled</span>
              </div>

              {singleStatus.toLowerCase() === 'delivered' ? (
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-inner space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-widest">
                      ✓ Delivered Order Configuration
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {/* Status, Profit, Value, % inputs updated with better focus and styling */}
                    {[
                      { label: 'Status', type: 'select', value: singleStatus, setter: setSingleStatus, options: ['Pending', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled'] },
                      { label: 'Profit ()', type: 'number', value: singleProfit, setter: handleProfitChange, placeholder: 'Enter Profit' },
                      { label: 'Value ()', type: 'number', value: singleValue, setter: setSingleValue, placeholder: 'Order Value' },
                      { label: '%', type: 'number', value: singleProfitPercent, setter: handleProfitPercentChange, placeholder: '%' },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">{field.label}</label>
                        {field.type === 'select' ? (
                          <select value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer">
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.setter(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      disabled={isUpdatingStatus || !singleProfit || parseFloat(singleProfit) <= 0}
                      onClick={handleUpdateStatusOnly}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer shadow-lg hover:shadow-emerald-200"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Update Delivered Status'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* ... Simplified input fields for non-delivered ... */}
                  {[
                    { label: 'Status', value: singleStatus, setter: setSingleStatus, action: handleUpdateStatusOnly, isUpdating: isUpdatingStatus, msg: statusMsg },
                    { label: 'Value', value: singleValue, setter: setSingleValue, action: handleUpdateValueOnly, isUpdating: isUpdatingValue, msg: valueMsg },
                    { label: 'Schedule Date', value: singleScheduleDate, setter: setSingleScheduleDate, action: handleUpdateScheduleDateOnly, isUpdating: isUpdatingScheduleDate, msg: scheduleDateMsg },
                    { label: 'Time Slot', value: singleScheduleTime, setter: setSingleScheduleTime, action: handleUpdateScheduleTimeOnly, isUpdating: isUpdatingScheduleTime, msg: scheduleTimeMsg }
                  ].map((field) => (
                    <div key={field.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">{field.label}</label>
                      {field.label === 'Status' ? (
                        <select value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white cursor-pointer">
                          {['Pending', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.label === 'Time Slot' ? (
                        <select value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white cursor-pointer">
                            <option value="">-- Slot --</option>
                            {getTimeSlots().map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                      ) : (
                        <input type={field.label === 'Schedule Date' ? 'date' : 'text'} value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white" />
                      )}
                      <button
                        type="button"
                        disabled={field.isUpdating}
                        onClick={field.action}
                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        {field.isUpdating ? '...' : 'Save'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Address Update - EXCLUSIVE TO MANAGER ACCESS ONLY */}
              {isManagerRole && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-amber-900 tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>Customer Delivery Address</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      🔒 Manager Only
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={singleAddress}
                      onChange={(e) => setSingleAddress(e.target.value)}
                      placeholder="Enter customer delivery address..."
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-amber-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={isUpdatingAddress || !singleAddress.trim()}
                      onClick={handleUpdateAddressOnly}
                      className="px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                    >
                      {isUpdatingAddress ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMPACT ORDER SUMMARY (Clean, minimal space, easy to read) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                <span>Order Summary (#{orderId})</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">22 fields</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-xs py-1">
              {[
                { label: 'Order ID', value: order.order_id || order.id },
                { label: 'Order Date', value: OrderService.formatDateTime(order.create_date || order.createDate || '') },
                { label: 'Channel', value: order.order_channel || order.orderChannel },
                { label: 'Category', value: order.product_category || order.productCategory },
                { label: 'Customer', value: order.customer_name || order.customerName },
                { label: 'Mobile', value: order.customer_mobile || order.customerContact },
                { label: 'Gender', value: order.gender },
                { label: 'Product', value: order.product_name || order.productName },
                { label: 'City', value: order.city },
                { label: 'Delivery Area', value: order.delivery_area || order.deliveryArea },
                { label: 'Schedule Date', value: order.schedule_date || order.scheduleDate },
                { label: 'Schedule Time', value: order.schedule_time || order.scheduledTime },
                { label: 'Agent ID', value: order.agent_id || order.agentId },
                { label: 'Agent Name', value: order.agent_name || order.agentName },
                { label: 'Order Value', value: ` ${((order.order_value ?? order.orderValue) || 0).toLocaleString()}` },
                { label: 'Profit', value: ` ${((order.profit ?? 0) || 0).toLocaleString()}` },
                { label: 'Order Status', value: order.order_status || order.orderStatus },
                { label: 'Followup Status', value: order.followup_status || order.followupStatus },
                { label: 'Delivered Date', value: order.delivered_date ? OrderService.formatDateTime(order.delivered_date) : '-' },
                { label: 'Cancelled Date', value: order.cancelled_date ? OrderService.formatDateTime(order.cancelled_date) : '-' },
                { label: 'Customer ID', value: order.customer_id || order.customerId },
                { label: 'Address', value: order.address_details || order.addressDetails, span: 'col-span-2 sm:col-span-3' }
              ].map((item, idx) => {
                const isCustomerField = (item.label === 'Customer ID' || item.label === 'Customer') && onViewCustomer;
                return (
                  <div key={`order-detail-field-${item.label}-${idx}`} className={`flex items-baseline gap-1.5 py-0.5 border-b border-slate-50 ${item.span || ''}`}>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap min-w-[70px]">{item.label}:</span>
                    {isCustomerField ? (
                      <button
                        type="button"
                        onClick={() => onViewCustomer(String(order.customer_id || order.customerId))}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer truncate text-left"
                        title="Click to view Customer 360 profile"
                      >
                        {item.value || '-'}
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-800 truncate" title={String(item.value || '-')}>{item.value || '-'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ORDER HISTORY */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 border-b pb-1.5">Order History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Updated By</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {followupHistory
                    .filter(h => String(h.orderId) === orderId)
                    .map((h, i) => (
                      <tr key={`journey-fol-hist-${h.id || h.followupId || i}-${i}`} className="text-slate-700 hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono whitespace-nowrap">{h.timestamp}</td>
                        <td className="py-2 px-3 whitespace-nowrap font-medium">
                          <span className="font-bold text-indigo-700">{h.updatedByName || h.updatedBy || 'System'}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({h.updatedBy || 'ID: ?'})</span>
                        </td>
                        <td className="py-2 px-3">
                           <div className="font-bold">{h.action}</div>
                           {h.notes && <div className="text-slate-500 text-[10px]">{h.notes}</div>}
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
    </div>,
    document.body
  );
};
