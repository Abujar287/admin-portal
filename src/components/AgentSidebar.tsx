import React from 'react';
import { AgentUser, AgentNavTab } from '../types';
import { User, Package, BarChart2, History, TrendingUp, LogOut, ChevronRight, MoreVertical, Layers } from 'lucide-react';

interface AgentSidebarProps {
  currentAgent: AgentUser;
  activeTab: AgentNavTab;
  setActiveTab: (tab: AgentNavTab) => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout: () => void;
  ordersCount: number;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  currentAgent,
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onLogout,
  ordersCount
}) => {
  // All 5 tabs from manager (excluding user details, category mapping, settings & export)
  const allNavItems: { id: AgentNavTab; label: string; icon: any; badge?: number }[] = [
    { id: 'summary', label: 'Summary', icon: BarChart2 },
    { id: 'orders', label: 'My Orders', icon: Package, badge: ordersCount },
    { id: 'agent-performance', label: 'Performance', icon: TrendingUp },
    { id: 'profiles', label: 'Profile', icon: User }
  ];

  const allowedTabs = currentAgent.permissions?.allowedTabs && Array.isArray(currentAgent.permissions.allowedTabs) && currentAgent.permissions.allowedTabs.length > 0
    ? currentAgent.permissions.allowedTabs.filter(t => t !== 'followup')
    : ['summary', 'orders', 'agent-performance', 'profiles'];

  const navItems = allNavItems.filter((item) => {
    return (
      allowedTabs.includes(item.id) ||
      (item.id === 'agent-performance' && allowedTabs.includes('dashboard')) ||
      (item.id === 'dashboard' && allowedTabs.includes('agent-performance'))
    );
  });

  return (
    <aside
      className={`h-screen bg-gradient-to-b from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] text-white flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-30 shadow-xl ${
        collapsed ? 'w-[72px] px-2.5 py-4' : 'w-[260px] px-4 py-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/15">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
            <Layers className="w-5 h-5 text-sky-300" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm tracking-tight text-white leading-tight truncate">
                {currentAgent.name || currentAgent.user}
              </h2>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/30">
                ID: @{currentAgent.user}
              </span>
            </div>
          )}
        </div>

        {/* 3-Dot Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation (Only 3 tabs, No Create Order) */}
      <nav className="flex-1 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'agent-performance' && activeTab === 'dashboard') ||
            (item.id === 'dashboard' && activeTab === 'agent-performance');
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all duration-300 ease-in-out transform cursor-pointer ${
                isActive
                  ? 'translate-x-3 bg-gradient-to-r from-white/30 via-white/20 to-white/10 text-white shadow-xl shadow-blue-950/50 font-extrabold border-l-4 border-l-sky-400 backdrop-blur-md justify-center scale-[1.03]'
                  : 'text-white/75 hover:text-white hover:bg-white/10 hover:translate-x-1 justify-start font-medium'
              } ${collapsed ? 'justify-center px-0 !translate-x-0 !scale-100' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isActive ? 'text-sky-300 scale-110' : 'text-white/70'}`} />
              {!collapsed && (
                <span className={`transition-all duration-300 ease-in-out truncate ${isActive ? 'text-center font-extrabold tracking-wide text-white scale-[1.03] flex-none w-full' : 'text-left flex-1'}`}>
                  {item.label}
                </span>
              )}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold border transition-all duration-300 ${isActive ? 'bg-sky-400 text-slate-900 border-white' : 'bg-sky-400/30 text-sky-200 border-sky-300/30'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Sign Out */}
      <div className="pt-3 border-t border-white/15">
        <button
          onClick={onLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 hover:text-red-100 transition-colors cursor-pointer ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
