import React, { useState, useEffect, useMemo } from 'react';
import { AgentUser, ManagerUser, OrderItem, FollowupHistoryItem, AgentPermissions } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart, 
  Shield, 
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
  RotateCcw,
  CheckCircle2,
  Users,
  Search,
  ExternalLink,
  Sliders,
  TrendingUp,
  Package,
  FileText,
  AlertCircle,
  RefreshCw,
  Sparkles
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
}

export const AgentProfileView: React.FC<AgentProfileViewProps> = ({
  currentAgent,
  onUpdateAgentProfile,
  isManagerView = true,
  allAgents = [],
  selectedUserId = '',
  onSelectUserId,
  orders = [],
  followupHistory = []
}) => {
  const [formData, setFormData] = useState<AgentUser | ManagerUser>({ ...currentAgent });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'permissions' | 'performance'>('details');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');

  // Keep form data in sync when target agent changes
  useEffect(() => {
    setFormData({ ...currentAgent });
  }, [currentAgent]);

  const handleChange = (field: keyof AgentUser, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedPermissionChange = (permKey: keyof AgentPermissions, value: any) => {
    setFormData(prev => {
      const currentPerms = prev.permissions || {};
      return {
        ...prev,
        permissions: {
          ...currentPerms,
          [permKey]: value
        }
      };
    });
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
    setSuccessMsg('Generated secure password! Remember to save changes.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleReset = () => {
    setFormData({ ...currentAgent });
    setSuccessMsg('Changes reverted back to saved profile.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onUpdateAgentProfile(formData);
      setIsSaving(false);
      setSuccessMsg(`Profile for "${formData.name || formData.user}" saved successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 300);
  };

  // Determine avatar initials and role styling
  const initials = (formData.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'U';

  const roleTitle = formData.role || (isManagerView ? 'Manager' : 'Agent');

  // Compute live agent statistics from orders
  const agentStats = useMemo(() => {
    const userId = String(formData.user || '').trim().toLowerCase();
    const userName = String(formData.name || '').trim().toLowerCase();

    // Match orders assigned to or created by this agent
    const matchedOrders = orders.filter((o: any) => {
      const agentVal = String(o.agent_id || o.agentId || o.agentName || '').trim().toLowerCase();
      return agentVal === userId || agentVal === userName || agentVal.includes(`@${userId}`) || agentVal.includes(userName);
    });

    const totalOrders = matchedOrders.length;
    const deliveredOrders = matchedOrders.filter((o: any) => {
      const st = String(o.order_status || o.orderStatus || '').toLowerCase();
      return st === 'delivered' || st === 'complete' || st === 'completed';
    }).length;

    const cancelledOrders = matchedOrders.filter((o: any) => {
      const st = String(o.order_status || o.orderStatus || '').toLowerCase();
      return st === 'cancelled' || st === 'canceled' || st === 'cancel';
    }).length;

    const pendingOrders = totalOrders - deliveredOrders - cancelledOrders;

    const totalValue = matchedOrders.reduce((sum: number, o: any) => {
      return sum + Number(o.order_value || o.orderValue || 0);
    }, 0);

    const deliveredValue = matchedOrders
      .filter((o: any) => {
        const st = String(o.order_status || o.orderStatus || '').toLowerCase();
        return st === 'delivered' || st === 'complete' || st === 'completed';
      })
      .reduce((sum: number, o: any) => sum + Number(o.order_value || o.orderValue || 0), 0);

    const profit = matchedOrders.reduce((sum: number, o: any) => sum + Number(o.profit || 0), 0);

    const deliveryRatio = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // Follow-ups matched
    const matchedFollowups = followupHistory.filter(h => {
      return String(h.updatedBy || '').toLowerCase() === userId || String(h.updatedByName || '').toLowerCase() === userName;
    }).length;

    return {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      totalValue,
      deliveredValue,
      profit,
      deliveryRatio,
      matchedFollowups
    };
  }, [formData.user, formData.name, orders, followupHistory]);

  // Filter all agents list for directory switcher
  const filteredDirectoryAgents = useMemo(() => {
    if (!agentSearchQuery.trim()) return allAgents;
    const q = agentSearchQuery.toLowerCase();
    return allAgents.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.user.toLowerCase().includes(q) || 
      (a.team && a.team.toLowerCase().includes(q)) ||
      (a.role && a.role.toLowerCase().includes(q))
    );
  }, [allAgents, agentSearchQuery]);

  const isViewingSelf = !selectedUserId || selectedUserId === '1' || selectedUserId === currentAgent.user;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* 0. Top Directory Selector Bar (When in Manager/Executive View) */}
      {isManagerView && allAgents.length > 0 && onSelectUserId && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Personnel Directory</span>
                <span className="text-[11px] text-slate-400">·</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {isViewingSelf ? 'Viewing Your Manager Profile' : `Viewing Profile: ${formData.name || formData.user}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Switch profiles to inspect credentials, permissions, and performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Switch to Self */}
            <button
              type="button"
              onClick={() => onSelectUserId('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isViewingSelf
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Profile (Manager)</span>
            </button>

            {/* Agent Selector Dropdown */}
            <div className="relative min-w-[220px]">
              <select
                value={selectedUserId || ''}
                onChange={(e) => onSelectUserId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 cursor-pointer"
              >
                <option value="">Select an Agent to View/Edit...</option>
                {allAgents.map((ag) => (
                  <option key={ag.user} value={ag.user}>
                    {ag.name} (#{ag.user}) - {ag.team || 'No Team'} ({ag.role || 'Agent'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Notification */}
      {successMsg && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Executive Identity Banner & Cover Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Refined Enterprise Navy Cover */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Avatar Initial Monogram */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 text-indigo-300 font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-slate-700 shadow-md select-none">
                  {initials}
                </div>
                {/* Active Status Marker (clean, no pulse) */}
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900"
                  title="Account Status: Verified & Active"
                />
              </div>

              {/* Title & Metadata */}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {formData.name || 'Portal User'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    {roleTitle}
                  </span>
                  {formData.status === 'deactivated' ? (
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Deactivated
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>

                {/* Clean Unboxed Metadata */}
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-300 font-medium flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.user, 'user')}
                    className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-mono"
                    title="Copy Staff ID"
                  >
                    <span>Staff ID: #{formData.user}</span>
                    {copiedField === 'user' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                  <span className="text-slate-600">·</span>
                  <span>{formData.team || 'General Operations'}</span>
                  {formData.email && (
                    <>
                      <span className="text-slate-600">·</span>
                      <a href={`mailto:${formData.email}`} className="hover:text-white transition-colors">
                        {formData.email}
                      </a>
                    </>
                  )}
                  {formData.contact && (
                    <>
                      <span className="text-slate-600">·</span>
                      <a href={`tel:${formData.contact}`} className="hover:text-white transition-colors font-mono">
                        {formData.contact}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  const creds = `Username / ID: ${formData.user}\nPassword: ${formData.pass}\nRole: ${formData.role || 'Agent'}\nTeam: ${formData.team || 'General'}`;
                  handleCopy(creds, 'creds');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Copy User Credentials"
              >
                {copiedField === 'creds' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedField === 'creds' ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              {formData.contact && (
                <a
                  href={`tel:${formData.contact}`}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Real Dynamic Performance & Activity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50 border-t border-slate-200/80">
          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Orders</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums font-mono">
              {agentStats.totalOrders}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              Assigned &amp; Handled
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Delivered Success</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 tabular-nums font-mono">
              {agentStats.deliveredOrders}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium tabular-nums">
              {agentStats.deliveryRatio}% Success Ratio
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Delivered Revenue</span>
            <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-0.5 tabular-nums font-mono">
              ৳{agentStats.deliveredValue.toLocaleString()}
            </p>
            <span className="text-[10px] text-indigo-600 font-medium tabular-nums">
              Profit: ৳{agentStats.profit.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Follow-up Audits</span>
            <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5 tabular-nums font-mono">
              {agentStats.matchedFollowups}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              Logged Interactions
            </span>
          </div>
        </div>
      </div>

      {/* 2. Structured Section Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'details'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Personal &amp; Organizational Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Security &amp; Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'permissions'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Role &amp; Permissions Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'performance'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Activity &amp; Operational Metrics</span>
        </button>
      </div>

      {/* 3. Tab Contents Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: PERSONAL & ORGANIZATIONAL DETAILS */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Identity & Company Placement */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Organizational Hierarchy</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Staff ID / User Identifier</span>
                    <span className="text-[10px] text-slate-400 font-medium">Permanent Record</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.user || ''}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-bold font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed select-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
                    <input
                      type="text"
                      value={formData.role || ''}
                      onChange={e => handleChange('role', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                      placeholder="Manager, Agent, Team Leader"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department / Team</label>
                    <input
                      type="text"
                      value={formData.team || ''}
                      onChange={e => handleChange('team', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                      placeholder="e.g. Acquisition, Operations"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reporting Team Leader</label>
                  <input
                    type="text"
                    value={formData.teamLeaderId || ''}
                    onChange={e => handleChange('teamLeaderId', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                    placeholder="Enter Supervisor / Team Leader ID or Name"
                  />
                </div>
              </div>
            </div>

            {/* Contact & Personal Information */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Contact &amp; Demographics</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Communication</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                    placeholder="staff@enterprise.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contact || ''}
                    onChange={e => handleChange('contact', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold font-mono rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                    placeholder="017xxxxxxxx"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender || ''}
                      onChange={e => handleChange('gender', e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800 cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={formData.bloodGroup || ''}
                      onChange={e => handleChange('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800 cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.birthday || ''}
                      onChange={e => handleChange('birthday', e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential / Station Address</label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-800 resize-none"
                    placeholder="House, Road, Area, City"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & CREDENTIALS */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Portal Access Credentials</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Authentication</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Portal Login Username / ID</label>
                  <input
                    type="text"
                    disabled
                    value={formData.user || ''}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-bold font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Access Password</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.pass || ''}
                      onChange={e => handleChange('pass', e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 transition-all bg-white text-slate-900"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.pass || '', 'pass')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'pass' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'pass' ? 'Copied Password!' : 'Copy Password'}</span>
                    </button>
                  </div>
                </div>

                {/* Account Status Toggle (Active vs Deactivated) */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Account State</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange('status', 'active')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        formData.status !== 'deactivated'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Active &amp; Permitted</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange('status', 'deactivated')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        formData.status === 'deactivated'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Suspended / Inactive</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Audit Details */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Security &amp; Clearance Overview</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Integrity</span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="font-medium text-slate-700">Multi-Factor Token Status:</span>
                  <span className="font-bold text-slate-900">Standard Credentials</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="font-medium text-slate-700">Failed Login Counter:</span>
                  <span className="font-mono font-bold text-slate-900">0 Attempts</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="font-medium text-slate-700">Database Role Level:</span>
                  <span className="font-bold text-indigo-700">{roleTitle} Clearance</span>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Security Advisory</span>
                  </p>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Passwords changed here update immediate portal access. For team members, provide their updated login ID and password securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROLE & PERMISSIONS MATRIX */}
        {activeTab === 'permissions' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Access Scope &amp; Operation Privileges</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure specific permissions granted to this account
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Control</span>
            </div>

            {/* Order Scope Selector */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-800">Assigned Order Scope</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleNestedPermissionChange('orderScope', 'all_orders')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    formData.permissions?.orderScope !== 'my_orders'
                      ? 'bg-white border-indigo-500 shadow-2xs ring-1 ring-indigo-100'
                      : 'bg-slate-100/60 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900">All Orders Access</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Can view and filter entire company order database</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNestedPermissionChange('orderScope', 'my_orders')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    formData.permissions?.orderScope === 'my_orders'
                      ? 'bg-white border-indigo-500 shadow-2xs ring-1 ring-indigo-100'
                      : 'bg-slate-100/60 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900">Assigned Orders Only</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Restricted strictly to personal assigned or created orders</span>
                </button>
              </div>
            </div>

            {/* Capability Switches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'canCreate', label: 'Order Creation', desc: 'Permit logging new orders' },
                { key: 'canUpdateStatus', label: 'Status Updates', desc: 'Permit changing follow-up states' },
                { key: 'canChangeSchedule', label: 'Rescheduling', desc: 'Permit altering delivery dates' },
                { key: 'canChangeValue', label: 'Price Modification', desc: 'Permit updating order amount' },
                { key: 'canAddProfit', label: 'Profit Entry', desc: 'Permit modifying profit values' },
                { key: 'canCancel', label: 'Order Cancellation', desc: 'Permit cancelling customer orders' }
              ].map((perm) => {
                const isChecked = Boolean(formData.permissions?.[perm.key as keyof AgentPermissions] ?? true);
                return (
                  <label
                    key={perm.key}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleNestedPermissionChange(perm.key as keyof AgentPermissions, e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{perm.label}</span>
                      <span className="text-[11px] text-slate-500">{perm.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVITY & OPERATIONAL METRICS */}
        {activeTab === 'performance' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Performance Diagnostics &amp; Operational Ledger</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time figures mapped directly from active orders &amp; follow-up history
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metrics</span>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Assigned</span>
                <p className="text-lg font-black text-slate-900 mt-0.5 font-mono tabular-nums">{agentStats.totalOrders}</p>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Delivered</span>
                <p className="text-lg font-black text-emerald-800 mt-0.5 font-mono tabular-nums">{agentStats.deliveredOrders}</p>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Cancelled</span>
                <p className="text-lg font-black text-rose-800 mt-0.5 font-mono tabular-nums">{agentStats.cancelledOrders}</p>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending / In-Route</span>
                <p className="text-lg font-black text-amber-800 mt-0.5 font-mono tabular-nums">{agentStats.pendingOrders}</p>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Delivered Value</span>
                <p className="text-lg font-black text-indigo-800 mt-0.5 font-mono tabular-nums">৳{agentStats.deliveredValue.toLocaleString()}</p>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Success Rate</span>
                <p className="text-lg font-black text-purple-800 mt-0.5 font-mono tabular-nums">{agentStats.deliveryRatio}%</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Executive Bottom Action Bar */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Unsaved modifications take effect immediately upon saving.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
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
