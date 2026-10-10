/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AgentUser, ManagerUser, OrderItem, FollowupHistoryItem } from './types';
import { OrderService } from './services/orderService';
import { AuthScreen } from './components/AuthScreen';
import { AgentSidebar } from './components/AgentSidebar';
import { AgentProfileView } from './components/AgentProfileView';
import { MyOrdersView } from './components/MyOrdersView';
import { DashboardView } from './components/DashboardView';
import { ManagerPortal } from './components/ManagerPortal';
import { Menu, Shield, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [agents, setAgents] = useState<AgentUser[]>(() => OrderService.getAgents());
  const [currentSession, setCurrentSession] = useState<
    { role: 'agent'; agent: AgentUser } | { role: 'manager'; manager: ManagerUser } | null
  >(null);

  // Agent navigation state (strictly Profile, My Orders, Performance - no Create Order in sidebar)
  const [agentActiveTab, setAgentActiveTab] = useState<'profiles' | 'orders' | 'dashboard'>('orders');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Orders State (synced from Google Sheet)
  const [orders, setOrders] = useState<OrderItem[]>(() => OrderService.getLocalOrders());
  const [followupHistory, setFollowupHistory] = useState<FollowupHistoryItem[]>(() => OrderService.getFollowupHistory());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check saved session on mount (using sessionStorage so testing logins doesn't stick accidentally)
  useEffect(() => {
    const savedRole = sessionStorage.getItem('portal_session_role');
    const savedUser = sessionStorage.getItem('portal_session_user');

    if (savedRole === 'manager' && (savedUser === 'manager' || savedUser === 'manager01')) {
      setCurrentSession({
        role: 'manager',
        manager: {
          user: 'manager',
          pass: 'manager',
          name: 'Manager (Admin)',
          role: 'System Administrator'
        }
      });
    } else if (savedRole === 'agent' && savedUser) {
      const allAgents = OrderService.getAgents();
      const found = allAgents.find((a) => a.user.toLowerCase() === savedUser.toLowerCase());
      if (found && found.status !== 'deactivated') {
        setCurrentSession({ role: 'agent', agent: found });
      } else {
        sessionStorage.removeItem('portal_session_role');
        sessionStorage.removeItem('portal_session_user');
      }
    }
  }, []);

  // Initial fetch from Google Apps Script
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
      const res = await OrderService.fetchOrders(forceRefresh);
      setOrders(res.orders);
      if (forceRefresh) {
        showToast('Sheet data refreshed successfully!');
      }
    } catch {
      // fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAgentLogin = (agent: AgentUser) => {
    if (agent.role === 'Team Leader') {
      setCurrentSession({
        role: 'manager',
        manager: {
          user: agent.user,
          pass: agent.pass,
          name: agent.name || agent.user,
          role: 'Team Leader'
        }
      });
      sessionStorage.setItem('portal_session_role', 'manager');
      sessionStorage.setItem('portal_session_user', agent.user);
      showToast(`Welcome Team Leader, ${agent.name || agent.user}!`);
      return;
    }
    setCurrentSession({ role: 'agent', agent });
    sessionStorage.setItem('portal_session_role', 'agent');
    sessionStorage.setItem('portal_session_user', agent.user);
    setAgentActiveTab('orders');
    showToast(`Welcome, ${agent.name || agent.user}!`);
  };

  const handleManagerLogin = (manager: ManagerUser) => {
    setCurrentSession({ role: 'manager', manager });
    sessionStorage.setItem('portal_session_role', 'manager');
    sessionStorage.setItem('portal_session_user', manager.user);
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
    const res = await OrderService.updateOrderStatus(orderId, updates, updatedBy, notes);
    setOrders(res.updatedOrders);
    if (res.historyItem) {
      setFollowupHistory((prev) => [res.historyItem!, ...prev]);
    }
    showToast(
      updates.followupStatus
        ? `Order #${orderId} followup status updated to "${updates.followupStatus}"!`
        : `Order #${orderId} status updated!`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden select-none">
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
          followupHistory={followupHistory}
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
                orders.filter(
                  (o) => o.agentId.toLowerCase() === currentSession.agent.user.toLowerCase()
                ).length
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
                    orders.filter(
                      (o) => o.agentId.toLowerCase() === currentSession.agent.user.toLowerCase()
                    ).length
                  }
                />
              </div>
            </div>
          )}

          {/* Agent Main Content */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-200/80 bg-white px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {agentActiveTab === 'profiles' && 'My Profile'}
                    {agentActiveTab === 'orders' && 'My Orders'}
                    {agentActiveTab === 'dashboard' && 'Performance Analytics'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {currentSession.agent.user}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadOrdersData(true)}
                  disabled={isRefreshing}
                  title="Refresh Orders Data"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </header>

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
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onOrderCreated={handleOrderCreated}
                />
              )}

              {agentActiveTab === 'dashboard' && (
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
