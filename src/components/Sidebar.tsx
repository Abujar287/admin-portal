import React from 'react';
import { AgentUser } from '../types';
import { 
  User, 
  PlusCircle, 
  Package, 
  BarChart3, 
  LogOut, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Layers
} from 'lucide-react';

interface SidebarProps {
  currentAgent: AgentUser;
  activeTab: 'profiles' | 'addOrder' | 'orders' | 'dashboard';
  setActiveTab: (tab: 'profiles' | 'addOrder' | 'orders' | 'dashboard') => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout: () => void;
  ordersCount: number;
}

interface NavItem {
  id: 'profiles' | 'addOrder' | 'orders' | 'dashboard';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentAgent,
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onLogout,
  ordersCount
}) => {
  const navItems: NavItem[] = [
    { id: 'profiles', label: 'Profile', icon: User },
    { id: 'addOrder', label: 'Create Order', icon: PlusCircle },
    { id: 'orders', label: 'My Orders', icon: Package, badge: ordersCount },
    { id: 'dashboard', label: 'Performance Dashboard', icon: BarChart3 }
  ];

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
              <h2 className="font-bold text-base tracking-tight text-white leading-tight truncate">
                Agent Portal
              </h2>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/30">
                {currentAgent.user}
              </span>
            </div>
          )}
        </div>

        {/* 3-Dot Toggle button matching user's original HTML */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/20 text-white shadow-xs font-semibold backdrop-blur-xs'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-300' : 'text-white/70'}`} />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-sky-400/30 text-sky-200 font-bold border border-sky-300/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
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
