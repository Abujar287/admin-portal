import React, { useState, useMemo } from 'react';
import { AgentUser, DateFilterType, OrderItem } from '../types';
import { OrderService } from '../services/orderService';
import { CreateOrderModal } from './CreateOrderModal';
import { RotateCw, Search, FilterX, Eye, X, CheckCircle, Clock, Plus, Lock, Calendar, DollarSign, MapPin, Package, User } from 'lucide-react';

interface MyOrdersViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onOrderCreated: (order: OrderItem) => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  currentAgent,
  orders,
  onRefresh,
  isRefreshing,
  onOrderCreated
}) => {
  const [filterCreateDate, setFilterCreateDate] = useState<DateFilterType>('');
  const [filterScheduleDate, setFilterScheduleDate] = useState<DateFilterType>('');
  const [filterFollowupStatus, setFilterFollowupStatus] = useState<string>('all');
  const [searchType, setSearchType] = useState<string>('order_id');
  const [searchValue, setSearchValue] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Agent permissions check for order creation
  const perms = currentAgent.permissions || { canCreate: true };

  const handleOpenOrder = (ord: OrderItem) => {
    setSelectedOrder(ord);
  };

  // STRICTLY only this agent's orders (data isolation for agent portal)
  const myAgentOrders = useMemo(() => {
    return orders.filter(
      (o) => (o.agent_id || o.agentId || '').trim().toLowerCase() === (currentAgent?.user || '').trim().toLowerCase()
    );
  }, [orders, currentAgent?.user]);

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
                        #{ord.order_id || ord.id}
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
                          title="View / Update Details"
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
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

      {/* Order Details & Action Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                  #{selectedOrder.order_id || selectedOrder.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">Order Details</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Read-Only (Agent View)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Booked by {selectedOrder.agent_name || selectedOrder.agentName} (@{selectedOrder.agent_id || selectedOrder.agentId}) • Channel: <span className="font-semibold text-slate-700">{selectedOrder.order_channel || selectedOrder.orderChannel}</span>
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

            {/* Read-Only Details Grid */}
            <div className="space-y-3.5 text-xs">
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

              {/* Schedule Details - Read Only */}
              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Delivery Schedule (Fixed)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Schedule Date:</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {selectedOrder.schedule_date || selectedOrder.scheduleDate ? OrderService.formatDateTime((selectedOrder.schedule_date || selectedOrder.scheduleDate)!) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Scheduled Time Slot:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedOrder.schedule_time || selectedOrder.scheduledTime || 'Unscheduled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financials & Status */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financials &amp; Status
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Order Value:</span>
                    <span className="font-extrabold text-slate-900">৳ {((selectedOrder.order_value ?? selectedOrder.orderValue) || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Profit:</span>
                    <span className="font-extrabold text-emerald-600">৳ {((selectedOrder.profit ?? 0) || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Follow-up Status:</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      (selectedOrder.followup_status || selectedOrder.followupStatus) === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      (selectedOrder.followup_status || selectedOrder.followupStatus) === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {selectedOrder.followup_status || selectedOrder.followupStatus || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Order Status:</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      (selectedOrder.order_status || selectedOrder.orderStatus) === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      (selectedOrder.order_status || selectedOrder.orderStatus) === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedOrder.order_status || selectedOrder.orderStatus || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Restriction Notice & Close Button */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Order rescheduling and status updates are managed by Follow-up &amp; Manager.</span>
              </p>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
