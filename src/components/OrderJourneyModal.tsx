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
  Package
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
      const nowTs = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const currentVal = Number(order.order_value ?? order.orderValue ?? 0);
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;

      await onUpdateOrderStatus(
        orderId,
        {
          followup_status: singleStatus,
          followupStatus: singleStatus,
          order_status: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : 'Pending'),
          orderStatus: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : 'Pending'),
          profit: isDeliv ? Math.round(currentVal * 0.20) : 0,
          delivered_date: isDeliv ? nowTs : '',
          deliveredDate: isDeliv ? nowTs : '',
          cancelled_date: isCanc ? nowTs : '',
          cancelledDate: isCanc ? nowTs : ''
        },
        userDisplayName,
        `Status updated to ${singleStatus}`
      );
      setStatusMsg('Updated!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setStatusMsg(null), 2000);
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

      await onUpdateOrderStatus(
        orderId,
        {
          order_value: parsedVal,
          orderValue: parsedVal,
          profit: isDeliv ? Math.round(parsedVal * 0.20) : (order.profit || 0)
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

          {/* COMPACT INDIVIDUAL UPDATE ACTIONS (SIDE-BY-SIDE WITH SMALL FONT & UPDATE BUTTONS UNDERNEATH) */}
          {canEdit && (
            <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quick Field Updates (একক আপডেট)</span>
                </h3>
                <span className="text-[10px] text-slate-400">Edit fields side-by-side</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* 1. Status */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      value={singleStatus}
                      onChange={(e) => setSingleStatus(e.target.value)}
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

                {/* 3. Schedule Date */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Schedule Date
                    </label>
                    <input
                      type="date"
                      value={singleScheduleDate}
                      onChange={(e) => setSingleScheduleDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {scheduleDateMsg ? (
                      <span className="text-[10px] font-bold text-emerald-600">{scheduleDateMsg}</span>
                    ) : <span />}
                    <button
                      type="button"
                      disabled={isUpdatingScheduleDate}
                      onClick={handleUpdateScheduleDateOnly}
                      className="w-full py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                    >
                      {isUpdatingScheduleDate ? '...' : 'Update'}
                    </button>
                  </div>
                </div>

                {/* 4. Time Slot */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={singleScheduleTime}
                      onChange={(e) => setSingleScheduleTime(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white cursor-pointer"
                    >
                      <option value="">-- Slot --</option>
                      {TIME_SLOTS.map((slot, idx) => (
                        <option key={`slot-single-${slot}-${idx}`} value={slot}>{slot}</option>
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
                      className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center"
                    >
                      {isUpdatingScheduleTime ? '...' : 'Update'}
                    </button>
                  </div>
                </div>

              </div>
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
