import React, { useState, useMemo } from 'react';
import { AgentUser, DateFilterType, OrderItem } from '../types';
import { OrderService } from '../services/orderService';
import { CreateOrderModal } from './CreateOrderModal';
import { RotateCw, Search, FilterX, Eye, X, CheckCircle, Clock, Plus } from 'lucide-react';

interface MyOrdersViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onUpdateOrderStatus: (orderId: string, updates: Partial<OrderItem>) => void;
  onOrderCreated: (order: OrderItem) => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  currentAgent,
  orders,
  onRefresh,
  isRefreshing,
  onUpdateOrderStatus,
  onOrderCreated
}) => {
  const [filterCreateDate, setFilterCreateDate] = useState<DateFilterType>('');
  const [filterScheduleDate, setFilterScheduleDate] = useState<DateFilterType>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-700/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>

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
                <th className="py-3 px-3.5 whitespace-nowrap bg-slate-100 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={20} className="text-center py-12 text-slate-400">
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
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          title="View Details"
                          className="p-1 rounded-md text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Order Details #{selectedOrder.id}</h3>
                <p className="text-xs text-slate-500">Agent: {selectedOrder.agentName} ({selectedOrder.agentId})</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Customer</span>
                <span className="font-bold text-slate-900">{selectedOrder.customerName}</span>
                <span className="block text-slate-600 font-mono mt-0.5">{selectedOrder.customerContact}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Product</span>
                <span className="font-bold text-slate-900">{selectedOrder.productName}</span>
                <span className="block text-slate-600 mt-0.5">{selectedOrder.productCategory}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg col-span-2">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Delivery Location</span>
                <span className="font-bold text-slate-900">{selectedOrder.city} • {selectedOrder.deliveryArea}</span>
                <span className="block text-slate-600 mt-0.5">{selectedOrder.addressDetails}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Schedule</span>
                <span className="font-bold text-slate-900">{selectedOrder.scheduleDate}</span>
                <span className="block text-slate-600 mt-0.5">{selectedOrder.scheduledTime}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Order Value & Profit</span>
                <span className="font-bold text-slate-900">৳ {selectedOrder.orderValue.toLocaleString()}</span>
                <span className="block text-emerald-600 font-bold mt-0.5">৳ {selectedOrder.profit.toLocaleString()} Profit (20%)</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-2">Update Delivery Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onUpdateOrderStatus(selectedOrder.id, {
                      orderStatus: 'Delivered',
                      followupStatus: 'Delivered'
                    });
                    setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: 'Delivered', followupStatus: 'Delivered' } : null));
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark as Delivered</span>
                </button>
                <button
                  onClick={() => {
                    onUpdateOrderStatus(selectedOrder.id, {
                      orderStatus: 'Pending',
                      followupStatus: 'Pending'
                    });
                    setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: 'Pending', followupStatus: 'Pending' } : null));
                  }}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mark as Pending</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
