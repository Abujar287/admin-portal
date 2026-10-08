/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AgentUser, OrderItem } from './types';
import { OrderService } from './services/orderService';
import { LoginModal } from './components/LoginModal';
import { Sidebar } from './components/Sidebar';
import { ProfileView } from './components/ProfileView';
import { CreateOrderView } from './components/CreateOrderView';
import { MyOrdersView } from './components/MyOrdersView';
import { DashboardView } from './components/DashboardView';
import { Menu, Plus, RefreshCw, CheckCircle2, Shield } from 'lucide-react';

export default function App() {
  const [agents, setAgents] = useState<AgentUser[]>(() => OrderService.getAgents());
  const [currentAgent, setCurrentAgent] = useState<AgentUser | null>(null);
  const [activeTab, setActiveTab] = useState<'profiles' | 'addOrder' | 'orders' | 'dashboard'>('profiles');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>(() => OrderService.getLocalOrders());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-login check
  useEffect(() => {
    const savedUserId = localStorage.getItem('agent_portal_current_user');
    if (savedUserId) {
      const found = agents.find(a => a.user.toLowerCase() === savedUserId.toLowerCase());
      if (found) {
        setCurrentAgent(found);
      }
    }
  }, [agents]);

  // Initial fetch from Google Apps Script
  useEffect(() => {
    if (currentAgent) {
      loadOrdersData(false);
    }
  }, [currentAgent]);

  const loadOrdersData = async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const res = await OrderService.fetchOrders(forceRefresh);
      setOrders(res.orders);
      if (forceRefresh) {
        showToast('Orders refreshed successfully!');
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

  const handleLogin = (agent: AgentUser) => {
    setCurrentAgent(agent);
    localStorage.setItem('agent_portal_current_user', agent.user);
    setActiveTab('profiles');
    showToast(`Welcome, ${agent.name}!`);
  };

  const handleLogout = () => {
    setCurrentAgent(null);
    localStorage.removeItem('agent_portal_current_user');
  };

  const handleOrderCreated = (newOrder: OrderItem) => {
    setOrders(prev => [newOrder, ...prev]);
    showToast(`Order #${newOrder.id} logged!`);
    setTimeout(() => setActiveTab('orders'), 800);
  };

  const handleUpdateOrderStatus = (orderId: string, updates: Partial<OrderItem>) => {
    const updated = OrderService.updateOrderStatus(orderId, updates);
    setOrders(updated);
    showToast(`Order #${orderId} updated!`);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Login Modal Overlay */}
      {!currentAgent && (
        <LoginModal agents={agents} onLogin={handleLogin} />
      )}

      {/* Main App Layout */}
      {currentAgent && (
        <>
          {/* Desktop & Collapsible Sidebar */}
          <div className="hidden md:flex">
            <Sidebar
              currentAgent={currentAgent}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              onLogout={handleLogout}
              ordersCount={orders.filter(o => o.agentId.toLowerCase() === currentAgent.user.toLowerCase()).length}
            />
          </div>

          {/* Mobile Drawer */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 md:hidden flex">
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-2xs"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="relative z-50">
                <Sidebar
                  currentAgent={currentAgent}
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  collapsed={false}
                  setCollapsed={() => {}}
                  onLogout={handleLogout}
                  ordersCount={orders.filter(o => o.agentId.toLowerCase() === currentAgent.user.toLowerCase()).length}
                />
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Top Bar for Mobile & Breadcrumbs */}
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
                    {activeTab === 'profiles' && 'Agent Profile'}
                    {activeTab === 'addOrder' && 'Create Order'}
                    {activeTab === 'orders' && 'My Orders'}
                    {activeTab === 'dashboard' && 'Performance Dashboard'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {currentAgent.user}
                  </span>
                </div>
              </div>

              {/* Top Header Actions: Simple Refresh Button & New Order */}
              <div className="flex items-center gap-2">
                {activeTab !== 'addOrder' && (
                  <button
                    onClick={() => setActiveTab('addOrder')}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Create Order</span>
                  </button>
                )}

                {/* Clean Simple Refresh Button */}
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

            {/* Scrollable View Container */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
              {activeTab === 'profiles' && (
                <ProfileView
                  currentAgent={currentAgent}
                  orders={orders}
                  onNavigateToCreate={() => setActiveTab('addOrder')}
                  onNavigateToOrders={() => setActiveTab('orders')}
                />
              )}

              {activeTab === 'addOrder' && (
                <CreateOrderView
                  currentAgent={currentAgent}
                  onOrderCreated={handleOrderCreated}
                />
              )}

              {activeTab === 'orders' && (
                <MyOrdersView
                  currentAgent={currentAgent}
                  orders={orders}
                  onRefresh={() => loadOrdersData(true)}
                  isRefreshing={isRefreshing}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              )}

              {activeTab === 'dashboard' && (
                <DashboardView
                  currentAgent={currentAgent}
                  orders={orders}
                  onRefresh={() => loadOrdersData(true)}
                  isRefreshing={isRefreshing}
                />
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}
