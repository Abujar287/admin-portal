import React, { useState, useMemo } from 'react';
import { OrderItem, FollowupHistoryItem } from '../types';
import { OrderService } from '../services/orderService';
import { TIME_SLOTS } from '../data/mockOrders';
import {
  X,
  History,
  CheckCircle2,
  Clock,
  User,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Edit3,
  Save,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

export interface OrderJourneyStep {
  stepNumber: number;
  id: string;
  title: string;
  action: string;
  timestamp: string;
  performedBy: string;
  role: 'Agent' | 'Manager' | 'System' | 'Team Leader';
  previousStatus?: string;
  newStatus?: string;
  orderStatus?: string;
  orderValue?: number;
  profit?: number;
  scheduleDate?: string;
  scheduledTime?: string;
  notes?: string;
  isUndo?: boolean;
  isUndone?: boolean;
  channel?: string;
  details: {
    label: string;
    value: string;
    highlight?: boolean;
    badgeColor?: string;
  }[];
}

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
  const [activeTab, setActiveTab] = useState<'journey' | 'edit' | 'details'>('journey');
  const [copiedId, setCopiedId] = useState(false);
  const [journeySortAsc, setJourneySortAsc] = useState<boolean>(true);

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
  const [singleScheduleTime, setSingleScheduleTime] = useState<string>(
    order.schedule_time || order.scheduledTime || ''
  );
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  const handleCopyOrderId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Build journey steps
  const journeySteps: OrderJourneyStep[] = useMemo(() => {
    const steps: OrderJourneyStep[] = [];
    let stepNum = 1;

    const createTime = order.create_date || order.createDate || order.createdAt || '2026-01-01 10:00:00';
    const creatorName = order.agent_name || order.agentName || 'Agent';
    const creatorId = order.agent_id || order.agentId || 'agent';
    const channel = order.order_channel || order.orderChannel || 'Acquisition';
    const initialVal = Number(order.order_value ?? order.orderValue ?? 0);
    const initialProd = order.product_name || order.productName || 'Product';
    const initialCat = order.product_category || order.productCategory || 'General';

    steps.push({
      stepNumber: stepNum++,
      id: `step-init-${orderId}`,
      title: 'Order Created & Placed',
      action: 'Order Creation',
      timestamp: createTime,
      performedBy: `${creatorName} (@${creatorId})`,
      role: 'Agent',
      previousStatus: 'None',
      newStatus: 'Pending',
      orderStatus: 'Pending',
      orderValue: initialVal,
      channel: channel,
      notes: `Order placed via ${channel} channel for ${initialProd}.`,
      details: [
        { label: 'Action Type', value: 'Order Creation', highlight: true },
        { label: 'Who Created', value: `${creatorName} (@${creatorId}) [Agent]` },
        { label: 'Datetime', value: OrderService.formatDateTime(createTime) },
        { label: 'Initial Status', value: 'Pending', badgeColor: 'bg-amber-100 text-amber-800' },
        { label: 'Initial Value', value: `৳ ${initialVal.toLocaleString()}` }
      ]
    });

    const orderHistory = followupHistory
      .filter((h) => String(h.orderId) === String(orderId))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (orderHistory.length > 0) {
      orderHistory.forEach((hist) => {
        const isUndoAction = hist.isUndo || hist.action?.toLowerCase().includes('revert') || hist.action?.toLowerCase().includes('undo');
        const roleType: 'Manager' | 'Agent' = (hist.updatedBy || '').toLowerCase().includes('manager') ? 'Manager' : 'Agent';

        steps.push({
          stepNumber: stepNum++,
          id: `step-hist-${hist.id}`,
          title: hist.action || 'Status & Value Update',
          action: hist.action || 'Follow-up Update',
          timestamp: hist.timestamp,
          performedBy: hist.updatedBy || 'Manager',
          role: roleType,
          previousStatus: hist.previousStatus,
          newStatus: hist.newStatus,
          orderStatus: hist.orderStatus,
          orderValue: hist.orderValue,
          scheduleDate: hist.scheduleDate,
          scheduledTime: hist.scheduledTime,
          notes: hist.notes,
          isUndo: isUndoAction,
          isUndone: hist.isUndone,
          details: [
            { label: 'Action Type', value: hist.action || 'Status Update', highlight: true },
            { label: 'Updated By', value: `${hist.updatedBy} [${roleType}]` },
            { label: 'Datetime', value: OrderService.formatDateTime(hist.timestamp) },
            {
              label: 'Status Change',
              value: `${hist.previousStatus || 'Pending'} ➔ ${hist.newStatus}`,
              badgeColor: hist.newStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
            },
            ...(hist.orderValue !== undefined ? [{ label: 'Price / Value', value: `৳ ${Number(hist.orderValue).toLocaleString()}`, highlight: true }] : []),
            ...(hist.scheduleDate ? [{ label: 'Schedule Date & Time', value: `${hist.scheduleDate} (${hist.scheduledTime || 'N/A'})` }] : []),
            ...(hist.notes ? [{ label: 'Remarks / Notes', value: hist.notes }] : [])
          ]
        });
      });
    }

    return steps;
  }, [order, followupHistory, orderId]);

  const displaySteps = useMemo(() => {
    const list = [...journeySteps];
    return journeySortAsc ? list : list.reverse();
  }, [journeySteps, journeySortAsc]);

  // Handle Single Status Update
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
      setStatusMsg('Status updated & synced!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Single Price / Value Update
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
        `Price / Value updated to ৳${parsedVal.toLocaleString()}`
      );
      setValueMsg('Price updated & synced!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setValueMsg(null), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingValue(false);
    }
  };

  // Handle Single Schedule Update
  const handleUpdateScheduleOnly = async () => {
    if (!onUpdateOrderStatus) return;
    setIsUpdatingSchedule(true);
    setScheduleMsg(null);
    try {
      const userDisplayName = `${currentUser.name || currentUser.user} (@${currentUser.user})`;

      await onUpdateOrderStatus(
        orderId,
        {
          schedule_date: singleScheduleDate,
          scheduleDate: singleScheduleDate,
          schedule_time: singleScheduleTime,
          scheduledTime: singleScheduleTime
        },
        userDisplayName,
        `Schedule updated to ${singleScheduleDate} (${singleScheduleTime})`
      );
      setScheduleMsg('Schedule updated & synced!');
      if (onRefreshOrders) await onRefreshOrders();
      setTimeout(() => setScheduleMsg(null), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const isDelivered = (order.followup_status || order.followupStatus || '').toLowerCase() === 'delivered';
  const isCancelled = (order.followup_status || order.followupStatus || '').toLowerCase() === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md ring-2 ring-white/20">
              #{orderId}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Order Details &amp; Single Actions</span>
                  <button
                    onClick={handleCopyOrderId}
                    title="Copy Order ID"
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </h2>
                
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
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
              <p className="text-xs text-indigo-200/80 mt-0.5 flex items-center gap-2">
                <span>Customer: <strong className="text-white">{order.customer_name || order.customerName}</strong> ({order.customer_mobile || order.customerContact})</span>
                <span>•</span>
                <span>Agent: <strong className="text-white">{order.agent_name || order.agentName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUBNAV */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('journey')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'journey' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Journey Table (Status &amp; Price History)</span>
            </button>
            {canEdit && (
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'edit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Single Actions (Update Status / Price / Schedule)</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'details' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>All 22 Properties</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            User: <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">{currentUser.name || currentUser.user}</span>
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50">

          {/* TAB 1: JOURNEY TABLE (ROW-WISE STATUS CHANGE, PRICE CHANGE & DATETIME) */}
          {activeTab === 'journey' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-4 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 font-bold">
                    📋
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Order Journey History Table (স্ট্যাটাস ও মূল্য পরিবর্তনের বিস্তারিত সারি)</h3>
                    <p className="text-[11px] text-indigo-200">
                      Row-wise breakdown showing previous status, new status, price updates, who performed, and datetime.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setJourneySortAsc(!journeySortAsc)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{journeySortAsc ? '1st ➔ Latest' : 'Latest ➔ 1st'}</span>
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* TABLE OF CHANGES */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-800 to-purple-900 text-white font-bold">
                        <th className="py-3.5 px-4 whitespace-nowrap">Step #</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Action Type</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Status Change (Previous ➔ New)</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Price / Value (৳)</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Updated By</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Date &amp; Time (Datetime)</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {displaySteps.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                            No journey records logged yet.
                          </td>
                        </tr>
                      ) : (
                        displaySteps.map((step) => {
                          const isInit = step.stepNumber === 1;
                          const isDeliv = step.newStatus === 'Delivered';
                          const isCanc = step.newStatus === 'Cancelled';

                          return (
                            <tr key={`journey-row-${step.id}`} className="hover:bg-indigo-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 inline-flex items-center justify-center text-xs mr-1.5">
                                  {step.stepNumber}
                                </span>
                                #{step.stepNumber}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  isInit ? 'bg-amber-100 text-amber-900' : isDeliv ? 'bg-emerald-100 text-emerald-900' : isCanc ? 'bg-rose-100 text-rose-900' : 'bg-indigo-100 text-indigo-900'
                                }`}>
                                  {step.action}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                    {step.previousStatus || 'None'}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                                  <span className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                                    isDeliv ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : isCanc ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                                  }`}>
                                    {step.newStatus || 'Pending'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-emerald-700">
                                {step.orderValue !== undefined ? `৳ ${Number(step.orderValue).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-bold text-slate-900">{step.performedBy}</span>
                                <span className="ml-1.5 text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                                  {step.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 font-bold">
                                {OrderService.formatDateTime(step.timestamp)}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 max-w-[220px] truncate" title={step.notes}>
                                {step.notes || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SINGLE ACTIONS (INDEPENDENT UPDATE ROWS WITH [UPDATE] BUTTONS) */}
          {activeTab === 'edit' && canEdit && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>Single Action Updates (এককভাবে স্ট্যাটাস বা মূল্য পরিবর্তন করুন)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select or type the specific field you want to update, then click the corresponding **Update** button next to it.
                </p>
              </div>

              {/* ACTION 1: STATUS CHANGE ROW */}
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    1. Followup Status Change (বর্তমান স্ট্যাটাস পরিবর্তন)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Current: <strong className="text-indigo-700">{order.followup_status || order.followupStatus || 'Pending'}</strong>
                  </p>
                  <select
                    value={singleStatus}
                    onChange={(e) => setSingleStatus(e.target.value)}
                    className="w-full sm:max-w-xs px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {statusMsg && (
                    <span className="text-xs font-bold text-emerald-600 animate-fadeIn">
                      {statusMsg}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={handleUpdateStatusOnly}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isUpdatingStatus ? 'Updating...' : 'Update'}</span>
                  </button>
                </div>
              </div>

              {/* ACTION 2: PRICE / ORDER VALUE CHANGE ROW */}
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    2. Price / Order Value Change (মূল্য বা অর্ডার ভ্যালু পরিবর্তন)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Current Value: <strong className="text-emerald-700">৳ {Number(order.order_value ?? order.orderValue ?? 0).toLocaleString()}</strong>
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={singleValue}
                    onChange={(e) => setSingleValue(e.target.value)}
                    placeholder="Enter new price..."
                    className="w-full sm:max-w-xs px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {valueMsg && (
                    <span className="text-xs font-bold text-emerald-600 animate-fadeIn">
                      {valueMsg}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isUpdatingValue || singleValue === ''}
                    onClick={handleUpdateValueOnly}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isUpdatingValue ? 'Updating...' : 'Update'}</span>
                  </button>
                </div>
              </div>

              {/* ACTION 3: SCHEDULE CHANGE ROW */}
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    3. Schedule Date &amp; Time Slot Change (সিডিউল তারিখ ও সময় পরিবর্তন)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Current: <strong className="text-sky-700">{order.schedule_date || order.scheduleDate || 'None'} ({order.schedule_time || order.scheduledTime || '-'})</strong>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
                    <input
                      type="date"
                      value={singleScheduleDate}
                      onChange={(e) => setSingleScheduleDate(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                    <select
                      value={singleScheduleTime}
                      onChange={(e) => setSingleScheduleTime(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white cursor-pointer"
                    >
                      <option value="">-- Time Slot --</option>
                      {TIME_SLOTS.map((slot, idx) => (
                        <option key={`slot-single-${slot}-${idx}`} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {scheduleMsg && (
                    <span className="text-xs font-bold text-emerald-600 animate-fadeIn">
                      {scheduleMsg}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isUpdatingSchedule}
                    onClick={handleUpdateScheduleOnly}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isUpdatingSchedule ? 'Updating...' : 'Update'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: ALL PROPERTIES */}
          {activeTab === 'details' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 border-b pb-2">
                All 22 Order Properties for #{orderId}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
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
                  <div key={`col-${idx}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                      {col.label}
                    </span>
                    <span className="font-semibold text-slate-800 break-words">{col.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Order #{orderId} • {displaySteps.length} journey events recorded
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
