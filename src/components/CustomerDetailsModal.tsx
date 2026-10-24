import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  CreditCard, 
  PieChart, 
  Percent, 
  Copy, 
  Check, 
  History, 
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Tag
} from 'lucide-react';
import { OrderItem, FollowupHistoryItem } from '../types';
import { OrderService, formatActorUsernameId } from '../services/orderService';

export interface CustomerDetailsModalProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  followupHistory: FollowupHistoryItem[];
  onViewOrderJourney?: (order: OrderItem) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customerId,
  isOpen,
  onClose,
  orders,
  followupHistory,
  onViewOrderJourney
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'followup'>('orders');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Find all orders belonging to this customer
  const customerOrders = useMemo(() => {
    if (!customerId) return [];
    const cleanId = String(customerId).trim().toLowerCase();
    const cleanPhone = cleanId.replace(/\D/g, '');
    const isPhoneQuery = cleanPhone.length >= 8;

    const matches: OrderItem[] = [];
    let primaryPhone = '';

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const cId = String(o.customer_id || o.customerId || '').trim().toLowerCase();
      const oPhone = String(o.customer_mobile || o.customerContact || '').replace(/\D/g, '');
      const oName = String(o.customer_name || o.customerName || '').trim().toLowerCase();

      if (cId === cleanId) {
        matches.push(o);
        if (!primaryPhone && oPhone.length >= 8) primaryPhone = oPhone;
      } else if (isPhoneQuery && oPhone === cleanPhone) {
        matches.push(o);
        if (!primaryPhone) primaryPhone = oPhone;
      } else if (oName && oName === cleanId) {
        matches.push(o);
        if (!primaryPhone && oPhone.length >= 8) primaryPhone = oPhone;
      }
    }

    if (matches.length > 0 && primaryPhone && primaryPhone !== cleanPhone) {
      const existingSet = new Set(matches);
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (!existingSet.has(o)) {
          const oPhone = String(o.customer_mobile || o.customerContact || '').replace(/\D/g, '');
          if (oPhone === primaryPhone) {
            matches.push(o);
          }
        }
      }
    }

    return matches;
  }, [customerId, orders]);

  // Derive primary customer profile info
  const primaryInfo = useMemo(() => {
    if (customerOrders.length > 0) {
      // Pick the most recent order for latest customer details
      const latest = customerOrders[0];
      return {
        id: String(latest.customer_id || latest.customerId || customerId),
        name: latest.customer_name || latest.customerName || 'Customer',
        phone: latest.customer_mobile || latest.customerContact || '',
        gender: latest.gender || '',
        city: (latest as any).district || latest.city || '',
        thana: (latest as any).thana || '',
        address: latest.address_details || latest.addressDetails || '',
        channel: latest.order_channel || ''
      };
    }
    return {
      id: String(customerId || ''),
      name: 'Customer',
      phone: '',
      gender: '',
      city: '',
      thana: '',
      address: '',
      channel: ''
    };
  }, [customerOrders, customerId]);

  // Calculate the 10 requested summary metrics:
  // create_orders, delivered_orders, cancelled_orders, order_value, delivered_order_value, profit, bucket_size, delivered_ratio, cancelled_ratio, nr_ratio
  const summaryMetrics = useMemo(() => {
    const create_orders = customerOrders.length;
    let delivered_orders = 0;
    let cancelled_orders = 0;
    let order_value = 0;
    let delivered_order_value = 0;
    let profit = 0;

    customerOrders.forEach((ord) => {
      const val = Number(ord.order_value ?? ord.orderValue ?? 0) || 0;
      const pr = Number(ord.profit ?? 0) || 0;
      const fStatus = String(ord.followup_status || ord.followupStatus || '').trim().toLowerCase();
      const oStatus = String(ord.order_status || ord.orderStatus || '').trim().toLowerCase();

      order_value += val;

      const isDelivered = fStatus === 'delivered' || oStatus === 'delivered';
      const isCancelled = fStatus === 'cancelled' || oStatus === 'cancelled';

      if (isDelivered) {
        delivered_orders += 1;
        delivered_order_value += val;
        profit += pr;
      } else if (isCancelled) {
        cancelled_orders += 1;
      }
    });

    const totalDelivCanc = delivered_orders + cancelled_orders;
    const delivered_ratio = totalDelivCanc > 0 
      ? Math.round((delivered_orders / totalDelivCanc) * 100) 
      : (create_orders > 0 ? Math.round((delivered_orders / create_orders) * 100) : 0);

    const cancelled_ratio = totalDelivCanc > 0 
      ? Math.round((cancelled_orders / totalDelivCanc) * 100) 
      : (create_orders > 0 ? Math.round((cancelled_orders / create_orders) * 100) : 0);

    const bucket_size = delivered_orders > 0 
      ? Math.round(delivered_order_value / delivered_orders) 
      : (create_orders > 0 ? Math.round(order_value / create_orders) : 0);

    const nr_ratio = delivered_order_value > 0 
      ? Number(((profit / delivered_order_value) * 100).toFixed(1)) 
      : 0;

    return {
      create_orders,
      delivered_orders,
      served_orders: delivered_orders,
      cancelled_orders,
      order_value,
      delivered_order_value,
      profit,
      bucket_size,
      delivered_ratio,
      cancelled_ratio,
      nr_ratio
    };
  }, [customerOrders]);

  // Master Category Logic: Find which category the customer ordered the most times from across their lifetime
  const masterCategoryInfo = useMemo(() => {
    if (!customerOrders || customerOrders.length === 0) {
      return { category: 'N/A', count: 0, percentage: 0 };
    }

    const counts: Record<string, { count: number; totalValue: number }> = {};
    customerOrders.forEach((ord) => {
      const cat = String(
        ord.product_category || (ord as any).productCategory || (ord as any).category || (ord as any).master_category || 'General'
      ).trim();
      const val = Number(ord.order_value ?? ord.orderValue ?? 0) || 0;
      if (!counts[cat]) {
        counts[cat] = { count: 0, totalValue: 0 };
      }
      counts[cat].count += 1;
      counts[cat].totalValue += val;
    });

    let topCategory = 'N/A';
    let maxCount = 0;
    let maxValue = 0;

    Object.entries(counts).forEach(([cat, data]) => {
      if (data.count > maxCount || (data.count === maxCount && data.totalValue > maxValue)) {
        topCategory = cat;
        maxCount = data.count;
        maxValue = data.totalValue;
      }
    });

    const percentage = customerOrders.length > 0 ? Math.round((maxCount / customerOrders.length) * 100) : 0;

    return {
      category: topCategory,
      count: maxCount,
      percentage
    };
  }, [customerOrders]);

  // Find all followup history records for this customer's orders
  const customerFollowups = useMemo(() => {
    if (!customerId) return [];
    const orderIdSet = new Set(customerOrders.map(o => String(o.order_id || o.id)));
    const cleanPhone = primaryInfo.phone.replace(/\D/g, '');

    return followupHistory.filter((h) => {
      if (orderIdSet.has(String(h.orderId))) return true;
      if (cleanPhone && h.customerContact && h.customerContact.replace(/\D/g, '').includes(cleanPhone)) return true;
      return false;
    });
  }, [customerId, customerOrders, followupHistory, primaryInfo.phone]);

  if (!isOpen || !customerId) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(primaryInfo.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPhone = () => {
    if (primaryInfo.phone) {
      navigator.clipboard.writeText(primaryInfo.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-[#111C3D] w-full max-w-5xl rounded-3xl shadow-2xl border border-[#1E2C58] flex flex-col max-h-[92vh] overflow-hidden text-[#E2E8F0] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-[#0E1736] text-[#E2E8F0] flex items-center justify-between border-b border-[#1E2C58] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#16234D] border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold shadow-md shrink-0">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-[#E2E8F0] truncate">
                  {primaryInfo.name}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-extrabold bg-blue-950/90 text-blue-300 border border-blue-500/60 shadow-md">
                  <span>CID: {primaryInfo.id}</span>
                  <button 
                    type="button" 
                    onClick={handleCopyId} 
                    className="hover:text-white transition-colors cursor-pointer ml-0.5 p-0.5 rounded hover:bg-blue-900/60"
                    title="Copy Customer ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
                {summaryMetrics.delivered_orders >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
                    <Sparkles className="w-3 h-3" /> VIP Customer
                  </span>
                )}
                {summaryMetrics.create_orders > 1 && summaryMetrics.delivered_orders < 3 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/80">
                    Repeat Buyer
                  </span>
                )}
                {masterCategoryInfo.category !== 'N/A' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/80" title="Lifetime Master Category">
                    <Tag className="w-3 h-3 text-purple-400" />
                    <span>Master Category: {masterCategoryInfo.category}</span>
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-1 flex-wrap font-sans">
                {primaryInfo.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <a href={`tel:${primaryInfo.phone}`} className="hover:underline text-emerald-400 font-semibold">
                      {primaryInfo.phone}
                    </a>
                    <button 
                      type="button" 
                      onClick={handleCopyPhone} 
                      className="hover:text-white ml-0.5 cursor-pointer text-[#94A3B8]"
                      title="Copy Mobile Number"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                )}
                {primaryInfo.gender && (
                  <span className="text-[#94A3B8]">
                    • {primaryInfo.gender}
                  </span>
                )}
                {(primaryInfo.city || primaryInfo.address) && (
                  <span className="flex items-center gap-1 text-[#94A3B8] truncate max-w-sm">
                    <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span className="truncate">
                      {[primaryInfo.address, primaryInfo.thana, primaryInfo.city].filter(Boolean).join(', ')}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#16234D] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0B132B] text-[#E2E8F0]">
          {/* MASTER CATEGORY PROMINENT DISPLAY CARD */}
          <div className="bg-[#111C3D] p-4 rounded-2xl border border-indigo-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                <Tag className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  Most Ordered Product Category
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm font-bold text-[#E2E8F0]">Master Category:</span>
                  <span className="text-base sm:text-lg font-black text-white bg-indigo-600/30 border border-indigo-400/60 px-3 py-0.5 rounded-xl text-indigo-200 shadow-sm">
                    {masterCategoryInfo.category}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="bg-[#080E21] px-3.5 py-2 rounded-xl border border-[#1E2C58] text-right">
                <span className="text-[10px] text-[#94A3B8] block uppercase">Orders in Category</span>
                <span className="text-sm font-mono font-black text-indigo-300">
                  {masterCategoryInfo.count} {masterCategoryInfo.count === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <div className="bg-[#080E21] px-3.5 py-2 rounded-xl border border-[#1E2C58] text-right">
                <span className="text-[10px] text-[#94A3B8] block uppercase">Category Share</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  {masterCategoryInfo.percentage}%
                </span>
              </div>
            </div>
          </div>

          {/* 10-METRICS SHORT SUMMARY */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-blue-400" />
                Customer Performance Summary
              </h4>
              <span className="text-[11px] text-[#94A3B8] font-medium font-mono">
                {customerOrders.length} Lifetime Orders Found
              </span>
            </div>

            {/* Grid of exact 10 metrics:
                create_orders, delivered_orders, cancelled_orders, order_value, delivered_order_value, profit, bucket_size, delivered_ratio, cancelled_ratio, nr_ratio */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* 1. create_orders */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">create_orders</span>
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-xl font-black text-blue-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.create_orders}
                </p>
                <span className="text-[10px] text-[#94A3B8] block truncate">Total Created</span>
              </div>

              {/* 2. delivered_orders */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">delivered_orders</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.delivered_orders}
                </p>
                <span className="text-[10px] text-emerald-400/80 font-medium block truncate">Delivered</span>
              </div>

              {/* 3. cancelled_orders */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">cancelled_orders</span>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <p className="text-xl font-black text-rose-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.cancelled_orders}
                </p>
                <span className="text-[10px] text-rose-400/80 font-medium block truncate">Cancelled</span>
              </div>

              {/* 4. order_value */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">order_value</span>
                  <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
                </div>
                <p className="text-lg sm:text-xl font-black text-[#E2E8F0] font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.order_value.toLocaleString()}
                </p>
                <span className="text-[10px] text-[#94A3B8] block truncate">Total Created Value</span>
              </div>

              {/* 5. delivered_order_value */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">delivered_order_value</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.delivered_order_value.toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-400/80 font-medium block truncate">Delivered Revenue</span>
              </div>

              {/* 6. profit */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">profit</span>
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.profit.toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-400/80 font-medium block truncate">Net Profit</span>
              </div>

              {/* 7. bucket_size */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">bucket_size</span>
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-lg sm:text-xl font-black text-blue-300 font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.bucket_size.toLocaleString()}
                </p>
                <span className="text-[10px] text-blue-300/80 font-medium block truncate">Avg Order Value</span>
              </div>

              {/* 8. delivered_ratio */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">delivered_ratio</span>
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.delivered_ratio}%
                </p>
                <span className="text-[10px] text-emerald-400/80 font-medium block truncate">Success Ratio</span>
              </div>

              {/* 9. cancelled_ratio */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">cancelled_ratio</span>
                  <Percent className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <p className="text-xl font-black text-rose-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.cancelled_ratio}%
                </p>
                <span className="text-[10px] text-rose-400/80 font-medium block truncate">Cancel Ratio</span>
              </div>

              {/* 10. nr_ratio */}
              <div className="bg-[#111C3D] p-3 rounded-2xl border border-[#1E2C58] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">nr_ratio</span>
                  <Percent className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <p className="text-xl font-black text-purple-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.nr_ratio}%
                </p>
                <span className="text-[10px] text-purple-400/80 font-medium block truncate">Net Revenue Margin</span>
              </div>
            </div>
          </div>

          {/* TABS: ORDER DETAILS & FOLLOWUP HISTORY */}
          <div className="bg-[#111C3D] rounded-2xl border border-[#1E2C58] shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between px-4 pt-3 border-b border-[#1E2C58] bg-[#0E1736]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('orders')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                    activeSubTab === 'orders'
                      ? 'border-blue-500 text-blue-400 bg-[#111C3D] rounded-t-xl'
                      : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>All Customer Orders ({customerOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('followup')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                    activeSubTab === 'followup'
                      ? 'border-blue-500 text-blue-400 bg-[#111C3D] rounded-t-xl'
                      : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Followup History ({customerFollowups.length})</span>
                </button>
              </div>

              <span className="text-[11px] text-[#94A3B8] font-mono font-medium hidden sm:inline">
                Customer #{primaryInfo.id}
              </span>
            </div>

            {/* TAB CONTENT: ORDER DETAILS */}
            {activeSubTab === 'orders' && (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0E1736] text-[#94A3B8] font-bold border-b border-[#1E2C58] sticky top-0 z-10 uppercase tracking-wider text-[11px] whitespace-nowrap">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Followup Status</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Items / Products</th>
                      <th className="py-2.5 px-3 text-right">Order Value</th>
                      <th className="py-2.5 px-3 text-right">Profit</th>
                      <th className="py-2.5 px-3">Agent</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2C58] text-[#E2E8F0]">
                    {customerOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-[#64748B] font-medium">
                          No orders found for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerOrders.map((ord, idx) => {
                        const ordId = String(ord.order_id || ord.id);
                        const fStatus = ord.followup_status || ord.followupStatus || 'Pending';
                        const isDeliv = fStatus.toLowerCase() === 'delivered';
                        const isCanc = fStatus.toLowerCase() === 'cancelled';

                        return (
                          <tr key={`cust-ord-${ordId}-${idx}`} className="hover:bg-[#16234D] transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                              {onViewOrderJourney ? (
                                <button
                                  type="button"
                                  onClick={() => onViewOrderJourney(ord)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-black text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-900 border border-amber-500/60 hover:border-amber-400 shadow-sm transition-all cursor-pointer ring-1 ring-amber-500/20"
                                  title="Click to view & update Order details"
                                >
                                  <span className="text-amber-400 font-bold">#</span>
                                  <span>{ordId}</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-black text-amber-300 bg-amber-950/70 border border-amber-500/60 shadow-sm">
                                  <span className="text-amber-400 font-bold">#</span>
                                  <span>{ordId}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                              {OrderService.formatDateTime(ord.create_date)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#080E21] text-[#94A3B8] border border-[#1E2C58]">
                                {ord.order_channel || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isDeliv 
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80' 
                                  : isCanc 
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-700/80' 
                                  : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                              }`}>
                                {fStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {(() => {
                                const catName = ord.product_category || (ord as any).productCategory || (ord as any).category || '-';
                                const isMaster = catName !== '-' && catName === masterCategoryInfo.category;
                                return isMaster ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/80" title="Matches Lifetime Master Category">
                                    <Tag className="w-2.5 h-2.5 text-indigo-400" />
                                    <span>{catName} (Master)</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-[#E2E8F0]">
                                    {catName}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs truncate text-[#CBD5E1]" title={ord.product_name || (ord as any).products || ''}>
                              {ord.product_name || (ord as any).products || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#E2E8F0] whitespace-nowrap">
                              {Number(ord.order_value || ord.orderValue || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {Number(ord.profit || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#94A3B8] whitespace-nowrap">
                              {ord.agent_name || ord.agent_id || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {onViewOrderJourney && (
                                <button
                                  type="button"
                                  onClick={() => onViewOrderJourney(ord)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 transition-colors cursor-pointer"
                                  title="Open order journey"
                                >
                                  <span>View Order</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: FOLLOWUP HISTORY */}
            {activeSubTab === 'followup' && (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0E1736] text-[#94A3B8] font-bold border-b border-[#1E2C58] sticky top-0 z-10 uppercase tracking-wider text-[11px] whitespace-nowrap">
                      <th className="py-2.5 px-3">Followup ID</th>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Previous Status</th>
                      <th className="py-2.5 px-3">New Status</th>
                      <th className="py-2.5 px-3">Schedule Date/Time</th>
                      <th className="py-2.5 px-3">Updated By</th>
                      <th className="py-2.5 px-3">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2C58] text-[#E2E8F0]">
                    {customerFollowups.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-[#64748B] font-medium">
                          No followup history found for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerFollowups.map((hist, hIdx) => {
                        return (
                          <tr key={`cust-fol-${hist.id || hist.followupId || hIdx}-${hIdx}`} className="hover:bg-[#16234D] transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#94A3B8] whitespace-nowrap">
                              #{hist.followupId || hist.id}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                              #{hist.orderId}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                              {hist.timestamp}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#080E21] text-[#94A3B8] border border-[#1E2C58]">
                                {hist.previousStatus || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/80">
                                {hist.newStatus || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                              {hist.scheduleDate ? `${hist.scheduleDate} ${hist.scheduledTime || ''}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono font-medium text-[#E2E8F0]">
                              {formatActorUsernameId(hist.updatedByName, hist.updatedBy)}
                            </td>
                            <td className="py-2.5 px-3 text-[#CBD5E1] max-w-sm truncate" title={hist.notes || ''}>
                              {hist.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-[#0E1736] border-t border-[#1E2C58] flex items-center justify-between text-xs text-[#94A3B8] shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E2E8F0]">Customer 360 View</span>
            <span>•</span>
            <span>All lifetime records and audits synchronized</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1E2C58] hover:bg-[#2A3E78] text-[#E2E8F0] border border-[#2D3E72] font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
