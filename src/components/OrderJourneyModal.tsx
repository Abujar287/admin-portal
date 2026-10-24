import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { OrderItem, FollowupHistoryItem } from '../types';
import { OrderService, formatActorUsernameId } from '../services/orderService';
import { getTimeSlots } from '../data/mockOrders';
import {
  X,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  FileText,
  Save,
  CheckCircle2,
  Tag,
  DollarSign,
  TrendingUp,
  History
} from 'lucide-react';

export interface OrderJourneyModalProps {
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
  followupHistory: initialFollowupHistory,
  currentUser,
  onUpdateOrderStatus,
  onViewCustomer
}) => {
  if (!order) return null;

  const orderId = String(order.order_id || order.id || '');
  const customerId = String(order.customer_id || order.customerId || '').trim();

  // Local followup history for instant optimistic rendering
  const [localHistory, setLocalHistory] = useState<FollowupHistoryItem[]>(() =>
    initialFollowupHistory.filter(h => String(h.orderId) === orderId)
  );

  // Field states
  const [followupStatus, setFollowupStatus] = useState<string>(
    order.followup_status || order.followupStatus || 'Follow-up'
  );
  const [scheduleDate, setScheduleDate] = useState<string>(
    order.schedule_date || order.scheduleDate || ''
  );
  const [scheduleTime, setScheduleTime] = useState<string>(
    order.schedule_time || order.scheduledTime || ''
  );
  const [editOrderValue, setEditOrderValue] = useState<string>(
    String(order.order_value ?? order.orderValue ?? '')
  );
  const [editProfit, setEditProfit] = useState<string>(
    String(order.profit ?? '')
  );
  const [editProfitPercent, setEditProfitPercent] = useState<string>(() => {
    const oVal = Number(order.order_value ?? order.orderValue ?? 0);
    const prVal = Number(order.profit ?? 0);
    return oVal > 0 && prVal > 0 ? ((prVal / oVal) * 100).toFixed(1).replace(/\.0$/, '') : '';
  });
  const [editAddress, setEditAddress] = useState<string>(
    order.address_details || order.addressDetails || ''
  );
  const [optionalNote, setOptionalNote] = useState<string>('');

  // UI interaction states
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingSection, setSubmittingSection] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const actorUserId = currentUser.user || '1';
  const actorUserName = currentUser.name || currentUser.user || 'User';
  const userDisplayName = formatActorUsernameId(actorUserName, actorUserId);

  const isDeliveredSelected = followupStatus.toLowerCase() === 'delivered';

  const STATUS_LIST = [
    'Follow-up',
    'Confirmed',
    'In Progress',
    'Delivered',
    'Cancelled',
    'Rescheduled',
    'Returned',
    'Pending'
  ];

  const timeSlots = getTimeSlots();

  const handleCopyOrderId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  const handleCopyPhone = () => {
    const phone = order.customer_mobile || order.customerContact || '';
    if (phone && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setScheduleDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleProfitChange = (valStr: string) => {
    setEditProfit(valStr);
    const pVal = parseFloat(valStr);
    const oVal = editOrderValue !== '' ? parseFloat(editOrderValue) : Number(order.order_value ?? order.orderValue ?? 0);
    if (oVal > 0 && !isNaN(pVal)) {
      setEditProfitPercent(((pVal / oVal) * 100).toFixed(1).replace(/\.0$/, ''));
    } else {
      setEditProfitPercent('');
    }
  };

  const handleProfitPercentChange = (pctStr: string) => {
    setEditProfitPercent(pctStr);
    const pct = parseFloat(pctStr);
    const oVal = editOrderValue !== '' ? parseFloat(editOrderValue) : Number(order.order_value ?? order.orderValue ?? 0);
    if (oVal > 0 && !isNaN(pct)) {
      setEditProfit(String(Math.round((oVal * pct) / 100)));
    } else {
      setEditProfit('');
    }
  };

  // Execute Individual Update
  const executeIndividualUpdate = async (
    sectionKey: string,
    updates: Partial<OrderItem>,
    noteToLog: string,
    successText: string
  ) => {
    if (!onUpdateOrderStatus || isSubmitting) return;

    setIsSubmitting(true);
    setSubmittingSection(sectionKey);
    setSuccessMsg(null);

    try {
      const nowTs = OrderService.getBdtTimestamp();
      updates.followup_date = nowTs;
      updates.followupDate = nowTs;

      const effectiveNote = optionalNote.trim() 
        ? `${noteToLog} | Note: ${optionalNote.trim()}`
        : noteToLog;

      const newHistoryItem: FollowupHistoryItem = {
        id: `local_${Date.now()}`,
        followupId: localHistory.length + 1,
        orderId: orderId,
        customerName: order.customer_name || order.customerName || '',
        customerContact: order.customer_mobile || order.customerContact || '',
        previousStatus: order.followup_status || order.followupStatus || 'Pending',
        newStatus: updates.followup_status || followupStatus,
        orderStatus: updates.order_status || 'Pending',
        orderValue: updates.order_value !== undefined ? Number(updates.order_value) : Number(order.order_value || 0),
        scheduleDate: updates.schedule_date !== undefined ? updates.schedule_date : scheduleDate,
        scheduledTime: updates.schedule_time !== undefined ? updates.schedule_time : scheduleTime,
        updatedBy: actorUserId,
        updatedByName: actorUserName,
        timestamp: nowTs,
        action: sectionKey,
        notes: effectiveNote
      };
      setLocalHistory(prev => [newHistoryItem, ...prev]);

      await onUpdateOrderStatus(orderId, updates, userDisplayName, effectiveNote);

      if (optionalNote.trim()) {
        setOptionalNote('');
      }

      setSuccessMsg(successText);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Update failed:', err);
      setSuccessMsg('Error: ' + (err?.message || 'Update failed'));
      setTimeout(() => setSuccessMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
      setSubmittingSection(null);
    }
  };

  // Individual Updaters
  const handleUpdateStatus = () => {
    const isNowDeliv = followupStatus.toLowerCase() === 'delivered';
    const isNowCanc = followupStatus.toLowerCase() === 'cancelled';
    const nowTs = OrderService.getBdtTimestamp();

    const updates: Partial<OrderItem> = {
      followup_status: followupStatus,
      followupStatus: followupStatus,
      order_status: isNowDeliv ? 'Delivered' : (isNowCanc ? 'Cancelled' : 'Pending'),
      orderStatus: isNowDeliv ? 'Delivered' : (isNowCanc ? 'Cancelled' : 'Pending')
    };

    if (isNowDeliv) {
      updates.delivered_date = nowTs;
      updates.deliveredDate = nowTs;
      const prVal = editProfit !== '' ? parseFloat(editProfit) : Number(order.profit || 0);
      updates.profit = prVal > 0 ? prVal : Math.round(Number(editOrderValue || order.order_value || 0) * 0.2);
    }
    if (isNowCanc) {
      updates.cancelled_date = nowTs;
      updates.cancelledDate = nowTs;
    }

    executeIndividualUpdate('status', updates, `Status updated to ${followupStatus}`, `Status updated to ${followupStatus}!`);
  };

  const handleUpdateDate = () => {
    executeIndividualUpdate('date', { schedule_date: scheduleDate, scheduleDate: scheduleDate }, `Schedule date set to ${scheduleDate || 'Unscheduled'}`, 'Schedule date updated!');
  };

  const handleUpdateSlot = () => {
    executeIndividualUpdate('slot', { schedule_time: scheduleTime, scheduledTime: scheduleTime }, `Delivery slot set to ${scheduleTime || 'None'}`, 'Delivery slot updated!');
  };

  const handleUpdateValueAndProfit = () => {
    const parsedVal = editOrderValue !== '' ? parseFloat(editOrderValue) : Number(order.order_value ?? order.orderValue ?? 0);
    const parsedProfit = editProfit !== '' ? parseFloat(editProfit) : Number(order.profit || 0);

    const updates: Partial<OrderItem> = {
      order_value: parsedVal,
      orderValue: parsedVal,
      profit: parsedProfit
    };

    executeIndividualUpdate('value', updates, `Order value updated to ৳${parsedVal} (Profit: ৳${parsedProfit})`, 'Order value & profit updated!');
  };

  const handleUpdateAddress = () => {
    const trimmedAddress = editAddress.trim();
    executeIndividualUpdate('address', { address_details: trimmedAddress, addressDetails: trimmedAddress }, `Address updated: ${trimmedAddress}`, 'Address updated!');
  };

  const phone = order.customer_mobile || order.customerContact || '';

  return ReactDOM.createPortal(
    /* Outer Backdrop: Clicking outside DOES NOT close the modal per user specification */
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
      
      {/* Modal Dialog Card */}
      <div 
        className="bg-[#111C3D] rounded-2xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-[#1E2C58] overflow-hidden my-auto text-[#E2E8F0]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* MODAL HEADER */}
        <div className="px-4 py-3 bg-[#0E1736] text-[#E2E8F0] flex items-center justify-between shrink-0 border-b border-[#1E2C58]">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            {/* Highlighted Order ID Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-500/60 shadow-xs font-mono font-black text-xs">
              <span>Order #{orderId}</span>
              <button
                type="button"
                onClick={handleCopyOrderId}
                title="Copy Order ID"
                className="p-0.5 rounded hover:bg-amber-900/60 text-amber-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedOrderId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Highlighted Customer ID Badge */}
            {customerId && (
              <button
                type="button"
                onClick={() => onViewCustomer && onViewCustomer(customerId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/90 hover:bg-blue-900 text-blue-300 hover:text-white border border-blue-500/60 transition-all font-mono font-bold text-xs shadow-xs cursor-pointer"
                title="Click to view Customer Profile & All Orders"
              >
                <User className="w-3 h-3 text-blue-400" />
                <span>CID: {customerId}</span>
              </button>
            )}

            <span className="text-xs font-semibold text-[#E2E8F0]">
              {order.customer_name || order.customerName || 'Customer'}
            </span>
            {phone && (
              <span className="inline-flex items-center gap-1 font-mono text-emerald-400 text-xs bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                <Phone className="w-3 h-3" />
                <a href={`tel:${phone}`} className="hover:underline font-bold">{phone}</a>
              </span>
            )}
          </div>

          {/* Prominent Close (X) Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#16234D] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/60 text-[#94A3B8] border border-[#1E2C58] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2 shadow-xs"
            title="Close Popup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Message Banner */}
        {successMsg && (
          <div className={`px-4 py-1.5 text-xs font-bold flex items-center gap-2 border-b transition-all ${
            successMsg.startsWith('Error') 
              ? 'bg-rose-950/80 text-rose-300 border-rose-800/60' 
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODAL BODY: EXACT 2-ROW DESIGN AS REQUESTED */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#090E21]">
          
          {/* 1. 2-ROW EDITABLE CONTROLS SECTION */}
          <div className="space-y-3">
            
            {/* ROW 1: Status & Update */}
            <div className="bg-[#0E1736] p-3.5 rounded-xl border border-[#1E2C58] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-black uppercase text-[#CBD5E1] mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Status</span>
                </label>
                <select
                  value={followupStatus}
                  onChange={(e) => setFollowupStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] focus:border-blue-500 focus:outline-hidden"
                >
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Profit if Delivered */}
              {isDeliveredSelected && (
                <div className="w-full sm:w-1/3 bg-emerald-950/40 p-2 rounded-lg border border-emerald-700/60 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-emerald-300 font-bold mb-0.5">Profit (৳)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editProfit}
                      onChange={(e) => handleProfitChange(e.target.value)}
                      placeholder="Profit"
                      className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-emerald-700 bg-[#080E21] text-emerald-300"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] text-emerald-300 font-bold mb-0.5">Profit %</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editProfitPercent}
                      onChange={(e) => handleProfitPercentChange(e.target.value)}
                      placeholder="%"
                      className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-emerald-700 bg-[#080E21] text-emerald-300"
                    />
                  </div>
                </div>
              )}

              <div className="w-full sm:w-auto self-end">
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submittingSection === 'status' ? 'Updating...' : 'Update Status'}</span>
                </button>
              </div>
            </div>

            {/* ROW 2: Schedule Date, Slot, Value, Address, Note with individual update buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Schedule Date */}
              <div className="bg-[#0E1736] p-3 rounded-xl border border-[#1E2C58] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-[#CBD5E1] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Schedule Date</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(0)}
                    className="text-[10px] font-bold text-indigo-300 hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                </div>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0]"
                />
                <button
                  type="button"
                  onClick={handleUpdateDate}
                  disabled={isSubmitting}
                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Update Date</span>
                </button>
              </div>

              {/* Delivery Slot */}
              <div className="bg-[#0E1736] p-3 rounded-xl border border-[#1E2C58] space-y-2">
                <label className="text-xs font-black uppercase text-[#CBD5E1] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Delivery Slot</span>
                </label>
                <select
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0]"
                >
                  <option value="">-- Select Slot --</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUpdateSlot}
                  disabled={isSubmitting}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Update Slot</span>
                </button>
              </div>

              {/* Order Value */}
              <div className="bg-[#0E1736] p-3 rounded-xl border border-[#1E2C58] space-y-2">
                <label className="text-xs font-black uppercase text-[#CBD5E1] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Order Value</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editOrderValue}
                    onChange={(e) => setEditOrderValue(e.target.value)}
                    placeholder="Value"
                    className="w-full pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[#1E2C58] bg-[#080E21] text-amber-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdateValueAndProfit}
                  disabled={isSubmitting}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Update Value</span>
                </button>
              </div>

              {/* Address */}
              <div className="bg-[#0E1736] p-3 rounded-xl border border-[#1E2C58] space-y-2">
                <label className="text-xs font-black uppercase text-[#CBD5E1] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Address</span>
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Address..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] truncate"
                />
                <button
                  type="button"
                  onClick={handleUpdateAddress}
                  disabled={isSubmitting}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Update Address</span>
                </button>
              </div>

            </div>
          </div>

          {/* 2. ORDER SUMMARY BANNER (NICEY OI ORDER ER SUMMARY) */}
          <div className="bg-[#0E1736] p-3 rounded-xl border border-[#1E2C58] space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Order Summary &amp; Details</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#080E21] p-2 rounded-lg border border-[#1E2C58]">
                <span className="text-[10px] text-[#94A3B8] block">Product Category</span>
                <span className="font-bold text-[#E2E8F0]">{order.product_category || order.productCategory || '-'}</span>
              </div>
              <div className="bg-[#080E21] p-2 rounded-lg border border-[#1E2C58]">
                <span className="text-[10px] text-[#94A3B8] block">Order Value</span>
                <span className="font-bold font-mono text-amber-300">৳{(Number(order.order_value || order.orderValue || 0)).toLocaleString()}</span>
              </div>
              <div className="bg-[#080E21] p-2 rounded-lg border border-[#1E2C58]">
                <span className="text-[10px] text-[#94A3B8] block">Profit</span>
                <span className="font-bold font-mono text-emerald-400">৳{(Number(order.profit || 0)).toLocaleString()}</span>
              </div>
              <div className="bg-[#080E21] p-2 rounded-lg border border-[#1E2C58]">
                <span className="text-[10px] text-[#94A3B8] block">Channel</span>
                <span className="font-bold text-indigo-300">{order.order_channel || '-'}</span>
              </div>
            </div>
          </div>

          {/* 3. ORDER HISTORY (NICEY ORDER ER HISTORY) */}
          <div className="bg-[#0E1736] p-3 rounded-xl border border-[#1E2C58] space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Order Followup &amp; Activity History</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {localHistory.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#64748B]">No history logs found for this order.</div>
              ) : (
                localHistory.map((h, i) => (
                  <div key={`hist-${h.id || i}`} className="bg-[#080E21] p-2 rounded-lg border border-[#1E2C58] text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#94A3B8]">{h.timestamp}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">{h.action || 'Followup'}</span>
                        <span className="font-mono font-bold text-blue-400">{formatActorUsernameId(h.updatedByName, h.updatedBy)}</span>
                      </div>
                      <p className="text-[#CBD5E1] text-[11px] mt-0.5 truncate">{h.notes || '-'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                      {h.newStatus || h.orderStatus || 'Updated'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-3 bg-[#0E1736] border-t border-[#1E2C58] flex items-center justify-between shrink-0 gap-3">
          {customerId && onViewCustomer ? (
            <button
              type="button"
              onClick={() => onViewCustomer(customerId)}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Profile ➔</span>
            </button>
          ) : (
            <div className="text-xs text-[#94A3B8] font-mono">
              #{orderId}
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Prominent Explicit Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 bg-[#1E2C58] hover:bg-[#2A3E78] text-[#E2E8F0] border border-[#2D3E72] rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
