import React, { useState, useEffect, useMemo } from 'react';
import { AgentUser, ManagerUser, OrderItem, FollowupHistoryItem } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Building2, 
  KeyRound, 
  Clock, 
  Lock, 
  BadgeCheck, 
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Package,
  AlertCircle,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface AgentProfileViewProps {
  currentAgent: AgentUser | ManagerUser;
  onUpdateAgentProfile: (updated: AgentUser | ManagerUser) => void;
  isManagerView?: boolean;
  allAgents?: AgentUser[];
  selectedUserId?: string;
  onSelectUserId?: (userId: string) => void;
  orders?: OrderItem[];
  followupHistory?: FollowupHistoryItem[];
  onViewOrderJourney?: (order: OrderItem) => void;
}

export const AgentProfileView: React.FC<AgentProfileViewProps> = ({
  currentAgent,
  onUpdateAgentProfile,
  orders = [],
  followupHistory = [],
  onViewOrderJourney
}) => {
  const [formData, setFormData] = useState<AgentUser | ManagerUser>({ ...currentAgent });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'performance'>('personal');

  // Keep form data in sync when target agent changes
  useEffect(() => {
    setFormData({ ...currentAgent });
  }, [currentAgent]);

  const handleChange = (field: keyof AgentUser, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let newPass = '';
    for (let i = 0; i < 10; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleChange('pass', newPass);
    setShowPassword(true);
    setSuccessMsg('Generated strong random password. Click Save to apply.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onUpdateAgentProfile(formData);
      setIsSaving(false);
      setSuccessMsg(`Manager profile for "${formData.name || formData.user}" saved successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 300);
  };

  // Avatar initials
  const initials = (formData.name || 'Manager')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'M';

  // Compute live manager statistics from orders
  // Required 5 Top Metrics: Total Orders | Delivered | Delivered Revinew | NR | Profit (NO Currency Symbol)
  const { agentStats, agentRecentOrders } = useMemo(() => {
    const userId = String(formData.user || '').trim().toLowerCase();
    const userName = String(formData.name || '').trim().toLowerCase();
    const isManagerRole = String(formData.role || '').toLowerCase().includes('manager') || String(formData.user) === '1';

    // Orders specific to this user or all orders for manager overview
    const personalMatched = orders.filter((o: any) => {
      const agentVal = String(o.agent_id || o.agentId || o.agentName || '').trim().toLowerCase();
      return agentVal === userId || agentVal === userName || agentVal.includes(`@${userId}`) || agentVal.includes(userName);
    });

    const targetOrders = (isManagerRole && personalMatched.length === 0) ? orders : (personalMatched.length > 0 ? personalMatched : orders);

    const totalOrders = targetOrders.length;
    const deliveredOrders = targetOrders.filter((o: any) => {
      const st = String(o.order_status || o.orderStatus || '').toLowerCase();
      const fs = String(o.followup_status || o.followupStatus || '').toLowerCase();
      return st === 'delivered' || st === 'complete' || st === 'completed' || fs === 'delivered';
    }).length;

    const cancelledOrders = targetOrders.filter((o: any) => {
      const st = String(o.order_status || o.orderStatus || '').toLowerCase();
      const fs = String(o.followup_status || o.followupStatus || '').toLowerCase();
      return st === 'cancelled' || st === 'canceled' || st === 'cancel' || fs === 'cancelled';
    }).length;

    const pendingOrders = Math.max(0, totalOrders - deliveredOrders - cancelledOrders);

    const totalValue = targetOrders.reduce((sum: number, o: any) => {
      return sum + Number(o.order_value || o.orderValue || 0);
    }, 0);

    const deliveredValue = targetOrders
      .filter((o: any) => {
        const st = String(o.order_status || o.orderStatus || '').toLowerCase();
        const fs = String(o.followup_status || o.followupStatus || '').toLowerCase();
        return st === 'delivered' || st === 'complete' || st === 'completed' || fs === 'delivered';
      })
      .reduce((sum: number, o: any) => sum + Number(o.order_value || o.orderValue || 0), 0);

    const profit = targetOrders.reduce((sum: number, o: any) => sum + Number(o.profit || 0), 0);

    const deliveryRatio = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // NR calculation: Net revenue/profit ratio (or Not-reached ratio)
    const nrRatio = deliveredValue > 0 
      ? Number(((profit / deliveredValue) * 100).toFixed(1)) 
      : (totalOrders > 0 ? Number((((totalOrders - deliveredOrders - cancelledOrders) / totalOrders) * 100).toFixed(1)) : 0);

    const recent = targetOrders.slice(0, 15);

    return {
      agentStats: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        pendingOrders,
        totalValue,
        deliveredValue,
        profit,
        deliveryRatio,
        nrRatio
      },
      agentRecentOrders: recent
    };
  }, [formData.user, formData.name, formData.role, orders]);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-600 hover:text-emerald-900 text-sm font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Profile Header Card: Manager ID Active & 5 Top Metrics */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Dark Cover Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Identity & Main Info */}
            <div className="flex items-start sm:items-center gap-5">
              {/* Monogram Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-200 font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-indigo-400/40 shadow-inner select-none backdrop-blur-xs">
                  {initials}
                </div>
                {/* Active Indicator */}
                <div 
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${
                    formData.status === 'deactivated' ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  title={formData.status === 'deactivated' ? 'Account Deactivated' : 'Account Active'}
                />
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    {formData.name || 'Manager'}
                  </h1>
                  
                  {/* Role Badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    {formData.role || 'Manager'}
                  </span>

                  {/* Active Status Badge */}
                  {formData.status === 'deactivated' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Deactivated
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-medium flex-wrap pt-1">
                  {/* Manager ID */}
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.user, 'user')}
                    className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-mono bg-white/10 px-2.5 py-1 rounded-lg text-emerald-300 border border-white/10"
                    title="Click to copy Manager ID"
                  >
                    <span className="font-bold">Manager ID: #{formData.user}</span>
                    {copiedField === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  <span className="text-slate-600">·</span>
                  <span className="flex items-center gap-1 text-slate-200">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    {formData.team || 'Manager Team'}
                  </span>

                  {formData.email && (
                    <>
                      <span className="text-slate-600">·</span>
                      <a href={`mailto:${formData.email}`} className="hover:text-white transition-colors flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {formData.email}
                      </a>
                    </>
                  )}

                  {formData.contact && (
                    <>
                      <span className="text-slate-600">·</span>
                      <a href={`tel:${formData.contact}`} className="hover:text-white transition-colors font-mono flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        {formData.contact}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  const creds = `Manager ID: ${formData.user}\nUsername: ${formData.user}\nPassword: ${formData.pass}\nRole: ${formData.role || 'Manager'}\nTeam: ${formData.team || 'Manager'}`;
                  handleCopy(creds, 'creds');
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Copy Full Credentials"
              >
                {copiedField === 'creds' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedField === 'creds' ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 5 Requested Profile Top Metrics (NO Currency Symbol): Total Orders | Delivered | Delivered Revenue | NR | Profit */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 border-t border-slate-100 bg-slate-50/50">
          <div className="p-4 border-r border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Orders</span>
            <span className="text-xl font-black text-slate-900 mt-1">{agentStats.totalOrders}</span>
          </div>
          <div className="p-4 border-r border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Delivered</span>
            <span className="text-xl font-black text-emerald-700 mt-1">{agentStats.deliveredOrders}</span>
            <span className="text-[9px] font-bold text-emerald-600">({agentStats.deliveryRatio}%)</span>
          </div>
          <div className="p-4 border-r border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Revenue</span>
            <span className="text-xl font-black text-indigo-700 mt-1">{agentStats.deliveredValue.toLocaleString()}</span>
          </div>
          <div className="p-4 border-r border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">NR Ratio</span>
            <span className="text-xl font-black text-purple-700 mt-1">{agentStats.nrRatio}%</span>
          </div>
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Profit</span>
            <span className="text-xl font-black text-emerald-600 mt-1">{agentStats.profit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs: Only 2 Tabs (Personal Information & Performance & Handled Orders) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl overflow-x-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex-1 min-w-[200px] px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'personal'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <User className="w-4 h-4 text-indigo-600" />
          <span>Personal Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`flex-1 min-w-[220px] px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'performance'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Performance &amp; Handled Orders</span>
        </button>
      </div>

      {/* Tab Contents Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: PERSONAL INFORMATION (Includes Username, Password, and Personal Details) */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Authentication & Credentials (Username & Password) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Account Credentials &amp; Login Information</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Authentication</span>
              </div>

              <div className="space-y-4">
                {/* Username / Manager ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Manager Username / Login ID</label>
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.user || '', 'user')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'user' ? 'Copied Username!' : 'Copy Username'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={formData.user || ''}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm font-bold font-mono rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed select-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Assigned permanent identifier</span>
                </div>

                {/* Password field with show/hide, copy, and generate password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Access Password</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Generate Secure Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.pass || ''}
                      onChange={e => handleChange('pass', e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.pass || '', 'pass')}
                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'pass' ? 'Copied Password!' : 'Copy Password to Clipboard'}</span>
                    </button>
                    <span className="text-slate-400 text-[11px]">Click Save to apply changes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Details & Contact Information */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Personal Profile &amp; Contact Details</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demographics</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Email Address</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleChange('email', e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                      placeholder="manager@portal.local"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.contact || ''}
                      onChange={e => handleChange('contact', e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                      placeholder="017xxxxxxxx"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Designation / Role Title</label>
                    <input
                      type="text"
                      value={formData.role || 'Manager'}
                      onChange={e => handleChange('role', e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                      placeholder="Manager"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Department / Team</label>
                    <input
                      type="text"
                      value={formData.team || 'Manager'}
                      onChange={e => handleChange('team', e.target.value)}
                      className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                      placeholder="Management"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={formData.gender || ''}
                      onChange={e => handleChange('gender', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900 cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Blood Group</label>
                    <select
                      value={formData.bloodGroup || ''}
                      onChange={e => handleChange('bloodGroup', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900 cursor-pointer"
                    >
                      <option value="">Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.birthday || ''}
                      onChange={e => handleChange('birthday', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential / Office Address</label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all bg-white text-slate-900 resize-none"
                    placeholder="House, Road, Area, City"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERFORMANCE & HANDLED ORDERS */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Handled Orders Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Recent Orders Handled &amp; Managed
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  {agentRecentOrders.length} Recent Orders
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="py-3 px-3.5">Order ID</th>
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5">Customer</th>
                      <th className="py-3 px-3.5">Phone</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5 text-right">Order Value</th>
                      <th className="py-3 px-3.5 text-right">Profit</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {agentRecentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                          No orders recorded yet.
                        </td>
                      </tr>
                    ) : (
                      agentRecentOrders.map((ord, idx) => (
                        <tr key={`profile-ord-${ord.order_id || ord.id || idx}-${idx}`} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                          <td className="py-3 px-3.5 font-bold font-mono text-indigo-700">
                            #{ord.order_id || ord.id}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-500 text-[11px]">
                            {ord.create_date || ord.createDate || '-'}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">
                            {ord.customer_name || ord.customerName || '-'}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600">
                            {ord.customer_mobile || ord.customerContact || '-'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              String(ord.order_status || ord.orderStatus).toLowerCase() === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : String(ord.order_status || ord.orderStatus).toLowerCase().includes('cancel')
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.order_status || ord.orderStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold font-mono text-slate-900">
                            {Number(ord.order_value || ord.orderValue || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold font-mono text-emerald-600">
                            {Number(ord.profit || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {onViewOrderJourney && (
                              <button
                                type="button"
                                onClick={() => onViewOrderJourney(ord)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-colors"
                              >
                                <span>Journey</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
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

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Profile credentials take immediate effect across the portal upon saving.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
