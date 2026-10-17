/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AgentUser, ManagerUser, OrderItem, FollowupHistoryItem, AgentNavTab } from './types';
import { OrderService } from './services/orderService';
import { AuthScreen } from './components/AuthScreen';
import { AgentSidebar } from './components/AgentSidebar';
import { AgentProfileView } from './components/AgentProfileView';
import { MyOrdersView } from './components/MyOrdersView';
import { DashboardView } from './components/DashboardView';
import { AgentFollowupView } from './components/AgentFollowupView';
import { AgentSummaryView } from './components/AgentSummaryView';
import { ManagerPortal } from './components/ManagerPortal';
import { CreateOrderModal } from './components/CreateOrderModal';
import { isOrderAssignedToAgent } from './utils/agentMatching';
import { Menu, Shield, RefreshCw, CheckCircle2, Plus, Sun, Moon } from 'lucide-react';

export default function App() {
  const [agents, setAgents] = useState<AgentUser[]>(() => OrderService.getAgents());
  const [currentSession, setCurrentSession] = useState<
    { role: 'agent'; agent: AgentUser } | { role: 'manager'; manager: ManagerUser } | null
  >(null);

  // Agent navigation state supporting all manager-assigned tabs
  const [agentActiveTab, setAgentActiveTab] = useState<AgentNavTab>('orders');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Orders State (synced from Google Sheet)
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [followupHistory, setFollowupHistory] = useState<FollowupHistoryItem[]>(() => OrderService.getFollowupHistory());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAgentCreateOrderOpen, setIsAgentCreateOrderOpen] = useState(false);

  useEffect(() => {
    OrderService.getLocalOrders().then(setOrders);
  }, []);


  // Check saved session on mount (using sessionStorage so testing logins doesn't stick accidentally)
  useEffect(() => {
    const savedRole = sessionStorage.getItem('portal_session_role');
    const savedUser = sessionStorage.getItem('portal_session_user');

    if (savedRole === 'manager') {
      setCurrentSession({
        role: 'manager',
        manager: {
          user: '1',
          pass: '01410089771',
          name: 'Manager',
          role: 'Manager'
        }
      });
    } else if (savedRole === 'agent' && savedUser) {
      const allAgents = OrderService.getAgents();
      const found = allAgents.find((a) => (a?.user || '').toLowerCase() === String(savedUser).toLowerCase());
      if (found && found.status !== 'deactivated') {
        setCurrentSession({ role: 'agent', agent: found });
      } else {
        sessionStorage.removeItem('portal_session_role');
        sessionStorage.removeItem('portal_session_user');
      }
    }
  }, []);

  // Immediate initial fetch from Google Sheet on mount
  useEffect(() => {
    loadOrdersData(true);
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadOrdersData(false);
    }
  }, [currentSession]);

  // Auto-refresh orders every 30 seconds when agent session is active (My Orders & Performance tabs)
  useEffect(() => {
    if (currentSession?.role === 'agent') {
      const interval = setInterval(() => {
        loadOrdersData(false);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentSession]);

  const loadOrdersData = async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const [res, followupHist, sheetAgents] = await Promise.all([
        OrderService.fetchOrders(forceRefresh),
        OrderService.fetchFollowupHistory(),
        OrderService.fetchAgentsFromSheet()
      ]);
      if (res.orders && res.orders.length > 0) {
        setOrders(res.orders);
      }
      if (followupHist && followupHist.length > 0) {
        setFollowupHistory(followupHist);
      }
      if (sheetAgents && sheetAgents.length > 0) {
        setAgents(sheetAgents);
        // Also update current active agent session if permissions changed
        setCurrentSession((prev) => {
          if (prev?.role === 'agent') {
            const updated = sheetAgents.find((a) => (a.user || '').toLowerCase() === prev.agent.user.toLowerCase());
            if (updated) {
              return { role: 'agent', agent: updated };
            }
          }
          return prev;
        });
      }
      if (forceRefresh) {
        showToast(`Synced ${res.orders.length} orders & ${followupHist.length} followups from Google Sheet!`);
      }
      if (res.error) {
        console.warn('Sync error:', res.error);
      }
    } catch (err: any) {
      console.error('loadOrdersData error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAgentLogin = (agent: AgentUser) => {
    // Only users with explicit Manager role route to the Manager portal
    if (agent.role === 'Manager') {
      setCurrentSession({
        role: 'manager',
        manager: {
          user: agent.user || '1',
          pass: agent.pass,
          name: agent.name || 'Manager',
          role: 'Manager'
        }
      });
      sessionStorage.setItem('portal_session_role', 'manager');
      sessionStorage.setItem('portal_session_user', agent.user || '1');
      showToast(`Welcome Manager, ${agent.name || 'Manager'}!`);
      return;
    }
    setCurrentSession({ role: 'agent', agent });
    sessionStorage.setItem('portal_session_role', 'agent');
    sessionStorage.setItem('portal_session_user', agent.user);
    const allowedTabs = agent.permissions?.allowedTabs && Array.isArray(agent.permissions.allowedTabs) && agent.permissions.allowedTabs.length > 0
      ? agent.permissions.allowedTabs
      : ['summary', 'orders', 'followup', 'agent-performance', 'profiles'];
    const defaultTab = (allowedTabs.includes('orders') ? 'orders' : allowedTabs[0]) as AgentNavTab;
    setAgentActiveTab(defaultTab || 'orders');
    showToast(`Welcome, ${agent.name || agent.user}!`);
  };

  const handleManagerLogin = (manager: ManagerUser) => {
    const mgrUser: ManagerUser = {
      ...manager,
      user: manager.role === 'Manager' ? '1' : manager.user,
      name: manager.role === 'Manager' ? 'Manager' : manager.name
    };
    setCurrentSession({ role: 'manager', manager: mgrUser });
    sessionStorage.setItem('portal_session_role', 'manager');
    sessionStorage.setItem('portal_session_user', mgrUser.user);
    showToast('Manager Portal session active!');
  };

  const handleLogout = () => {
    setCurrentSession(null);
    sessionStorage.removeItem('portal_session_role');
    sessionStorage.removeItem('portal_session_user');
    localStorage.removeItem('portal_session_role');
    localStorage.removeItem('portal_session_user');
  };

  const handleUpdateAgentProfile = (updatedAgent: AgentUser) => {
    const updatedList = agents.map((a) => (a.user === updatedAgent.user ? updatedAgent : a));
    setAgents(updatedList);
    OrderService.saveAgents(updatedList);
    if (currentSession?.role === 'agent') {
      setCurrentSession({ role: 'agent', agent: updatedAgent });
    }
    showToast('Profile updated successfully!');
  };

  const handleUpdateAgentsFromManager = (newAgents: AgentUser[], showNotification = false) => {
    setAgents(newAgents);
    OrderService.saveAgents(newAgents);
    if (showNotification) {
      showToast('Agents directory updated!');
    }
  };

  const handleOrderCreated = (newOrder: OrderItem) => {
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`Order #${newOrder.id} placed and recorded!`);
  };

  const handleUpdateOrderStatus = async (
    orderId: string, 
    updates: Partial<OrderItem>, 
    updatedBy = 'Manager',
    notes = ''
  ) => {
    if (!currentSession) {
      showToast('Access Denied: Please log in!');
      return;
    }

    if (currentSession.role === 'agent') {
      const perms = currentSession.agent.permissions || {
        canCreate: true,
        canUpdateStatus: true,
        canChangeValue: true,
        canAddProfit: true,
        canCancel: true
      };

      // Check schedule change permission
      if (updates.schedule_date !== undefined || updates.scheduleDate !== undefined || updates.schedule_time !== undefined || updates.scheduledTime !== undefined) {
        if (perms.canChangeSchedule === false) {
          showToast('Access Denied: You do not have permission to change delivery schedule after order placement.');
          return;
        }
      }

      // Check status update permission and allowed statuses
      const requestedStatus = updates.followup_status || updates.followupStatus || updates.order_status || updates.orderStatus;
      if (requestedStatus) {
        if (perms.canUpdateStatus === false) {
          showToast('Access Denied: You do not have permission to update status after order placement.');
          return;
        }

        if (String(requestedStatus).toLowerCase() === 'cancelled' && perms.canCancel === false) {
          showToast('Access Denied: You do not have permission to cancel orders.');
          return;
        }

        const allowed = perms.allowedOrderStatuses;
        if (Array.isArray(allowed) && allowed.length > 0) {
          const isAllowed = allowed.some(s => s.toLowerCase() === String(requestedStatus).toLowerCase());
          if (!isAllowed) {
            showToast(`Access Denied: Status "${requestedStatus}" is restricted for your agent role.`);
            return;
          }
        }
      }

      // Check change value permission
      if (updates.order_value !== undefined || updates.orderValue !== undefined) {
        if (perms.canChangeValue === false) {
          showToast('Access Denied: You do not have permission to change price/order value after order placement.');
          return;
        }
      }

      // Check add profit permission
      if (updates.profit !== undefined && updates.profit !== null && String(updates.profit) !== '') {
        if (perms.canAddProfit === false) {
          showToast('Access Denied: You do not have permission to modify profit after order placement.');
          return;
        }
      }
    }

    // Determine real account username of active user
    // Manager access: updated_by must strictly be 1, never an email
    let effectiveUpdatedBy = 'Manager (@1)';
    if (currentSession.role === 'manager') {
      effectiveUpdatedBy = 'Manager (@1)';
    } else {
      if (currentSession.agent.role === 'Manager' || currentSession.agent.user === '1') {
        effectiveUpdatedBy = 'Manager (@1)';
      } else {
        const activeAccountName = `${currentSession.agent.name || currentSession.agent.user} (@${currentSession.agent.user})`;
        effectiveUpdatedBy = (updatedBy && updatedBy !== 'Manager') ? updatedBy : activeAccountName;
      }
    }

    const res = await OrderService.updateOrderStatus(orderId, updates, effectiveUpdatedBy, notes);
    setOrders(res.updatedOrders);
    if (res.historyItem) {
      setFollowupHistory((prev) => [res.historyItem!, ...prev]);
    }
    showToast(
      updates.followup_status || updates.followupStatus
        ? `Order #${orderId} followup status updated to "${updates.followup_status || updates.followupStatus}" & synced!`
        : `Order #${orderId} status updated & synced!`
    );
  };

  const handleRevertFollowup = async (historyId: string, orderId: string, previousStatus: string, undoneBy?: string) => {
    if (currentSession?.role !== 'manager') {
      showToast('Access Denied: Only managers can revert followups!');
      return;
    }
    const userWhoUndid = undoneBy || (currentSession?.role === 'manager' ? (currentSession.manager.name || currentSession.manager.user) : 'Manager');
    const res = await OrderService.revertFollowup(historyId, orderId, previousStatus, userWhoUndid);
    setOrders(res.updatedOrders);
    setFollowupHistory(res.updatedHistory);
    showToast(`Order #${orderId} reverted to "${previousStatus || 'Pending'}"! Undo event logged in history.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1st Entry Interface: Dual Agent / Manager Login */}
      {!currentSession && (
        <AuthScreen
          agents={agents}
          onAgentLogin={handleAgentLogin}
          onManagerLogin={handleManagerLogin}
          onUpdateAgents={handleUpdateAgentsFromManager}
        />
      )}

      {/* MANAGER PORTAL INTERFACE */}
      {currentSession?.role === 'manager' && (
        <ManagerPortal
          currentManager={currentSession.manager}
          agents={agents}
          onUpdateAgents={handleUpdateAgentsFromManager}
          orders={orders}
          onUpdateOrders={(newOrders) => {
            setOrders(newOrders);
            OrderService.saveLocalOrders(newOrders);
          }}
          followupHistory={followupHistory}
          onUpdateFollowupHistory={(newHist) => {
            setFollowupHistory(newHist);
            OrderService.saveFollowupHistory(newHist);
          }}
          onRevertFollowup={handleRevertFollowup}
          onRefreshOrders={() => loadOrdersData(true)}
          isRefreshing={isRefreshing}
          onLogout={handleLogout}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      )}

      {/* AGENT PORTAL INTERFACE */}
      {currentSession?.role === 'agent' && (
        <div className="flex h-screen overflow-hidden">
          {/* Agent Desktop Sidebar (Create Order removed from sidebar) */}
          <div className="hidden md:flex">
            <AgentSidebar
              currentAgent={currentSession.agent}
              activeTab={agentActiveTab}
              setActiveTab={setAgentActiveTab}
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              onLogout={handleLogout}
              ordersCount={
                orders.filter((o) => isOrderAssignedToAgent(o, currentSession.agent)).length
              }
            />
          </div>

          {/* Agent Mobile Drawer */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 md:hidden flex">
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-2xs"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="relative z-50">
                <AgentSidebar
                  currentAgent={currentSession.agent}
                  activeTab={agentActiveTab}
                  setActiveTab={(tab) => {
                    setAgentActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  collapsed={false}
                  setCollapsed={() => {}}
                  onLogout={handleLogout}
                  ordersCount={
                    orders.filter((o) => isOrderAssignedToAgent(o, currentSession.agent)).length
                  }
                />
              </div>
            </div>
          )}

          {/* Agent Main Content */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121212] px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {agentActiveTab === 'profiles' && 'My Profile'}
                    {agentActiveTab === 'orders' && 'My Orders'}
                    {(agentActiveTab === 'dashboard' || agentActiveTab === 'agent-performance') && 'Performance Analytics'}
                    {agentActiveTab === 'followup' && 'Followup Status & History'}
                    {agentActiveTab === 'summary' && 'Analytics & Store Summary'}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {currentSession.agent.user}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsAgentCreateOrderOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Add New Order"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Order</span>
                </button>

                <button
                  onClick={() => loadOrdersData(true)}
                  disabled={isRefreshing}
                  title="Refresh Orders Data"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer shrink-0 w-[95px] justify-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </header>

            {/* Create Order Modal for Agent from Header */}
            {isAgentCreateOrderOpen && (
              <CreateOrderModal
                isOpen={isAgentCreateOrderOpen}
                onClose={() => setIsAgentCreateOrderOpen(false)}
                currentAgent={currentSession.agent}
                onOrderCreated={(newOrd) => {
                  handleOrderCreated(newOrd);
                  setIsAgentCreateOrderOpen(false);
                }}
                orders={orders}
              />
            )}

            {/* Scrollable Agent Workspace */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
              {agentActiveTab === 'profiles' && (
                <AgentProfileView
                  currentAgent={currentSession.agent}
                  onUpdateAgentProfile={handleUpdateAgentProfile}
                />
              )}

              {agentActiveTab === 'orders' && (
                <MyOrdersView
                  currentAgent={currentSession.agent}
                  orders={orders}
                  onRefresh={() => loadOrdersData(true)}
                  isRefreshing={isRefreshing}
                  onOrderCreated={handleOrderCreated}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              )}

              {agentActiveTab === 'followup' && (
                <AgentFollowupView
                  currentAgent={currentSession.agent}
                  orders={orders}
                  followupHistory={followupHistory}
                  onRefresh={() => loadOrdersData(true)}
                  isRefreshing={isRefreshing}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              )}

              {agentActiveTab === 'summary' && (
                <AgentSummaryView
                  currentAgent={currentSession.agent}
                  orders={orders}
                  followupHistory={followupHistory}
                  onRefresh={() => loadOrdersData(true)}
                  isRefreshing={isRefreshing}
                />
              )}

              {(agentActiveTab === 'dashboard' || agentActiveTab === 'agent-performance') && (
                <DashboardView
                  currentAgent={currentSession.agent}
                  orders={orders}
                  followupHistory={followupHistory}
                  onRefresh={() => loadOrdersData(true)}
                  isRefreshing={isRefreshing}
                />
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
