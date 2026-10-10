import React, { useState, useMemo } from 'react';
import { AgentUser, ManagerUser, OrderItem, DateFilterType, FollowupHistoryItem } from '../types';
import { OrderService } from '../services/orderService';
import { 
  User, 
  Users, 
  FileText, 
  BarChart2, 
  LogOut, 
  RotateCw, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Layers, 
  MapPin,
  Lock,
  Unlock,
  Eye,
  X,
  Phone,
  Mail,
  Heart,
  Calendar,
  History,
  CheckSquare,
  Code,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ORDER_CHANNELS } from '../data/mockOrders';

interface ManagerPortalProps {
  currentManager: ManagerUser;
  agents: AgentUser[];
  onUpdateAgents: (agents: AgentUser[], notify?: boolean) => void;
  orders: OrderItem[];
  followupHistory?: FollowupHistoryItem[];
  onRefreshOrders: () => Promise<void>;
  isRefreshing: boolean;
  onLogout: () => void;
  onUpdateOrderStatus?: (orderId: string, updates: Partial<OrderItem>, updatedBy?: string, notes?: string) => Promise<void>;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  currentManager,
  agents,
  onUpdateAgents,
  orders,
  followupHistory = [],
  onRefreshOrders,
  isRefreshing,
  onLogout,
  onUpdateOrderStatus
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'users' | 'orders' | 'followup' | 'summary'>('users');

  // Status & Details Modal State
  const [statusModalOrder, setStatusModalOrder] = useState<OrderItem | null>(null);
  const [modalFollowupStatus, setModalFollowupStatus] = useState<string>('Delivered');
  const [modalOrderValue, setModalOrderValue] = useState<string>('');
  const [modalProfit, setModalProfit] = useState<string>('');
  const [modalScheduleDate, setModalScheduleDate] = useState<string>('');
  const [modalScheduledTime, setModalScheduledTime] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Followup Tab State
  const [quickUpdateOrderId, setQuickUpdateOrderId] = useState<string>('');
  const [quickUpdateStatus, setQuickUpdateStatus] = useState<string>('Delivered');
  const [quickUpdateOrderValue, setQuickUpdateOrderValue] = useState<string>('');
  const [quickUpdateProfit, setQuickUpdateProfit] = useState<string>('');
  const [quickUpdateScheduleDate, setQuickUpdateScheduleDate] = useState<string>('');
  const [quickUpdateScheduledTime, setQuickUpdateScheduledTime] = useState<string>('');
  const [quickUpdateNotes, setQuickUpdateNotes] = useState<string>('');
  const [followupSearch, setFollowupSearch] = useState<string>('');

  const handleOpenOrderModal = (ord: OrderItem) => {
    setStatusModalOrder(ord);
    setModalFollowupStatus(ord.followupStatus || 'Pending');
    setModalOrderValue(String(ord.orderValue ?? ''));
    setModalProfit(String(ord.profit ?? ''));
    setModalScheduleDate(ord.scheduleDate || '');
    setModalScheduledTime(ord.scheduledTime || '');
    setModalNotes('');
  };

  // Agent Management Form State
  const [newAgentUser, setNewAgentUser] = useState('');
  const [newAgentPass, setNewAgentPass] = useState('');
  const [newAgentTeam, setNewAgentTeam] = useState('Acquisition');
  const [newAgentName, setNewAgentName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentUser | null>(null);

  // Orders Tab Filters
  const [orderCreateFilter, setOrderCreateFilter] = useState<DateFilterType>('all');
  const [orderCreateStart, setOrderCreateStart] = useState('');
  const [orderCreateEnd, setOrderCreateEnd] = useState('');

  const [orderScheduleFilter, setOrderScheduleFilter] = useState<DateFilterType>('all');
  const [orderScheduleStart, setOrderScheduleStart] = useState('');
  const [orderScheduleEnd, setOrderScheduleEnd] = useState('');

  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // Summary Tab Filters
  const [summaryCreateFilter, setSummaryCreateFilter] = useState<DateFilterType>('all');
  const [summaryCreateStart, setSummaryCreateStart] = useState('');
  const [summaryCreateEnd, setSummaryCreateEnd] = useState('');

  const [summaryScheduleFilter, setSummaryScheduleFilter] = useState<DateFilterType>('all');
  const [summaryScheduleStart, setSummaryScheduleStart] = useState('');
  const [summaryScheduleEnd, setSummaryScheduleEnd] = useState('');

  const [summaryDeliveredFilter, setSummaryDeliveredFilter] = useState<DateFilterType>('all');
  const [summaryDeliveredStart, setSummaryDeliveredStart] = useState('');
  const [summaryDeliveredEnd, setSummaryDeliveredEnd] = useState('');

  const [summaryCancelledFilter, setSummaryCancelledFilter] = useState<DateFilterType>('all');
  const [summaryCancelledStart, setSummaryCancelledStart] = useState('');
  const [summaryCancelledEnd, setSummaryCancelledEnd] = useState('');

  // Helper date matcher
  const matchDate = (
    dateVal: string,
    filterType: DateFilterType,
    startDateVal: string,
    endDateVal: string
  ): boolean => {
    if (!dateVal || filterType === 'all' || !filterType) return true;
    const targetDate = new Date(dateVal.split(' ')[0]);
    if (isNaN(targetDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetTime = targetDate.setHours(0, 0, 0, 0);

    if (filterType === 'today') return targetTime === today.getTime();
    if (filterType === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      return targetTime === yest.getTime();
    }
    if (filterType === 'last7') {
      const limit = new Date(today);
      limit.setDate(today.getDate() - 6);
      return targetTime >= limit.getTime() && targetTime <= today.getTime();
    }
    if (filterType === 'last30') {
      const limit = new Date(today);
      limit.setDate(today.getDate() - 29);
      return targetTime >= limit.getTime() && targetTime <= today.getTime();
    }
    if (filterType === 'thisMonth') {
      return (
        targetDate.getMonth() === today.getMonth() &&
        targetDate.getFullYear() === today.getFullYear()
      );
    }
    if (filterType === 'lastMonth') {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return (
        targetDate.getMonth() === lm.getMonth() &&
        targetDate.getFullYear() === lm.getFullYear()
      );
    }
    if (filterType === 'lastYear') {
      return targetDate.getFullYear() === today.getFullYear() - 1;
    }
    if (filterType === 'custom') {
      if (!startDateVal || !endDateVal) return true;
      const s = new Date(startDateVal).getTime();
      const e = new Date(endDateVal).getTime();
      return targetTime >= s && targetTime <= e;
    }
    return true;
  };

  // Add or update agent
  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const u = newAgentUser.trim();
    const p = newAgentPass.trim();
    if (!u || !p) return;

    let updated: AgentUser[];
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < agents.length) {
      updated = agents.map((agent, idx) =>
        idx === editingIndex
          ? {
              ...agent,
              user: u,
              pass: p,
              team: newAgentTeam,
              name: newAgentName.trim() || agent.name || `Agent ${u}`
            }
          : agent
      );
      setEditingIndex(null);
    } else {
      const existingIdx = agents.findIndex((a) => a.user.toLowerCase() === u.toLowerCase());
      if (existingIdx >= 0) {
        updated = agents.map((agent, idx) =>
          idx === existingIdx
            ? { ...agent, user: u, pass: p, team: newAgentTeam, name: newAgentName.trim() || agent.name }
            : agent
        );
      } else {
        updated = [
          ...agents,
          {
            user: u,
            pass: p,
            team: newAgentTeam,
            name: newAgentName.trim() || `Agent ${u}`,
            email: `${u.toLowerCase()}@portal.local`,
            status: 'active',
            failedAttempts: 0
          }
        ];
      }
    }

    onUpdateAgents(updated, true);
    setNewAgentUser('');
    setNewAgentPass('');
    setNewAgentName('');
    setNewAgentTeam('Acquisition');
  };

  const handleEditAgent = (index: number) => {
    const ag = agents[index];
    setNewAgentUser(ag.user);
    setNewAgentPass(ag.pass);
    setNewAgentName(ag.name || '');
    setNewAgentTeam(ag.team || 'Acquisition');
    setEditingIndex(index);
  };

  const handleDeleteAgent = (index: number) => {
    if (agents.length <= 1) return;
    const updated = agents.filter((_, idx) => idx !== index);
    onUpdateAgents(updated, true);
  };

  // Reactivate / Deactivate Agent
  const handleToggleAgentStatus = (index: number) => {
    const agent = agents[index];
    const isCurrentlyDeactive = agent.status === 'deactivated';
    const newStatus = isCurrentlyDeactive ? 'active' : 'deactivated';

    const updated = agents.map((a, idx) =>
      idx === index
        ? {
            ...a,
            status: newStatus as 'active' | 'deactivated',
            failedAttempts: newStatus === 'active' ? 0 : a.failedAttempts || 3
          }
        : a
    );
    onUpdateAgents(updated, true);
  };

  // Filtered Orders for Orders Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((r) => {
      if (!matchDate(r.createDate, orderCreateFilter, orderCreateStart, orderCreateEnd)) {
        return false;
      }
      if (!matchDate(r.scheduleDate, orderScheduleFilter, orderScheduleStart, orderScheduleEnd)) {
        return false;
      }
      if (orderIdSearch.trim()) {
        const idStr = String(r.id || '').toLowerCase();
        if (!idStr.includes(orderIdSearch.trim().toLowerCase())) return false;
      }
      if (contactSearch.trim()) {
        const cStr = String(r.customerContact || '').toLowerCase();
        if (!cStr.includes(contactSearch.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [
    orders,
    orderCreateFilter,
    orderCreateStart,
    orderCreateEnd,
    orderScheduleFilter,
    orderScheduleStart,
    orderScheduleEnd,
    orderIdSearch,
    contactSearch
  ]);

  // Summary Metrics & Aggregations
  const summaryFilteredOrders = useMemo(() => {
    return orders.filter((r) => {
      if (!matchDate(r.createDate, summaryCreateFilter, summaryCreateStart, summaryCreateEnd)) {
        return false;
      }
      if (!matchDate(r.scheduleDate, summaryScheduleFilter, summaryScheduleStart, summaryScheduleEnd)) {
        return false;
      }
      if (!matchDate(r.deliveredDate || '', summaryDeliveredFilter, summaryDeliveredStart, summaryDeliveredEnd)) {
        return false;
      }
      if (!matchDate(r.cancelledDate || '', summaryCancelledFilter, summaryCancelledStart, summaryCancelledEnd)) {
        return false;
      }
      return true;
    });
  }, [
    orders,
    summaryCreateFilter,
    summaryCreateStart,
    summaryCreateEnd,
    summaryScheduleFilter,
    summaryScheduleStart,
    summaryScheduleEnd,
    summaryDeliveredFilter,
    summaryDeliveredStart,
    summaryDeliveredEnd,
    summaryCancelledFilter,
    summaryCancelledStart,
    summaryCancelledEnd
  ]);

  const summaryBreakdowns = useMemo(() => {
    const cityMap: Record<string, number> = {};
    const channelMap: Record<string, number> = {};
    const areaMap: Record<string, number> = {};

    summaryFilteredOrders.forEach((r) => {
      const city = r.city || 'Unknown';
      const channel = r.orderChannel || 'Unknown';
      const area = r.deliveryArea || 'Unknown';

      cityMap[city] = (cityMap[city] || 0) + 1;
      channelMap[channel] = (channelMap[channel] || 0) + 1;
      areaMap[area] = (areaMap[area] || 0) + 1;
    });

    return { cityMap, channelMap, areaMap };
  }, [summaryFilteredOrders]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Manager Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col p-5 border-r border-white/10 shrink-0">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
            📊
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight text-white">Manager Portal</h2>
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-semibold">
              Control Hub
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Details</span>
            <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
              {agents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Orders</span>
            <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('followup')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'followup'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Followup &amp; Sync</span>
            <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
              {followupHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'profiles'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profiles</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Manager Desk
            </span>
            <span className="text-slate-300">•</span>
            <h1 className="text-lg font-extrabold text-slate-900 capitalize">
              {activeTab === 'users' && 'User Details (Agent Directory)'}
              {activeTab === 'orders' && 'All Orders Database'}
              {activeTab === 'summary' && 'Analytics & Summary'}
              {activeTab === 'profiles' && 'Manager Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onRefreshOrders()}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Sheet'}</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: USER DETAILS (AGENT DIRECTORY WITH DETAILS STORE) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Add / Edit Agent Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-base mb-4">
                  {editingIndex !== null ? 'Edit Agent Profile' : 'Add New Agent'}
                </h3>

                <form onSubmit={handleSaveAgent} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Agent Username
                    </label>
                    <input
                      type="text"
                      required
                      value={newAgentUser}
                      onChange={(e) => setNewAgentUser(e.target.value)}
                      placeholder="e.g. agent01"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Agent Full Name
                    </label>
                    <input
                      type="text"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="e.g. Tareq Hasan"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Password
                    </label>
                    <input
                      type="text"
                      required
                      value={newAgentPass}
                      onChange={(e) => setNewAgentPass(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Team Assignment
                    </label>
                    <select
                      value={newAgentTeam}
                      onChange={(e) => setNewAgentTeam(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-600 bg-white"
                    >
                      {ORDER_CHANNELS.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
                    {editingIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setNewAgentUser('');
                          setNewAgentPass('');
                          setNewAgentName('');
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{editingIndex !== null ? 'Update Agent Profile' : 'Add Agent'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* User Details Table - Displays all details updated by agents */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">User Details &amp; Directory</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Stores all contact info, birthday, blood group, address, and login status updated by agents.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                    {agents.length} Accounts Registered
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-3 px-3.5 whitespace-nowrap">Agent ID</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Full Name</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Password</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Team</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Email</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Blood Group</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Birthday</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Address</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap text-center">Manager Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {agents.map((agent, index) => {
                        const isDeactivated = agent.status === 'deactivated';

                        return (
                          <tr key={agent.user} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                              {agent.user}
                            </td>
                            <td className="py-3 px-3.5 font-medium whitespace-nowrap text-slate-800">
                              {agent.name || '-'}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                {agent.pass}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {agent.team}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                              {agent.contact || '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                              {agent.email || '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {agent.bloodGroup ? (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-red-50 text-red-700 border border-red-200">
                                  {agent.bloodGroup}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                              {agent.birthday || '-'}
                            </td>
                            <td className="py-3 px-3.5 max-w-[180px] truncate text-slate-500" title={agent.address || ''}>
                              {agent.address || '-'}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {isDeactivated ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-fit">
                                  <Lock className="w-3 h-3" /> Deactivated (3 fails)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap text-center space-x-1.5">
                              {/* Activate / Deactivate button */}
                              <button
                                onClick={() => handleToggleAgentStatus(index)}
                                title={isDeactivated ? 'Reactivate Agent Account' : 'Deactivate Agent'}
                                className={`px-2.5 py-1 rounded-md font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-all ${
                                  isDeactivated
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                              >
                                {isDeactivated ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Activate</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>Deactivate</span>
                                  </>
                                )}
                              </button>

                              {/* View full card */}
                              <button
                                onClick={() => setSelectedAgentDetails(agent)}
                                title="View Full Profile Card"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleEditAgent(index)}
                                title="Edit Credentials"
                                className="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-md font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteAgent(index)}
                                disabled={agents.length <= 1}
                                title="Delete Agent"
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 disabled:opacity-40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORDERS (ALL ORDERS TABLE WITH ALL 19 COLUMNS) */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filters Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-sm">Filters & Search</h3>
                  <button
                    onClick={() => onRefreshOrders()}
                    disabled={isRefreshing}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>🔄 Refresh Data</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Create Date Filter */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Create Date
                    </label>
                    <select
                      value={orderCreateFilter}
                      onChange={(e) => setOrderCreateFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    {orderCreateFilter === 'custom' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="date"
                          value={orderCreateStart}
                          onChange={(e) => setOrderCreateStart(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={orderCreateEnd}
                          onChange={(e) => setOrderCreateEnd(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>

                  {/* Schedule Date Filter */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Schedule Date
                    </label>
                    <select
                      value={orderScheduleFilter}
                      onChange={(e) => setOrderScheduleFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    {orderScheduleFilter === 'custom' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="date"
                          value={orderScheduleStart}
                          onChange={(e) => setOrderScheduleStart(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={orderScheduleEnd}
                          onChange={(e) => setOrderScheduleEnd(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>

                  {/* Order ID Search */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Order ID
                    </label>
                    <input
                      type="text"
                      value={orderIdSearch}
                      onChange={(e) => setOrderIdSearch(e.target.value)}
                      placeholder="Search order ID..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  {/* Contact Number Search */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search phone number..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> total sheet orders
                </div>
              </div>

              {/* All 19 Columns Sticky Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white sticky top-0 z-10 font-bold">
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Order Id</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Customer Name</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Customer Contact</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Gender</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Create Date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Order Channel</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Agent ID</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Agent Name</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Product catrgory</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Product Name</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">City</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Delivery Area</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Address Details</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Schedule Date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Scheduled Time</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Order Value</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Order Status</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Folllowup Status</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Profit</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Delivered Date</th>
                        <th className="py-3.5 px-3.5 whitespace-nowrap">Cancelled Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={21} className="text-center py-12 text-slate-400 font-semibold">
                            No orders found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => {
                          const isDelivered = ord.followupStatus.toLowerCase() === 'delivered';
                          return (
                            <tr key={ord.id} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-indigo-700">
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
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {OrderService.formatDateTime(ord.createDate)}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                  {ord.orderChannel}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-indigo-900 font-semibold">
                                {ord.agentId}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
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
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 max-w-[200px] truncate" title={ord.addressDetails}>
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
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={ord.followupStatus || 'Pending'}
                                    onChange={(e) => {
                                      const newStatus = e.target.value;
                                      onUpdateOrderStatus?.(
                                        ord.id,
                                        {
                                          followupStatus: newStatus,
                                          orderStatus: newStatus === 'Delivered' ? 'Delivered' : ord.orderStatus
                                        },
                                        'Manager'
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                      ord.followupStatus === 'Delivered'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : ord.followupStatus === 'Cancelled'
                                        ? 'bg-red-50 text-red-800 border-red-300'
                                        : ord.followupStatus === 'Confirmed'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : ord.followupStatus === 'Follow-up'
                                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                                        : 'bg-amber-50 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                  <button
                                    onClick={() => handleOpenOrderModal(ord)}
                                    title="Edit Order Value, Schedule, Followup Status & Remarks"
                                    className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
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

          {/* TAB: FOLLOWUP & SHEET SYNC */}
          {activeTab === 'followup' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Followup Status &amp; Google Sheet Dual-Sync</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Live Dual-Sheet Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Followup status updates are directly replaced in <strong>Sheet1</strong> (Column 18) for the selected Order ID, while full historical audit logs are permanently stored in the <strong>Followup</strong> sheet.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowAppsScriptModal(true)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>View &amp; Copy Apps Script</span>
                  </button>
                  <button
                    onClick={() => onRefreshOrders()}
                    disabled={isRefreshing}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Sheet Data</span>
                  </button>
                </div>
              </div>

              {/* Status Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Orders</span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{orders.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">Delivered Orders</span>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {orders.filter(o => o.followupStatus?.toLowerCase() === 'delivered').length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">Confirmed Orders</span>
                  <div className="text-2xl font-extrabold text-blue-600 mt-1">
                    {orders.filter(o => o.followupStatus?.toLowerCase() === 'confirmed').length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">Updates Logged</span>
                  <div className="text-2xl font-extrabold text-purple-600 mt-1">{followupHistory.length}</div>
                </div>
              </div>

              {/* Quick Status Updater Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Order Details &amp; Followup Status Updater</h3>
                    <p className="text-[11px] text-indigo-200">
                      Pick any Order ID, update its Followup Status, Order Value, Schedule Date &amp; Time, and sync to Google Sheet &amp; 'Followup' audit log.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!quickUpdateOrderId) return;
                    setIsSavingStatus(true);
                    try {
                      await onUpdateOrderStatus?.(
                        quickUpdateOrderId,
                        {
                          followupStatus: quickUpdateStatus,
                          orderValue: quickUpdateOrderValue !== '' ? parseFloat(quickUpdateOrderValue) : undefined,
                          profit: quickUpdateProfit !== '' ? parseFloat(quickUpdateProfit) : undefined,
                          scheduleDate: quickUpdateScheduleDate,
                          scheduledTime: quickUpdateScheduledTime
                        },
                        'Manager',
                        quickUpdateNotes
                      );
                      setQuickUpdateNotes('');
                    } finally {
                      setIsSavingStatus(false);
                    }
                  }}
                  className="space-y-3.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Select Order
                      </label>
                      <select
                        value={quickUpdateOrderId}
                        onChange={(e) => {
                          const chosenId = e.target.value;
                          setQuickUpdateOrderId(chosenId);
                          const ord = orders.find((o) => String(o.id) === String(chosenId));
                          if (ord) {
                            setQuickUpdateStatus(ord.followupStatus || 'Pending');
                            setQuickUpdateOrderValue(String(ord.orderValue ?? ''));
                            setQuickUpdateProfit(String(ord.profit ?? ''));
                            setQuickUpdateScheduleDate(ord.scheduleDate || '');
                            setQuickUpdateScheduledTime(ord.scheduledTime || '');
                          }
                        }}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      >
                        <option value="">-- Choose Order ID --</option>
                        {orders.map((ord) => (
                          <option key={ord.id} value={ord.id}>
                            #{ord.id} - {ord.customerName} (৳{ord.orderValue.toLocaleString()}) [{ord.followupStatus || 'Pending'}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Order Value (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quickUpdateOrderValue}
                        onChange={(e) => setQuickUpdateOrderValue(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Profit Amount (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={quickUpdateProfit}
                        onChange={(e) => setQuickUpdateProfit(e.target.value)}
                        placeholder="e.g. 300 (0 if cancelled)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-emerald-400 font-bold focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Followup Status
                      </label>
                      <select
                        value={quickUpdateStatus}
                        onChange={(e) => {
                          const s = e.target.value;
                          setQuickUpdateStatus(s);
                          if (s.toLowerCase() === 'cancelled') {
                            setQuickUpdateProfit('0');
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled (Profit auto 0)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Schedule Date
                      </label>
                      <input
                        type="date"
                        value={quickUpdateScheduleDate}
                        onChange={(e) => setQuickUpdateScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Scheduled Time
                      </label>
                      <input
                        type="text"
                        value={quickUpdateScheduledTime}
                        onChange={(e) => setQuickUpdateScheduledTime(e.target.value)}
                        placeholder="e.g. 14:00 or 02:00 PM"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium focus:border-indigo-400 placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-1">
                        Audit Note / Remarks (Stored in 'Followup' sheet)
                      </label>
                      <input
                        type="text"
                        value={quickUpdateNotes}
                        onChange={(e) => setQuickUpdateNotes(e.target.value)}
                        placeholder="e.g. Schedule updated by customer request, confirmed delivery time."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-400/30 bg-slate-900 text-white font-medium placeholder:text-slate-500 focus:border-indigo-400"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={!quickUpdateOrderId || isSavingStatus}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30 active:scale-[0.99]"
                      >
                        {isSavingStatus ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Syncing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Update &amp; Sync Sheet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Followup Historical Audit Trail Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <span>Historical Followup Status Audit Trail</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Complete log recorded in the 'Followup' sheet for tracking changes over time.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={followupSearch}
                      onChange={(e) => setFollowupSearch(e.target.value)}
                      placeholder="Search history by order, customer..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <th className="py-3 px-3.5 whitespace-nowrap">Timestamp</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Order ID</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Customer Name</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Previous Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">New Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Order Status</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Order Value</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Schedule</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Updated By</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">Remarks / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {followupHistory.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center py-10 text-slate-400 font-semibold">
                            No followup history records logged yet. Change any order status above to create the first record!
                          </td>
                        </tr>
                      ) : (
                        followupHistory
                          .filter((h) => {
                            if (!followupSearch.trim()) return true;
                            const q = followupSearch.toLowerCase();
                            return (
                              h.orderId.toLowerCase().includes(q) ||
                              (h.customerName || '').toLowerCase().includes(q) ||
                              (h.newStatus || '').toLowerCase().includes(q) ||
                              (h.notes || '').toLowerCase().includes(q)
                            );
                          })
                          .map((hist) => (
                            <tr key={hist.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {hist.timestamp}
                              </td>
                              <td className="py-3 px-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                                #{hist.orderId}
                              </td>
                              <td className="py-3 px-3.5 font-medium whitespace-nowrap text-slate-900">
                                {hist.customerName || '-'}
                              </td>
                              <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                                {hist.customerContact || '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {hist.previousStatus || 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    hist.newStatus === 'Delivered'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : hist.newStatus === 'Confirmed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : hist.newStatus === 'Cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {hist.newStatus}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-700">
                                {hist.orderStatus}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                                {hist.orderValue !== undefined ? `৳ ${hist.orderValue.toLocaleString()}` : '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 text-[11px]">
                                {hist.scheduleDate ? `${hist.scheduleDate} ${hist.scheduledTime || ''}` : '-'}
                              </td>
                              <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-indigo-900">
                                {hist.updatedBy}
                              </td>
                              <td className="py-3 px-3.5 text-slate-600 max-w-[250px] truncate" title={hist.notes}>
                                {hist.notes || '-'}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Summary Date Filters */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">Summary Analytics Range</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Create Date
                    </label>
                    <select
                      value={summaryCreateFilter}
                      onChange={(e) => setSummaryCreateFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    {summaryCreateFilter === 'custom' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="date"
                          value={summaryCreateStart}
                          onChange={(e) => setSummaryCreateStart(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={summaryCreateEnd}
                          onChange={(e) => setSummaryCreateEnd(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Schedule Date
                    </label>
                    <select
                      value={summaryScheduleFilter}
                      onChange={(e) => setSummaryScheduleFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    {summaryScheduleFilter === 'custom' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="date"
                          value={summaryScheduleStart}
                          onChange={(e) => setSummaryScheduleStart(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={summaryScheduleEnd}
                          onChange={(e) => setSummaryScheduleEnd(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Delivered Date
                    </label>
                    <select
                      value={summaryDeliveredFilter}
                      onChange={(e) => setSummaryDeliveredFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    {summaryDeliveredFilter === 'custom' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="date"
                          value={summaryDeliveredStart}
                          onChange={(e) => setSummaryDeliveredStart(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={summaryDeliveredEnd}
                          onChange={(e) => setSummaryDeliveredEnd(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Cancelled Date
                    </label>
                    <select
                      value={summaryCancelledFilter}
                      onChange={(e) => setSummaryCancelledFilter(e.target.value as DateFilterType)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7">Last 7 Days</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastYear">Last Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    {summaryCancelledFilter === 'custom' && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <input
                          type="date"
                          value={summaryCancelledStart}
                          onChange={(e) => setSummaryCancelledStart(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={summaryCancelledEnd}
                          onChange={(e) => setSummaryCancelledEnd(e.target.value)}
                          className="w-full text-xs p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Orders Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs max-w-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Total Orders
                </p>
                <p className="text-4xl font-extrabold text-indigo-700">
                  {summaryFilteredOrders.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">Orders in selected period</p>
              </div>

              {/* 3 Summary Tables */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* City Count */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
                  <h4 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>City Order Count</span>
                  </h4>
                  <div className="overflow-x-auto flex-1 border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold">
                          <th className="py-2.5 px-3 text-left">City</th>
                          <th className="py-2.5 px-3 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(summaryBreakdowns.cityMap)
                          .sort((a, b) => b[1] - a[1])
                          .map(([city, count]) => (
                            <tr key={city}>
                              <td className="py-2 px-3 text-slate-700">{city}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{count}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                          <td className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right text-indigo-700">
                            {Object.values(summaryBreakdowns.cityMap).reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Channel Count */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
                  <h4 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Channel Order Count</span>
                  </h4>
                  <div className="overflow-x-auto flex-1 border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold">
                          <th className="py-2.5 px-3 text-left">Channel</th>
                          <th className="py-2.5 px-3 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(summaryBreakdowns.channelMap)
                          .sort((a, b) => b[1] - a[1])
                          .map(([channel, count]) => (
                            <tr key={channel}>
                              <td className="py-2 px-3 text-slate-700">{channel}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{count}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                          <td className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right text-indigo-700">
                            {Object.values(summaryBreakdowns.channelMap).reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Delivery Area Count */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
                  <h4 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>Delivery Area Order Count</span>
                  </h4>
                  <div className="overflow-x-auto flex-1 border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold">
                          <th className="py-2.5 px-3 text-left">Area</th>
                          <th className="py-2.5 px-3 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(summaryBreakdowns.areaMap)
                          .sort((a, b) => b[1] - a[1])
                          .map(([area, count]) => (
                            <tr key={area}>
                              <td className="py-2 px-3 text-slate-700">{area}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{count}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                          <td className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right text-indigo-700">
                            {Object.values(summaryBreakdowns.areaMap).reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROFILES */}
          {activeTab === 'profiles' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <h3 className="font-extrabold text-slate-900 text-base">Account Details</h3>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                      Username
                    </p>
                    <p className="text-xl font-extrabold text-slate-900">
                      {currentManager.user}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                      Role
                    </p>
                    <p className="text-xl font-extrabold text-indigo-700">
                      {currentManager.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Status & Remarks Update Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Update Followup Status &amp; Sync
                  </h3>
                  <p className="text-[11px] text-slate-400">Order #{statusModalOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">Customer:</span>
                  <span className="font-bold text-slate-900">{statusModalOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Contact:</span>
                  <span className="font-mono text-slate-700">{statusModalOrder.customerContact}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">Current Followup:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {statusModalOrder.followupStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Editable Order Fields: Order Value & Profit */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Order Value (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={modalOrderValue}
                    onChange={(e) => setModalOrderValue(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Profit Amount (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={modalProfit}
                    onChange={(e) => setModalProfit(e.target.value)}
                    placeholder="Enter profit"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-hidden focus:border-indigo-600 text-emerald-700"
                  />
                </div>
              </div>

              {/* Editable Schedule Date & Time */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Schedule Date
                  </label>
                  <input
                    type="date"
                    value={modalScheduleDate}
                    onChange={(e) => setModalScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    value={modalScheduledTime}
                    onChange={(e) => setModalScheduledTime(e.target.value)}
                    placeholder="e.g. 14:00 or 02:00 PM"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Status Selector: Followup Status only */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Followup Status
                </label>
                <select
                  value={modalFollowupStatus}
                  onChange={(e) => setModalFollowupStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Audit Note (Stored in 'Followup' sheet)
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. Schedule updated, customer requested evening delivery."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingStatus}
                  onClick={async () => {
                    setIsSavingStatus(true);
                    try {
                      await onUpdateOrderStatus?.(
                        statusModalOrder.id,
                        {
                          followupStatus: modalFollowupStatus,
                          orderValue: modalOrderValue !== '' ? parseFloat(modalOrderValue) : undefined,
                          profit: modalProfit !== '' ? parseFloat(modalProfit) : undefined,
                          scheduleDate: modalScheduleDate,
                          scheduledTime: modalScheduledTime
                        },
                        'Manager',
                        modalNotes
                      );
                      setStatusModalOrder(null);
                    } finally {
                      setIsSavingStatus(false);
                    }
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  {isSavingStatus ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update &amp; Sync</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Google Apps Script Dual-Sheet Code */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Google Apps Script Dual-Sheet Sync Code
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Supports in-place Sheet1 update &amp; 'Followup' sheet historical logging
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 shrink-0 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
              <p className="font-bold text-[12px] text-amber-950 flex items-center gap-1.5">
                <span>⚠️ কেন হিস্টোরি বা ডাটা আপডেট হয়নি? / Why didn't history save previously?</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                আপনার গুগল শীটে আগে ডিপ্লয় করা পুরানো স্ক্রিপ্টে শুধুমাত্র নতুন অর্ডার যুক্ত করার কোড ছিল। অর্ডার ভ্যালু, শিডিউল ও ফলোআপ স্ট্যাটাস আপডেট এবং <strong>'Followup'</strong> শীটে অডিট ট্রেইল হিস্টোরি স্টোর করতে নিচে দেওয়া নতুন <strong>Code.gs</strong> কোডটি ব্যবহার করতে হবে:
              </p>
              <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-slate-800 font-medium pt-1">
                <li>Google Sheet-এ <strong>Extensions &gt; Apps Script</strong> খুলুন।</li>
                <li><strong>Code.gs</strong>-এর সব কোড মুছে নিচের কোড পেস্ট করে <strong>Save</strong> (💾) করুন।</li>
                <li><strong>Deploy &gt; Manage deployments</strong> &gt; Edit (পেন্সিল) &gt; Version: <strong>"New version"</strong> সিলেক্ট করে <strong>Deploy</strong> করুন।</li>
              </ol>
            </div>

            <div className="relative flex-1 min-h-[220px] bg-slate-900 rounded-xl p-3 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400 shrink-0">
                <span>Code.gs</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(OrderService.getUpdatedAppsScriptCode());
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-1 overflow-auto text-[11px] font-mono text-slate-200 mt-2 p-1 leading-relaxed">
                {OrderService.getUpdatedAppsScriptCode()}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Agent Details Card */}
      {selectedAgentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  {selectedAgentDetails.user.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {selectedAgentDetails.name || selectedAgentDetails.user}
                  </h3>
                  <p className="text-[11px] text-slate-400">Agent ID: {selectedAgentDetails.user}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Password</span>
                <span className="font-mono font-bold text-slate-800">{selectedAgentDetails.pass}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Team</span>
                <span className="font-bold text-indigo-700">{selectedAgentDetails.team}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Contact
                </span>
                <span className="font-mono text-slate-700">{selectedAgentDetails.contact || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <span className="text-slate-700 truncate block">{selectedAgentDetails.email || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" /> Blood Group
                </span>
                <span className="font-bold text-red-700">{selectedAgentDetails.bloodGroup || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Birthday
                </span>
                <span className="font-mono text-slate-700">{selectedAgentDetails.birthday || 'Not set'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Residential Address
                </span>
                <span className="text-slate-700 block mt-0.5">{selectedAgentDetails.address || 'Not specified'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</span>
                  <span className={`font-bold text-xs ${selectedAgentDetails.status === 'deactivated' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {selectedAgentDetails.status === 'deactivated' ? 'Deactivated (Locked)' : 'Active (Normal)'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const idx = agents.findIndex(a => a.user === selectedAgentDetails.user);
                    if (idx !== -1) {
                      handleToggleAgentStatus(idx);
                      setSelectedAgentDetails(prev => prev ? {
                        ...prev,
                        status: prev.status === 'deactivated' ? 'active' : 'deactivated'
                      } : null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    selectedAgentDetails.status === 'deactivated'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                  }`}
                >
                  {selectedAgentDetails.status === 'deactivated' ? 'Activate Account' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
