import React, { useState, useMemo } from 'react';
import { AgentUser, DateFilterType, OrderItem } from '../types';
import { OrderService } from '../services/orderService';
import { CreateOrderModal } from './CreateOrderModal';
import { 
  RotateCw, 
  Search, 
  FilterX, 
  Eye, 
  X, 
  CheckCircle, 
  Clock, 
  Plus, 
  Lock, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Package, 
  User,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Save,
  AlertTriangle
} from 'lucide-react';
import { getOrderStatuses, ORDER_STATUS_LIST, TIME_SLOTS } from '../data/mockOrders';
import { isOrderAssignedToAgent } from '../utils/agentMatching';

interface MyOrdersViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onOrderCreated: (order: OrderItem) => void;
  onUpdateOrderStatus?: (
    orderId: string, 
    updates: Partial<OrderItem>, 
    updatedBy?: string, 
    notes?: string
  ) => Promise<void>;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  currentAgent,
  orders,
  onRefresh,
  isRefreshing,
  onOrderCreated,
  onUpdateOrderStatus
}) => {
  const [filterCreateDate, setFilterCreateDate] = useState<DateFilterType>('');
  const [filterScheduleDate, setFilterScheduleDate] = useState<DateFilterType>('');
  const [filterFollowupStatus, setFilterFollowupStatus] = useState<string>('all');
  const [searchType, setSearchType] = useState<string>('order_id');
  const [searchValue, setSearchValue] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit fields for opened order
  const [editOrderStatus, setEditOrderStatus] = useState<string>('Pending');
  const [editFollowupStatus, setEditFollowupStatus] = useState<string>('Pending');
  const [editScheduleDate, setEditScheduleDate] = useState<string>('');
  const [editScheduleTime, setEditScheduleTime] = useState<string>('');
  const [editOrderValue, setEditOrderValue] = useState<string>('');
  const [editProfit, setEditProfit] = useState<string>('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSaveMsg, setOrderSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Agent permissions check
  const perms = currentAgent.permissions || { 
    canCreate: true, 
    canUpdateStatus: true, 
    canChangeSchedule: true,
    canChangeValue: true, 
    canAddProfit: true, 
    allowedOrderStatuses: ['Pending', 'In Progress', 'Confirmed', 'Follow-up']
  };

  const allowedStatuses = useMemo(() => {
    if (!perms.canUpdateStatus) return [];
    let list = perms.allowedOrderStatuses && Array.isArray(perms.allowedOrderStatuses) && perms.allowedOrderStatuses.length > 0
      ? perms.allowedOrderStatuses
      : getOrderStatuses();
    if (perms.canCancel === false) {
      list = list.filter(s => s.toLowerCase() !== 'cancelled');
    }
    return list;
  }, [perms.canUpdateStatus, perms.allowedOrderStatuses, perms.canCancel]);

  const canEditAnyField = perms.canUpdateStatus || perms.canChangeSchedule || perms.canChangeValue || perms.canAddProfit;

  const handleOpenOrder = (ord: OrderItem) => {
    setSelectedOrder(ord);
    setEditOrderStatus(ord.order_status || ord.orderStatus || 'Pending');
    setEditFollowupStatus(ord.followup_status || ord.followupStatus || 'Pending');
    const rawDate = ord.schedule_date || ord.scheduleDate || '';
    setEditScheduleDate(rawDate ? rawDate.split('T')[0].split(' ')[0] : '');
    setEditScheduleTime(ord.schedule_time || ord.scheduledTime || '');
    setEditOrderValue(String(ord.order_value ?? ord.orderValue ?? '0'));
    setEditProfit(String(ord.profit ?? '0'));
    setOrderSaveMsg(null);
  };

  // STRICTLY only this agent's orders (data isolation for agent portal with flexible matching)
  const myAgentOrders = useMemo(() => {
    return orders.filter((o) => isOrderAssignedToAgent(o, currentAgent));
  }, [orders, currentAgent]);

  // Apply search and date filters
  const filteredOrders = useMemo(() => {
    return myAgentOrders.filter((order) => {
      const matchCreate = OrderService.checkDateMatch(order.create_date || order.createDate, filterCreateDate);
      if (!matchCreate) return false;

      const matchSchedule = OrderService.checkDateMatch(order.schedule_date || order.scheduleDate, filterScheduleDate);
      if (!matchSchedule) return false;

      if (filterFollowupStatus !== 'all' && (order.followup_status || order.followupStatus || 'Pending') !== filterFollowupStatus) return false;

      if (searchValue.trim()) {
        const q = searchValue.trim().toLowerCase();
        if (searchType === 'order_id' && !String(order.order_id || order.id || '').trim().toLowerCase().includes(q)) return false;
        if (searchType === 'customer_id' && !String(order.customer_id || order.customerId || '').trim().toLowerCase().includes(q)) return false;
        if (searchType === 'customer_mobile' && !String(order.customer_mobile || order.customerContact || '').trim().toLowerCase().includes(q)) return false;
        if (searchType === 'customer_name' && !String(order.customer_name || order.customerName || '').toLowerCase().includes(q)) return false;
        if (searchType === 'gender' && !String(order.gender || '').toLowerCase().includes(q)) return false;
        if (searchType === 'create_date' && !String(order.create_date || order.createDate || '').toLowerCase().includes(q)) return false;
        if (searchType === 'order_channel' && !String(order.order_channel || order.orderChannel || '').toLowerCase().includes(q)) return false;
        if (searchType === 'agent_id' && !String(order.agent_id || order.agentId || '').toLowerCase().includes(q)) return false;
        if (searchType === 'agent_name' && !String(order.agent_name || order.agentName || '').toLowerCase().includes(q)) return false;
        if (searchType === 'product_category' && !String(order.product_category || order.productCategory || '').toLowerCase().includes(q)) return false;
        if (searchType === 'product_name' && !String(order.product_name || order.productName || '').toLowerCase().includes(q)) return false;
        if (searchType === 'city' && !String(order.city || '').toLowerCase().includes(q)) return false;
        if (searchType === 'delivery_area' && !String(order.delivery_area || order.deliveryArea || '').toLowerCase().includes(q)) return false;
        if (searchType === 'address_details' && !String(order.address_details || order.addressDetails || '').toLowerCase().includes(q)) return false;
        if (searchType === 'schedule_date' && !String(order.schedule_date || order.scheduleDate || '').toLowerCase().includes(q)) return false;
        if (searchType === 'schedule_time' && !String(order.schedule_time || order.scheduledTime || '').toLowerCase().includes(q)) return false;
        if (searchType === 'order_value' && !String(order.order_value ?? order.orderValue ?? '').toLowerCase().includes(q)) return false;
        if (searchType === 'order_status' && !String(order.order_status || order.orderStatus || '').toLowerCase().includes(q)) return false;
        if (searchType === 'followup_status' && !String(order.followup_status || order.followupStatus || '').toLowerCase().includes(q)) return false;
        if (searchType === 'profit' && !String(order.profit ?? '').toLowerCase().includes(q)) return false;
        if (searchType === 'delivered_date' && !String(order.delivered_date || order.deliveredDate || '').toLowerCase().includes(q)) return false;
        if (searchType === 'cancelled_date' && !String(order.cancelled_date || order.cancelledDate || '').toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [myAgentOrders, filterCreateDate, filterScheduleDate, filterFollowupStatus, searchType, searchValue]);

  const handleClearFilters = () => {
    setFilterCreateDate('');
    setFilterScheduleDate('');
    setFilterFollowupStatus('all');
    setSearchType('order_id');
    setSearchValue('');
  };

  return (
    <div className="w-full space-y-4">
      {/* Create Order Modal (Triggered by the button in My Orders) */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentAgent={currentAgent}
        onOrderCreated={onOrderCreated}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Orders logged by <span className="font-semibold text-blue-700">{currentAgent.user}</span> ({myAgentOrders.length} total orders)
          </p>
        </div>

        {/* Action Buttons: ➕ Create Order & 🔄 Refresh (NO export button for agent) */}
        <div className="flex items-center gap-2">
          {perms.canCreate ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-700/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          ) : (
            <button
              disabled
              title="Order creation restricted by Manager"
              className="px-3.5 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-75"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order (Disabled)</span>
            </button>
          )}

          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Filter Create Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              create_date
            </label>
            <select
              value={filterCreateDate}
              onChange={(e) => setFilterCreateDate(e.target.value as DateFilterType)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          {/* Filter Schedule Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              schedule_date
            </label>
            <select
              value={filterScheduleDate}
              onChange={(e) => setFilterScheduleDate(e.target.value as DateFilterType)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="">All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          {/* Filter Followup Status */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              followup_status
            </label>
            <select
              value={filterFollowupStatus}
              onChange={(e) => setFilterFollowupStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option key="my-status-all" value="all">All</option>
              {Array.from(new Set(orders.map(o => o.followup_status || o.followupStatus || 'Pending').filter(Boolean))).map((status, idx) => (
                <option key={`my-status-${status}-${idx}`} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Combined Search */}
          <div className="flex-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Search
            </label>
            <div className="flex items-center gap-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option key="my-search-order_id" value="order_id">order_id</option>
                <option key="my-search-customer_id" value="customer_id">customer_id</option>
                <option key="my-search-customer_mobile" value="customer_mobile">customer_mobile</option>
                <option key="my-search-customer_name" value="customer_name">customer_name</option>
              </select>
              <input
                type="text"
                placeholder={`Search...`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>
        
        {/* Clear Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={handleClearFilters}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FilterX className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

        {/* Filter badge summary */}
        {(filterCreateDate || filterScheduleDate || searchValue) && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Showing <strong>{filteredOrders.length}</strong> of <strong>{myAgentOrders.length}</strong> orders
            </span>
          </div>
        )}
      {/* End Filter and Search Bar */}

      {/* Orders Table Wrapper with Sticky Header - All 19 Columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">order_id</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">customer_id</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">customer_mobile</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">customer_name</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">gender</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">create_date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">order_channel</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">agent_id</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">agent_name</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">product_category</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">product_name</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">city</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">delivery_area</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">address_details</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">schedule_date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">schedule_time</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">order_value</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">order_status</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">followup_status</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">profit</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">delivered_date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">cancelled_date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={23} className="text-center py-12 text-slate-400">
                    <p className="font-semibold text-sm text-slate-600">No orders found</p>
                    <p className="text-xs mt-1">Use the Create Order button above to book your first order.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord, idx) => {
                  const isDelivered = (ord.followup_status || ord.followupStatus || '').toLowerCase() === 'delivered';

                  return (
                    <tr key={`agent-ord-${ord.order_id || ord.id || idx}-${idx}`} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-blue-700">
                        <button
                          type="button"
                          onClick={() => handleOpenOrder(ord)}
                          className="hover:underline text-blue-700 hover:text-blue-900 font-bold cursor-pointer flex items-center gap-1"
                          title="Click to open order details"
                        >
                          <span>#{ord.order_id || ord.id}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        {ord.customer_id || ord.customerId}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                        {ord.customer_mobile || ord.customerContact}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        {ord.customer_name || ord.customerName}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {ord.gender}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {OrderService.formatDateTime(ord.create_date || ord.createDate)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {ord.order_channel || ord.orderChannel}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                        {ord.agent_id || ord.agentId}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {ord.agent_name || ord.agentName}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {ord.product_category || ord.productCategory}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800 max-w-[200px] truncate" title={ord.product_name || ord.productName}>
                        {ord.product_name || ord.productName}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {ord.city}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {ord.delivery_area || ord.deliveryArea}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 max-w-[220px] truncate" title={ord.address_details || ord.addressDetails}>
                        {ord.address_details || ord.addressDetails}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        {OrderService.formatDateTime(ord.schedule_date || ord.scheduleDate)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {ord.schedule_time || ord.scheduledTime}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                        ৳ {((ord.order_value ?? ord.orderValue) || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.order_status || ord.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.followup_status || ord.followupStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-emerald-600">
                        ৳ {((ord.profit ?? 0) || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-emerald-700 font-medium">
                        {ord.delivered_date || ord.deliveredDate ? OrderService.formatDateTime(ord.delivered_date || ord.deliveredDate) : '-'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-red-700 font-medium">
                        {ord.cancelled_date || ord.cancelledDate ? OrderService.formatDateTime(ord.cancelled_date || ord.cancelledDate) : '-'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleOpenOrder(ord)}
                          title={canEditAnyField ? "View / Update Details" : "View Details"}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            canEditAnyField 
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' 
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                          }`}
                        >
                          {canEditAnyField ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{canEditAnyField ? 'Update' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Access-Controlled Action Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-fadeIn my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                  #{selectedOrder.order_id || selectedOrder.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">Order Details &amp; Actions</h3>
                    {canEditAnyField ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Authorized Edit
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Read-Only View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Agent: <span className="font-semibold text-slate-700">{selectedOrder.agent_name || selectedOrder.agentName} (@{selectedOrder.agent_id || selectedOrder.agentId})</span> • Channel: <span className="font-semibold text-slate-700">{selectedOrder.order_channel || selectedOrder.orderChannel}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSaveMsg && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  orderSaveMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {orderSaveMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{orderSaveMsg.text}</span>
              </div>
            )}

            {/* Read-Only Details Grid */}
            <div className="space-y-3 text-xs">
              {/* Customer Info */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Customer Information
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Name:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.customer_name || selectedOrder.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Contact:</span>
                    <span className="font-mono font-bold text-blue-700">{selectedOrder.customer_mobile || selectedOrder.customerContact}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Gender:</span>
                    <span className="font-semibold text-slate-700">{selectedOrder.gender || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Product & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-indigo-600" /> Product Details
                  </span>
                  <div className="space-y-1">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Product:</span>
                      <span className="font-bold text-slate-900">{selectedOrder.product_name || selectedOrder.productName}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Category:</span>
                      <span className="font-semibold text-slate-700">{selectedOrder.product_category || selectedOrder.productCategory}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500" /> Delivery Destination
                  </span>
                  <div className="space-y-1">
                    <div>
                      <span className="text-[11px] text-slate-500 block">City &amp; Area:</span>
                      <span className="font-bold text-slate-900">{selectedOrder.city} • {selectedOrder.delivery_area || selectedOrder.deliveryArea}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Address:</span>
                      <span className="font-medium text-slate-700">{selectedOrder.address_details || selectedOrder.addressDetails || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access-Controlled Order Update Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedOrder || !onUpdateOrderStatus) return;

                if (perms.canUpdateStatus && allowedStatuses.length > 0) {
                  if (!allowedStatuses.includes(editOrderStatus)) {
                    setOrderSaveMsg({
                      type: 'error',
                      text: `Status "${editOrderStatus}" is not permitted for your agent account.`
                    });
                    return;
                  }
                }

                setIsSavingOrder(true);
                setOrderSaveMsg(null);
                try {
                  const updates: Partial<OrderItem> = {};
                  if (perms.canUpdateStatus) {
                    updates.order_status = editOrderStatus;
                    updates.followup_status = editFollowupStatus;
                  }
                  if (perms.canChangeSchedule) {
                    if (editScheduleDate) updates.schedule_date = editScheduleDate;
                    if (editScheduleTime !== undefined) updates.schedule_time = editScheduleTime;
                  }
                  if (perms.canChangeValue) {
                    updates.order_value = parseFloat(editOrderValue) || 0;
                  }
                  if (perms.canAddProfit) {
                    updates.profit = parseFloat(editProfit) || 0;
                  }

                  await onUpdateOrderStatus(
                    String(selectedOrder.order_id || selectedOrder.id),
                    updates,
                    currentAgent.name || currentAgent.user
                  );
                  setOrderSaveMsg({ type: 'success', text: 'Order updated and synced successfully!' });
                  setTimeout(() => {
                    setSelectedOrder(null);
                  }, 800);
                } catch {
                  setOrderSaveMsg({ type: 'error', text: 'Failed to update order. Please retry.' });
                } finally {
                  setIsSavingOrder(false);
                }
              }} className="space-y-3">

                {/* Delivery Schedule Section (Editable if canChangeSchedule) */}
                <div className={`p-3.5 rounded-2xl border transition-all ${perms.canChangeSchedule ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-sky-600" />
                      Delivery Schedule {perms.canChangeSchedule ? '(Editable)' : '(Fixed)'}
                    </span>
                    {!perms.canChangeSchedule && (
                      <span className="text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-400" /> Read-Only
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Schedule Date:
                      </label>
                      {perms.canChangeSchedule ? (
                        <input
                          type="date"
                          value={editScheduleDate}
                          onChange={(e) => setEditScheduleDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white font-mono font-bold text-slate-900 focus:outline-hidden focus:border-sky-600 text-xs shadow-2xs"
                        />
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold font-mono text-slate-800 text-xs">
                          {selectedOrder.schedule_date || selectedOrder.scheduleDate ? OrderService.formatDateTime((selectedOrder.schedule_date || selectedOrder.scheduleDate)!) : '-'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Scheduled Time Slot:
                      </label>
                      {perms.canChangeSchedule ? (
                        <select
                          value={editScheduleTime}
                          onChange={(e) => setEditScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-sky-600 text-xs shadow-2xs cursor-pointer"
                        >
                          <option value="">-- Choose Time Slot --</option>
                          {TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 text-xs">
                          {selectedOrder.schedule_time || selectedOrder.scheduledTime || 'Unscheduled'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Access-Controlled Financials & Status Update Panel */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financials &amp; Operational Status
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${perms.canUpdateStatus ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'}`}>
                        Status: {perms.canUpdateStatus ? `${allowedStatuses.length} Permitted` : 'Locked'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${perms.canChangeSchedule ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-500'}`}>
                        Schedule: {perms.canChangeSchedule ? 'Editable' : 'Locked'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${perms.canChangeValue ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                        Value: {perms.canChangeValue ? 'Editable' : 'Locked'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${perms.canAddProfit ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-500'}`}>
                        Profit: {perms.canAddProfit ? 'Editable' : 'Locked'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Order Value (Editable if canChangeValue) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Order Value (৳)</span>
                        {!perms.canChangeValue && (
                          <span className="text-[9px] font-semibold text-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Read-Only
                          </span>
                        )}
                      </label>
                      {perms.canChangeValue ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editOrderValue}
                          onChange={(e) => setEditOrderValue(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 text-xs"
                        />
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-extrabold text-slate-800 text-xs">
                          ৳ {((selectedOrder.order_value ?? selectedOrder.orderValue) || 0).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Profit (Editable if canAddProfit) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Profit (৳)</span>
                        {!perms.canAddProfit && (
                          <span className="text-[9px] font-semibold text-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Read-Only
                          </span>
                        )}
                      </label>
                      {perms.canAddProfit ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editProfit}
                          onChange={(e) => setEditProfit(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-emerald-700 focus:outline-hidden focus:border-indigo-600 text-xs"
                        />
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-extrabold text-emerald-700 text-xs">
                          ৳ {((selectedOrder.profit ?? 0) || 0).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Order Status (Granular Access Control) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Order Status</span>
                        {!perms.canUpdateStatus && (
                          <span className="text-[9px] font-semibold text-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Read-Only
                          </span>
                        )}
                      </label>
                      {perms.canUpdateStatus ? (
                        <div>
                          <select
                            value={editOrderStatus}
                            onChange={(e) => setEditOrderStatus(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 text-xs cursor-pointer"
                          >
                            {getOrderStatuses().map((st) => {
                              const isAllowed = allowedStatuses.includes(st);
                              return (
                                <option
                                  key={`opt-st-${st}`}
                                  value={st}
                                  disabled={!isAllowed}
                                  className={!isAllowed ? 'text-slate-400 bg-slate-100 italic' : ''}
                                >
                                  {st} {!isAllowed ? '— (Restricted: Manager Only)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          {allowedStatuses.length > 0 && (!allowedStatuses.includes('Delivered') || !allowedStatuses.includes('Cancelled')) && (
                            <p className="text-[10px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Delivered &amp; Cancelled statuses are restricted to Manager approval.</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-blue-800 text-xs">
                          {selectedOrder.order_status || selectedOrder.orderStatus || 'Pending'}
                        </div>
                      )}
                    </div>

                    {/* Follow-up Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Follow-up Status</span>
                        {!perms.canUpdateStatus && (
                          <span className="text-[9px] font-semibold text-amber-700 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Read-Only
                          </span>
                        )}
                      </label>
                      {perms.canUpdateStatus ? (
                        <select
                          value={editFollowupStatus}
                          onChange={(e) => setEditFollowupStatus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 text-xs cursor-pointer"
                        >
                          {['Pending', 'Confirmed', 'Follow-up', 'Delivered', 'Cancelled'].map((st) => {
                            const isAllowed = allowedStatuses.includes(st);
                            return (
                              <option
                                key={`opt-fu-${st}`}
                                value={st}
                                disabled={!isAllowed}
                                className={!isAllowed ? 'text-slate-400 bg-slate-100 italic' : ''}
                              >
                                {st} {!isAllowed ? '— (Restricted: Manager Only)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-indigo-800 text-xs">
                          {selectedOrder.followup_status || selectedOrder.followupStatus || 'Pending'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {canEditAnyField && onUpdateOrderStatus && (
                    <button
                      type="submit"
                      disabled={isSavingOrder}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingOrder ? 'Saving...' : 'Save & Sync Order'}</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
