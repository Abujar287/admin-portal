import React, { useState, useEffect } from 'react';
import { ManagerUser, OrderItem, FollowupHistoryItem } from './types';
import { OrderService } from './services/orderService';
import { AuthScreen } from './components/AuthScreen';
import { ManagerPortal } from './components/ManagerPortal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentSession, setCurrentSession] = useState<{ role: 'manager'; manager: ManagerUser } | null>(null);

  // Orders State (synced from Google Sheet)
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [followupHistory, setFollowupHistory] = useState<FollowupHistoryItem[]>(() => OrderService.getFollowupHistory());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    OrderService.getLocalOrders().then(setOrders);
    OrderService.fetchAgentsFromSheet().catch(() => {});
  }, []);

  // Check saved session on mount
  useEffect(() => {
    const savedRole = sessionStorage.getItem('portal_session_role');
    const savedUser = sessionStorage.getItem('portal_session_user');
    const savedDataStr = sessionStorage.getItem('portal_session_data');

    if (savedRole === 'manager' && savedUser) {
      let restoredMgr: ManagerUser | null = null;
      if (savedDataStr) {
        try {
          restoredMgr = JSON.parse(savedDataStr);
        } catch (e) {
          console.error(e);
        }
      }
      if (!restoredMgr) {
        const localAgents = OrderService.getAgents();
        const matched = localAgents.find(a => a.user.toLowerCase() === savedUser.toLowerCase());
        restoredMgr = {
          user: savedUser,
          pass: '',
          name: matched?.name || (savedUser === '1' ? 'Super Admin' : `User ${savedUser}`),
          role: matched?.role || (savedUser === '1' ? 'Superadmin' : 'Manager'),
          permissions: matched?.permissions,
          team: matched?.team,
          teamLeaderId: matched?.teamLeaderId,
          teamLeaders: matched?.teamLeaders
        };
      }
      setCurrentSession({
        role: 'manager',
        manager: restoredMgr
      });
    }
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadOrdersData(false);
    }
  }, [currentSession]);

  const loadOrdersData = async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const [res, followupHist] = await Promise.all([
        OrderService.fetchOrders(forceRefresh),
        OrderService.fetchFollowupHistory()
      ]);
      if (res.orders && res.orders.length > 0) {
        setOrders(res.orders);
      }
      if (followupHist && followupHist.length > 0) {
        setFollowupHistory(followupHist);
      }
      if (forceRefresh) {
        showToast(`Synced ${res.orders.length} orders & ${followupHist.length} followups!`);
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

  const handleLogin = (user: any) => {
    const mgrUser: ManagerUser = {
      user: user.user || '1',
      pass: user.pass || '',
      name: user.name || (user.user === '1' ? 'Super Admin' : `User ${user.user}`),
      role: user.role || (user.user === '1' ? 'Superadmin' : 'Manager'),
      permissions: user.permissions,
      team: user.team,
      teamLeaderId: user.teamLeaderId,
      teamLeaders: user.teamLeaders,
      email: user.email
    };
    setCurrentSession({ role: 'manager', manager: mgrUser });
    sessionStorage.setItem('portal_session_role', 'manager');
    sessionStorage.setItem('portal_session_user', mgrUser.user);
    sessionStorage.setItem('portal_session_data', JSON.stringify(mgrUser));
    showToast(`Welcome, ${mgrUser.name}!`);
  };

  const handleUpdateOrderStatus = async (orderId: string, updates: Partial<OrderItem>, updatedBy?: string, notes?: string) => {
    const updatedOrders = orders.map(o => {
      if (String(o.order_id || o.id) === String(orderId)) {
        return { ...o, ...updates };
      }
      return o;
    });
    setOrders(updatedOrders);
    OrderService.saveLocalOrders(updatedOrders);

    const targetOrder = orders.find(o => String(o.order_id || o.id) === String(orderId));
    const newHistoryItem: FollowupHistoryItem = {
      id: String(Date.now()),
      followupId: Date.now(),
      orderId: orderId,
      customerName: updates.customer_name || targetOrder?.customer_name || targetOrder?.customerName || '',
      customerContact: updates.customer_mobile || targetOrder?.customer_mobile || targetOrder?.customerContact || '',
      previousStatus: targetOrder?.followup_status || targetOrder?.followupStatus || 'Pending',
      newStatus: updates.followup_status || updates.followupStatus || 'Pending',
      orderStatus: updates.order_status || updates.orderStatus || targetOrder?.order_status || targetOrder?.orderStatus || 'Pending',
      orderValue: updates.order_value ?? updates.orderValue ?? targetOrder?.order_value ?? targetOrder?.orderValue ?? 0,
      scheduleDate: updates.schedule_date || updates.scheduleDate || targetOrder?.schedule_date || targetOrder?.scheduleDate || '',
      scheduledTime: updates.schedule_time || updates.scheduledTime || targetOrder?.schedule_time || targetOrder?.scheduledTime || '',
      updatedBy: updatedBy || currentSession?.manager?.user || 'Manager',
      updatedByName: currentSession?.manager?.name || 'Manager',
      action: notes || `Followup updated to ${updates.followup_status || updates.followupStatus || 'Pending'}`,
      timestamp: OrderService.getBdtTimestamp()
    };
    const updatedHistory = [newHistoryItem, ...followupHistory];
    setFollowupHistory(updatedHistory);
    OrderService.saveFollowupHistory(updatedHistory);

    try {
      await OrderService.updateOrderInSheet(orderId, updates, updatedBy, notes);
    } catch (e) {
      console.warn('Sheet sync update failed:', e);
    }
  };

  const handleLogout = () => {
    setCurrentSession(null);
    sessionStorage.removeItem('portal_session_role');
    sessionStorage.removeItem('portal_session_user');
    sessionStorage.removeItem('portal_session_data');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {!currentSession && (
        <AuthScreen
          agents={OrderService.getAgents()}
          onAgentLogin={handleLogin}
          onManagerLogin={handleLogin}
          onUpdateAgents={() => {}}
        />
      )}

      {currentSession?.role === 'manager' && (
        <ManagerPortal
          currentManager={currentSession.manager}
          agents={OrderService.getAgents()}
          onUpdateAgents={(agents) => OrderService.saveAgents(agents)}
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
          onRefreshOrders={() => loadOrdersData(true)}
          isRefreshing={isRefreshing}
          onLogout={handleLogout}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      )}
    </div>
  );
}
