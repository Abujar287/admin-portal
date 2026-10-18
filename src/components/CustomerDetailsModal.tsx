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
  Calendar, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  History, 
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Tag
} from 'lucide-react';
import { OrderItem, FollowupHistoryItem } from '../types';
import { OrderService } from '../services/orderService';

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
    
    // First find by customer_id or customerId
    const directMatches = orders.filter((o) => {
      const cId = String(o.customer_id || o.customerId || '').trim().toLowerCase();
      return cId === cleanId;
    });

    if (directMatches.length > 0) {
      // Also grab phone number to catch any other order that might share this phone
      const phone = (directMatches[0].customer_mobile || directMatches[0].customerContact || '').replace(/\D/g, '');
      if (phone && phone.length >= 8) {
        return orders.filter((o) => {
          const cId = String(o.customer_id || o.customerId || '').trim().toLowerCase();
          if (cId === cleanId) return true;
          const oPhone = String(o.customer_mobile || o.customerContact || '').replace(/\D/g, '');
          return oPhone === phone;
        });
      }
      return directMatches;
    }

    return [];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-md shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {primaryInfo.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  ID: {primaryInfo.id}
                  <button 
                    type="button" 
                    onClick={handleCopyId} 
                    className="hover:text-white transition-colors cursor-pointer"
                    title="Copy Customer ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
                {summaryMetrics.delivered_orders >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    <Sparkles className="w-3 h-3" /> VIP Customer
                  </span>
                )}
                {summaryMetrics.create_orders > 1 && summaryMetrics.delivered_orders < 3 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Repeat Buyer
                  </span>
                )}
                {masterCategoryInfo.category !== 'N/A' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30" title="Lifetime Master Category">
                    <Tag className="w-3 h-3 text-purple-300" />
                    <span>Master Category: {masterCategoryInfo.category}</span>
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap font-sans">
                {primaryInfo.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <a href={`tel:${primaryInfo.phone}`} className="hover:underline text-indigo-300 font-semibold">
                      {primaryInfo.phone}
                    </a>
                    <button 
                      type="button" 
                      onClick={handleCopyPhone} 
                      className="hover:text-white ml-0.5 cursor-pointer text-slate-400"
                      title="Copy Mobile Number"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                )}
                {primaryInfo.gender && (
                  <span className="text-slate-400">
                    • {primaryInfo.gender}
                  </span>
                )}
                {(primaryInfo.city || primaryInfo.address) && (
                  <span className="flex items-center gap-1 text-slate-300 truncate max-w-sm">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
          {/* 10-METRICS SHORT SUMMARY */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                Customer Performance Summary
              </h4>
              <span className="text-[11px] text-slate-500 font-medium font-mono">
                {customerOrders.length} Lifetime Orders Found
              </span>
            </div>

            {/* MASTER CATEGORY HIGHLIGHT CARD */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-purple-950/20 p-3.5 sm:p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-2xs mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Master Category (Lifetime Top Preference)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200">
                      {masterCategoryInfo.count} {masterCategoryInfo.count === 1 ? 'Order' : 'Orders'} ({masterCategoryInfo.percentage}%)
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {masterCategoryInfo.category}
                  </h3>
                </div>
              </div>

              <div className="text-xs text-purple-800 dark:text-purple-300 font-medium bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-700/50">
                সবচেয়ে বেশি অর্ডার করেছেন: <strong className="font-bold text-purple-900 dark:text-purple-100">{masterCategoryInfo.category}</strong>
              </div>
            </div>

            {/* Grid of exact 10 metrics:
                create_orders, delivered_orders, cancelled_orders, order_value, delivered_order_value, profit, bucket_size, delivered_ratio, cancelled_ratio, nr_ratio */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* 1. create_orders */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">create_orders</span>
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.create_orders}
                </p>
                <span className="text-[10px] text-slate-500 block truncate">Total Created</span>
              </div>

              {/* 2. delivered_orders */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">delivered_orders</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.delivered_orders}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium block truncate">Delivered</span>
              </div>

              {/* 3. cancelled_orders */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">cancelled_orders</span>
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.cancelled_orders}
                </p>
                <span className="text-[10px] text-rose-500 font-medium block truncate">Cancelled</span>
              </div>

              {/* 4. order_value */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">order_value</span>
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.order_value.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500 block truncate">Total Created Value</span>
              </div>

              {/* 5. delivered_order_value */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">delivered_order_value</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.delivered_order_value.toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium block truncate">Delivered Revenue</span>
              </div>

              {/* 6. profit */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">profit</span>
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.profit.toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-600 font-medium block truncate">Net Profit</span>
              </div>

              {/* 7. bucket_size */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">bucket_size</span>
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-400 font-mono tabular-nums mt-1 truncate">
                  {summaryMetrics.bucket_size.toLocaleString()}
                </p>
                <span className="text-[10px] text-blue-600 font-medium block truncate">Avg Order Value</span>
              </div>

              {/* 8. delivered_ratio */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">delivered_ratio</span>
                  <Percent className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.delivered_ratio}%
                </p>
                <span className="text-[10px] text-emerald-600 font-medium block truncate">Success Ratio</span>
              </div>

              {/* 9. cancelled_ratio */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">cancelled_ratio</span>
                  <Percent className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.cancelled_ratio}%
                </p>
                <span className="text-[10px] text-rose-500 font-medium block truncate">Cancel Ratio</span>
              </div>

              {/* 10. nr_ratio */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">nr_ratio</span>
                  <Percent className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <p className="text-xl font-black text-purple-700 dark:text-purple-400 font-mono tabular-nums mt-1">
                  {summaryMetrics.nr_ratio}%
                </p>
                <span className="text-[10px] text-purple-600 font-medium block truncate">Net Revenue Margin</span>
              </div>
            </div>
          </div>

          {/* TABS: ORDER DETAILS & FOLLOWUP HISTORY */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('orders')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                    activeSubTab === 'orders'
                      ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Order Details ({customerOrders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('followup')}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
                    activeSubTab === 'followup'
                      ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Followup History ({customerFollowups.length})</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-mono font-medium hidden sm:inline">
                Customer #{primaryInfo.id}
              </span>
            </div>

            {/* TAB CONTENT: ORDER DETAILS */}
            {activeSubTab === 'orders' && (
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 uppercase tracking-wider text-[11px] whitespace-nowrap">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Followup Status</th>
                      <th className="py-2.5 px-3">Order Status</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Items / Products</th>
                      <th className="py-2.5 px-3 text-right">Order Value</th>
                      <th className="py-2.5 px-3 text-right">Profit</th>
                      <th className="py-2.5 px-3">Agent</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                    {customerOrders.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-slate-400 font-medium">
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
                          <tr key={`cust-ord-${ordId}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                              #{ordId}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {OrderService.formatDateTime(ord.create_date)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {ord.order_channel || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isDeliv 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : isCanc 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {fStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                {ord.order_status || ord.orderStatus || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {(() => {
                                const catName = ord.product_category || (ord as any).productCategory || (ord as any).category || '-';
                                const isMaster = catName !== '-' && catName === masterCategoryInfo.category;
                                return isMaster ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Master Category match">
                                    <Tag className="w-2.5 h-2.5" />
                                    <span>{catName}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                    {catName}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs truncate" title={ord.product_name || (ord as any).products || ''}>
                              {ord.product_name || (ord as any).products || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {Number(ord.order_value || ord.orderValue || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                              {Number(ord.profit || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {ord.agent_name || ord.agent_id || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {onViewOrderJourney && (
                                <button
                                  type="button"
                                  onClick={() => onViewOrderJourney(ord)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                                  title="Open order journey & edit"
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
                    <tr className="bg-slate-100/90 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 uppercase tracking-wider text-[11px] whitespace-nowrap">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-800 dark:text-slate-200">
                    {customerFollowups.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                          No followup history found for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerFollowups.map((hist, hIdx) => {
                        return (
                          <tr key={`cust-fol-${hist.id || hist.followupId || hIdx}-${hIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                              #{hist.followupId || hist.id}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                              #{hist.orderId}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {hist.timestamp}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {hist.previousStatus || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {hist.newStatus || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {hist.scheduleDate ? `${hist.scheduleDate} ${hist.scheduledTime || ''}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                              {hist.updatedByName || hist.updatedBy || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-sm truncate" title={hist.notes || ''}>
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
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Customer 360 View</span>
            <span>•</span>
            <span>All lifetime records and audits synchronized</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
