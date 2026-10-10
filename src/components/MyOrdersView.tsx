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
  const [searchQuery, setSearchQuery] = useState('');
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
      (o) => o.agentId.toLowerCase() === currentAgent.user.toLowerCase()
    );
  }, [orders, currentAgent.user]);

  // Apply search and date filters
  const filteredOrders = useMemo(() => {
    return myAgentOrders.filter((order) => {
      const matchCreate = OrderService.checkDateMatch(order.createDate, filterCreateDate);
      if (!matchCreate) return false;

      const matchSchedule = OrderService.checkDateMatch(order.scheduleDate, filterScheduleDate);
      if (!matchSchedule) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          order.id,
          order.customerName,
          order.customerContact,
          order.productName,
          order.productCategory,
          order.city,
          order.deliveryArea,
          order.orderChannel
        ].join(' ').toLowerCase();

        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [myAgentOrders, filterCreateDate, filterScheduleDate, searchQuery]);

  const handleClearFilters = () => {
    setFilterCreateDate('');
    setFilterScheduleDate('');
    setSearchQuery('');
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
          {/* Search bar */}
          <div className="relative">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search My Orders
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, Customer, Phone, SKU..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Filter Create Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter by Create Date
            </label>
            <select
              value={filterCreateDate}
              onChange={(e) => setFilterCreateDate(e.target.value as DateFilterType)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="">All Create Dates</option>
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
              Filter by Schedule Date
            </label>
            <select
              value={filterScheduleDate}
              onChange={(e) => setFilterScheduleDate(e.target.value as DateFilterType)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="">All Schedule Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          {/* Clear button */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {/* Filter badge summary */}
        {(filterCreateDate || filterScheduleDate || searchQuery) && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Showing <strong>{filteredOrders.length}</strong> of <strong>{myAgentOrders.length}</strong> orders
            </span>
          </div>
        )}
      </div>

      {/* Orders Table Wrapper with Sticky Header - All 19 Columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Order Id</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Customer Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Customer Contact</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Gender</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Create Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Order Channel</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Agent ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Agent Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Product catrgory</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Product Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">City</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Delivery Area</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Address Details</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Schedule Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Scheduled Time</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Order Value</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Order Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Folllowup Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Profit</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Delivered Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100">Cancelled Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={22} className="text-center py-12 text-slate-400">
                    <p className="font-semibold text-sm text-slate-600">No orders found</p>
                    <p className="text-xs mt-1">Use the Create Order button above to book your first order.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isDelivered = ord.followupStatus.toLowerCase() === 'delivered';

                  return (
                    <tr key={ord.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-blue-700">
                        #{ord.id}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        {ord.customerName}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                        {ord.customerContact}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {ord.gender}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {OrderService.formatDateTime(ord.createDate)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {ord.orderChannel}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                        {ord.agentId}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {ord.agentName}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {ord.productCategory}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800 max-w-[200px] truncate" title={ord.productName}>
                        {ord.productName}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {ord.city}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {ord.deliveryArea}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 max-w-[220px] truncate" title={ord.addressDetails}>
                        {ord.addressDetails}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        {OrderService.formatDateTime(ord.scheduleDate)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {ord.scheduledTime}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                        ৳ {ord.orderValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.followupStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-emerald-600">
                        ৳ {ord.profit.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-emerald-700 font-medium">
                        {ord.deliveredDate ? OrderService.formatDateTime(ord.deliveredDate) : '-'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-red-700 font-medium">
                        {ord.cancelledDate ? OrderService.formatDateTime(ord.cancelledDate) : '-'}
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
                  #{selectedOrder.id}
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
                    Booked by {selectedOrder.agentName} (@{selectedOrder.agentId}) • Channel: <span className="font-semibold text-slate-700">{selectedOrder.orderChannel}</span>
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
                    <span className="font-bold text-slate-900">{selectedOrder.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Contact:</span>
                    <span className="font-mono font-bold text-blue-700">{selectedOrder.customerContact}</span>
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
                      <span className="font-bold text-slate-900">{selectedOrder.productName}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Category:</span>
                      <span className="font-semibold text-slate-700">{selectedOrder.productCategory}</span>
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
                      <span className="font-bold text-slate-900">{selectedOrder.city} • {selectedOrder.deliveryArea}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Address:</span>
                      <span className="font-medium text-slate-700">{selectedOrder.addressDetails || '-'}</span>
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
                      {selectedOrder.scheduleDate ? OrderService.formatDateTime(selectedOrder.scheduleDate) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Scheduled Time Slot:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedOrder.scheduledTime || 'Unscheduled'}
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
                    <span className="font-extrabold text-slate-900">৳ {selectedOrder.orderValue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Profit:</span>
                    <span className="font-extrabold text-emerald-600">৳ {selectedOrder.profit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Follow-up Status:</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      selectedOrder.followupStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      selectedOrder.followupStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {selectedOrder.followupStatus || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Order Status:</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      selectedOrder.orderStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      selectedOrder.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedOrder.orderStatus || 'Pending'}
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
