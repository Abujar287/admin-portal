import React, { useState, useEffect, useCallback } from 'react';
import { ManagerUser, AgentUser, OrderItem, FollowupHistoryItem, SystemUser } from './types';
import { OrderService } from './services/orderService';
import { AuthScreen } from './components/AuthScreen';
import { ManagerPortal } from './components/ManagerPortal';

export function App() {
  const [currentManager, setCurrentManager] = useState<ManagerUser | null>(() => {
    try {
      const saved = localStorage.getItem('agent_portal_current_manager');
      if (saved) {
        return JSON.parse(saved);
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
    setIsRefreshing(true);
    try {
      const initialAgents = OrderService.getAgents();
      setAgents(initialAgents);

      const res = await OrderService.fetchOrders();
      if (res.orders && res.orders.length > 0) {
        setOrders(res.orders);
      }

      const history = await OrderService.fetchFollowupHistory();
      if (history && history.length > 0) {
        setFollowupHistory(history);
      }

      const sheetAgents = await OrderService.fetchAgentsFromSheet();
      if (sheetAgents && sheetAgents.length > 0) {
        setAgents(sheetAgents);
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
      const res = await OrderService.fetchOrders(true);
      if (res.orders) {
        setOrders(res.orders);
      }
      const history = await OrderService.fetchFollowupHistory();
      if (history) {
        setFollowupHistory(history);
      }
      const sheetAgents = await OrderService.fetchAgentsFromSheet();
      if (sheetAgents && sheetAgents.length > 0) {
        setAgents(sheetAgents);
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

  const handleUpdateOrderStatus = async (orderId: string, updates: Partial<OrderItem>, updatedBy = '1', notes = '') => {
    const updatedOrders = orders.map(o => {
      const oid = String(o.order_id || o.id);
      if (oid === String(orderId)) {
        return { ...o, ...updates };
      }
      return o;
    });
    handleUpdateOrders(updatedOrders);

    // Record in followup history if status changed
    const targetOrder = orders.find(o => String(o.order_id || o.id) === String(orderId));
    if (targetOrder) {
      const prevStatus = targetOrder.followup_status || targetOrder.followupStatus || 'Pending';
      const newStatus = updates.followup_status || updates.followupStatus || prevStatus;
      const orderSt = updates.order_status || updates.orderStatus || targetOrder.order_status || targetOrder.orderStatus || 'Pending';
      
      const newHistoryItem: FollowupHistoryItem = {
        id: String(Date.now()),
        followupId: OrderService.getMaxFollowupId(followupHistory) + 1,
        orderId: String(orderId),
        customerName: targetOrder.customer_name || targetOrder.customerName || '',
        customerContact: targetOrder.customer_mobile || targetOrder.customerContact || '',
        previousStatus: prevStatus,
        newStatus: newStatus,
        orderStatus: orderSt,
        orderValue: Number(targetOrder.order_value || targetOrder.orderValue || 0),
        scheduleDate: updates.schedule_date || updates.scheduleDate || targetOrder.schedule_date || targetOrder.scheduleDate || '',
        scheduledTime: updates.schedule_time || updates.scheduledTime || targetOrder.schedule_time || targetOrder.scheduledTime || '',
        updatedBy: updatedBy,
        updatedByName: currentManager?.name || 'Manager',
        timestamp: OrderService.getBdtTimestamp(),
        notes: notes || `Status updated to ${newStatus}`
      };

      const updatedHistory = [newHistoryItem, ...followupHistory];
      handleUpdateFollowupHistory(updatedHistory);
    }
  };

  const handleRevertFollowup = async (historyId: string, orderId: string, previousStatus: string) => {
    await handleUpdateOrderStatus(orderId, { followup_status: previousStatus }, '1', `Reverted followup history #${historyId}`);
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
