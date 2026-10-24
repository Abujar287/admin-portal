import React, { useState, useEffect, useCallback } from 'react';
import { ManagerUser, AgentUser, OrderItem, FollowupHistoryItem, SystemUser } from './types';
import { OrderService, formatActorUsernameId } from './services/orderService';
import { AuthScreen } from './components/AuthScreen';
import { ManagerPortal } from './components/ManagerPortal';

export function App() {
  const [currentManager, setCurrentManager] = useState<ManagerUser | null>(() => {
    try {
      const saved = localStorage.getItem('agent_portal_current_manager');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'Manager' || parsed.user === '1' || parsed.user === 'Manager')) {
          parsed.name = 'Manager';
          parsed.user = 'Manager';
        }
        return parsed;
      }
    } catch {}
    return null;
  });

  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [followupHistory, setFollowupHistory] = useState<FollowupHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    if (currentManager) {
      localStorage.setItem('agent_portal_current_manager', JSON.stringify(currentManager));
    } else {
      localStorage.removeItem('agent_portal_current_manager');
    }
  }, [currentManager]);

  const loadInitialData = useCallback(async () => {
    // 1. Instant local cache load (renders in < 10ms without blank screen)
    try {
      const localAg = await OrderService.getAgents();
      if (localAg && localAg.length > 0) setAgents(localAg);
      const localOrd = await OrderService.getLocalOrders();
      if (localOrd && localOrd.length > 0) setOrders(localOrd);
      const localHist = OrderService.getFollowupHistory();
      if (localHist && localHist.length > 0) setFollowupHistory(localHist);
    } catch (e) {
      console.warn('Local cache initial load warning:', e);
    }

    // 2. Concurrently fetch fresh sheet data in background
    setIsRefreshing(true);
    try {
      const [orderRes, historyRes, sheetAgentsRes] = await Promise.allSettled([
        OrderService.fetchOrders(),
        OrderService.fetchFollowupHistory(),
        OrderService.fetchAgentsFromSheet()
      ]);

      if (orderRes.status === 'fulfilled' && orderRes.value?.orders && orderRes.value.orders.length > 0) {
        setOrders(orderRes.value.orders);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value && historyRes.value.length > 0) {
        setFollowupHistory(historyRes.value);
      }
      if (sheetAgentsRes.status === 'fulfilled' && sheetAgentsRes.value && sheetAgentsRes.value.length > 0) {
        setAgents(sheetAgentsRes.value);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    try {
      const [orderRes, historyRes, sheetAgentsRes] = await Promise.allSettled([
        OrderService.fetchOrders(true),
        OrderService.fetchFollowupHistory(),
        OrderService.fetchAgentsFromSheet()
      ]);
      if (orderRes.status === 'fulfilled' && orderRes.value?.orders) {
        setOrders(orderRes.value.orders);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value) {
        setFollowupHistory(historyRes.value);
      }
      if (sheetAgentsRes.status === 'fulfilled' && sheetAgentsRes.value) {
        setAgents(sheetAgentsRes.value);
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateOrders = (newOrders: OrderItem[]) => {
    setOrders(newOrders);
    OrderService.saveLocalOrders(newOrders);
  };

  const handleUpdateAgents = (newAgents: AgentUser[]) => {
    setAgents(newAgents);
    OrderService.saveAgents(newAgents);
  };

  const handleUpdateFollowupHistory = (newHistory: FollowupHistoryItem[]) => {
    setFollowupHistory(newHistory);
    try {
      localStorage.setItem('agent_portal_followup_history_v3', JSON.stringify(newHistory));
    } catch {}
  };

  const handleUpdateOrderStatus = async (orderId: string, updates: Partial<OrderItem>, updatedBy?: string, notes = '') => {
    try {
      const defaultActor = currentManager ? formatActorUsernameId(currentManager.name || currentManager.user, currentManager.user) : 'manager_1';
      const effectiveUpdatedBy = (updatedBy && updatedBy.trim() !== '') ? formatActorUsernameId(updatedBy, updatedBy) : defaultActor;
      const res = await OrderService.updateOrderStatus(
        orderId,
        updates,
        effectiveUpdatedBy,
        notes || 'Order details updated'
      );
      if (res.updatedOrders && res.updatedOrders.length > 0) {
        setOrders(res.updatedOrders);
      } else {
        const updatedOrders = orders.map(o => {
          const oid = String(o.order_id || o.id);
          if (oid === String(orderId)) {
            return { ...o, ...updates };
          }
          return o;
        });
        handleUpdateOrders(updatedOrders);
      }
      const history = OrderService.getFollowupHistory();
      if (history) {
        setFollowupHistory(history);
      }
    } catch (e) {
      console.error('Error updating order status / sheet sync:', e);
      const updatedOrders = orders.map(o => {
        const oid = String(o.order_id || o.id);
        if (oid === String(orderId)) {
          return { ...o, ...updates };
        }
        return o;
      });
      handleUpdateOrders(updatedOrders);
    }
  };

  const handleRevertFollowup = async (historyId: string, orderId: string, previousStatus: string, undoneBy?: string) => {
    const defaultActor = currentManager ? formatActorUsernameId(currentManager.name || currentManager.user, currentManager.user) : 'manager_1';
    const actor = (undoneBy && undoneBy.trim() !== '') ? formatActorUsernameId(undoneBy, undoneBy) : defaultActor;
    await handleUpdateOrderStatus(orderId, { followup_status: previousStatus }, actor, `Reverted followup history #${historyId}`);
    const updatedHistory = followupHistory.map(h => {
      if (String(h.id) === String(historyId) || String(h.followupId) === String(historyId)) {
        return { ...h, isUndone: true };
      }
      return h;
    });
    handleUpdateFollowupHistory(updatedHistory);
  };

  if (!currentManager) {
    return (
      <AuthScreen
        agents={agents}
        onAgentLogin={(agent) => {
          setCurrentManager({
            user: agent.user,
            pass: agent.pass,
            name: agent.name,
            role: agent.role || 'Agent',
            permissions: agent.permissions,
            team: agent.team,
            teamLeaderId: agent.teamLeaderId,
            email: agent.email
          });
        }}
        onManagerLogin={(mgr) => {
          if (mgr.role === 'Manager' || mgr.user === '1' || mgr.user === 'Manager') {
            mgr.name = 'Manager';
            mgr.user = 'Manager';
          }
          setCurrentManager(mgr);
        }}
        onUpdateAgents={handleUpdateAgents}
      />
    );
  }

  return (
    <ManagerPortal
      currentManager={currentManager}
      agents={agents}
      users={agents as SystemUser[]}
      onUpdateAgents={handleUpdateAgents}
      onUpdateUsers={(users) => handleUpdateAgents(users as AgentUser[])}
      orders={orders}
      onUpdateOrders={handleUpdateOrders}
      followupHistory={followupHistory}
      onUpdateFollowupHistory={handleUpdateFollowupHistory}
      onRevertFollowup={handleRevertFollowup}
      onRefreshOrders={handleRefreshOrders}
      isRefreshing={isRefreshing}
      lastSyncTime={lastSyncTime}
      onLogout={() => setCurrentManager(null)}
      onUpdateOrderStatus={handleUpdateOrderStatus}
    />
  );
}

export default App;
