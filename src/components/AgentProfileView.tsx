import React, { useState, useEffect } from 'react';
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
  KeyRound, 
  Clock, 
  Lock, 
  BadgeCheck, 
  Briefcase,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Heart
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
  onUpdateAgentProfile
}) => {
  const [formData, setFormData] = useState<AgentUser | ManagerUser>({ ...currentAgent });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    setSuccessMsg('Generated strong random password. Click "Save Profile" to apply.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleReset = () => {
    setFormData({ ...currentAgent });
    setSuccessMsg('Reset form to original saved values.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onUpdateAgentProfile(formData);
      setIsSaving(false);
      setSuccessMsg(`Profile for "${formData.name || formData.user}" saved successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 250);
  };

  // Avatar monogram
  const initials = (formData.name || 'Manager')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'M';

  const roleText = formData.role || 'Manager';
  const teamText = formData.team || 'Management';
  const statusActive = formData.status !== 'deactivated';

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Toast Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg shadow-emerald-950/20 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-400 hover:text-emerald-200 text-sm font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Profile Header Hero Card — Midnight Navy theme matching the portal */}
      <div className="bg-[#111C3D] rounded-3xl border border-[#1E2C58] shadow-xl overflow-hidden relative">
        {/* Ambient background glow matching dashboard highlights */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Main Info */}
          <div className="flex items-start sm:items-center gap-5">
            {/* Monogram Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-600/25 via-indigo-600/20 to-purple-600/25 text-blue-200 font-extrabold text-2xl sm:text-3xl flex items-center justify-center border-2 border-blue-500/40 shadow-inner select-none backdrop-blur-md">
                {initials}
              </div>
              {/* Online / Active Indicator */}
              <div 
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#111C3D] ${
                  statusActive ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'
                }`}
                title={statusActive ? 'Account Active' : 'Account Deactivated'}
              />
            </div>

            {/* Title & Metadata */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-extrabold text-[#E2E8F0] tracking-tight">
                  {formData.name || 'Manager'}
                </h1>
                
                {/* Role Badge */}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{roleText}</span>
                </span>

                {/* Team Badge */}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-2xs">
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                  <span>{teamText}</span>
                </span>

                {/* Active Status Badge */}
                {statusActive ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Deactivated</span>
                  </span>
                )}
              </div>

              {/* Sub-info chips */}
              <div className="flex items-center gap-3 text-xs text-[#94A3B8] font-medium flex-wrap pt-0.5">
                {/* User ID chip */}
                <button
                  type="button"
                  onClick={() => handleCopy(String(formData.user || ''), 'user')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-mono bg-[#080E21] px-3 py-1 rounded-lg text-blue-300 border border-[#1E2C58]"
                  title="Click to copy User ID"
                >
                  <span className="font-bold">ID: #{formData.user}</span>
                  {copiedField === 'user' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {formData.email && (
                  <>
                    <span className="text-[#2D3E72]">·</span>
                    <a href={`mailto:${formData.email}`} className="hover:text-blue-300 transition-colors flex items-center gap-1.5 text-[#94A3B8]">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>{formData.email}</span>
                    </a>
                  </>
                )}

                {formData.contact && (
                  <>
                    <span className="text-[#2D3E72]">·</span>
                    <a href={`tel:${formData.contact}`} className="hover:text-emerald-300 transition-colors font-mono flex items-center gap-1.5 text-[#94A3B8]">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{formData.contact}</span>
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
                const creds = `User ID: ${formData.user}\nUsername: ${formData.user}\nPassword: ${formData.pass}\nRole: ${formData.role || 'Manager'}\nTeam: ${formData.team || 'Manager'}`;
                handleCopy(creds, 'creds');
              }}
              className="px-3.5 py-2.5 rounded-xl border border-[#1E2C58] bg-[#080E21] hover:bg-[#16234D] text-[#E2E8F0] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              title="Copy Full Credentials"
            >
              {copiedField === 'creds' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{copiedField === 'creds' ? 'Copied!' : 'Copy Credentials'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Account Settings Form Grid */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Account Credentials & Security */}
          <div className="bg-[#111C3D] rounded-3xl p-6 sm:p-7 border border-[#1E2C58] shadow-xl space-y-6">
            <div className="border-b border-[#1E2C58] pb-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#E2E8F0] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span>Account Credentials &amp; Security</span>
              </h3>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Authentication
              </span>
            </div>

            <div className="space-y-5">
              {/* Username / Login ID */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#E2E8F0]">
                    Username / Login ID
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(formData.user || ''), 'user')}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedField === 'user' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'user' ? 'Copied ID!' : 'Copy ID'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={formData.user || ''}
                    className="w-full px-4 py-3 text-xs sm:text-sm font-bold font-mono rounded-xl border border-[#1E2C58] bg-[#060A18] text-blue-300 cursor-not-allowed select-none"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
                    <Lock className="w-3 h-3 text-[#64748B]" />
                    <span>Permanent</span>
                  </div>
                </div>
                <span className="text-[11px] text-[#64748B] mt-1.5 block">
                  Unique system login identifier, cannot be modified directly.
                </span>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#E2E8F0]">
                    Access Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.pass || ''}
                    onChange={e => handleChange('pass', e.target.value)}
                    className="w-full pl-4 pr-11 py-3 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all"
                    placeholder="Enter account password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E2E8F0] cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopy(formData.pass || '', 'pass')}
                    className="font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedField === 'pass' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'pass' ? 'Copied Password!' : 'Copy Password'}</span>
                  </button>
                  <span className="text-[#64748B] text-[11px]">Save changes to apply</span>
                </div>
              </div>

              {/* Role & Permissions Info Box */}
              <div className="p-4 rounded-2xl bg-[#080E21] border border-[#1E2C58] space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Security &amp; Permissions Overview
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#111C3D] border border-[#1E2C58]">
                    <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Assigned Role</span>
                    <span className="font-extrabold text-blue-300 mt-0.5 block">{roleText}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#111C3D] border border-[#1E2C58]">
                    <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Account Team</span>
                    <span className="font-extrabold text-purple-300 mt-0.5 block">{teamText}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Personal Profile & Contact Information */}
          <div className="bg-[#111C3D] rounded-3xl p-6 sm:p-7 border border-[#1E2C58] shadow-xl space-y-6">
            <div className="border-b border-[#1E2C58] pb-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#E2E8F0] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <span>Personal Profile &amp; Contact Details</span>
              </h3>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Demographics
              </span>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#E2E8F0] mb-2">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all"
                  placeholder="Enter full name"
                />
              </div>

              {/* Email & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2">
                    Official Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all"
                      placeholder="user@portal.com"
                    />
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.contact || ''}
                      onChange={e => handleChange('contact', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold font-mono rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all"
                      placeholder="017xxxxxxxx"
                    />
                    <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2">
                    Designation / Role Title
                  </label>
                  <input
                    type="text"
                    value={formData.role || 'Manager'}
                    onChange={e => handleChange('role', e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all"
                    placeholder="Manager"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2">
                    Department / Team
                  </label>
                  <input
                    type="text"
                    value={formData.team || 'Manager'}
                    onChange={e => handleChange('team', e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all"
                    placeholder="Management"
                  />
                </div>
              </div>

              {/* Gender, Blood Group, Birthday */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2">Gender</label>
                  <select
                    value={formData.gender || ''}
                    onChange={e => handleChange('gender', e.target.value)}
                    className="w-full px-3.5 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] focus:border-blue-500 focus:outline-hidden transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#080E21] text-[#94A3B8]">Select Gender</option>
                    <option value="Male" className="bg-[#080E21] text-[#E2E8F0]">Male</option>
                    <option value="Female" className="bg-[#080E21] text-[#E2E8F0]">Female</option>
                    <option value="Other" className="bg-[#080E21] text-[#E2E8F0]">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" />
                    <span>Blood Group</span>
                  </label>
                  <select
                    value={formData.bloodGroup || ''}
                    onChange={e => handleChange('bloodGroup', e.target.value)}
                    className="w-full px-3.5 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] focus:border-blue-500 focus:outline-hidden transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#080E21] text-[#94A3B8]">Select Blood</option>
                    <option value="A+" className="bg-[#080E21] text-[#E2E8F0]">A+</option>
                    <option value="A-" className="bg-[#080E21] text-[#E2E8F0]">A-</option>
                    <option value="B+" className="bg-[#080E21] text-[#E2E8F0]">B+</option>
                    <option value="B-" className="bg-[#080E21] text-[#E2E8F0]">B-</option>
                    <option value="O+" className="bg-[#080E21] text-[#E2E8F0]">O+</option>
                    <option value="O-" className="bg-[#080E21] text-[#E2E8F0]">O-</option>
                    <option value="AB+" className="bg-[#080E21] text-[#E2E8F0]">AB+</option>
                    <option value="AB-" className="bg-[#080E21] text-[#E2E8F0]">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E2E8F0] mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-400" />
                    <span>Date of Birth</span>
                  </label>
                  <input
                    type="date"
                    value={formData.birthday || ''}
                    onChange={e => handleChange('birthday', e.target.value)}
                    className="w-full px-3 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] focus:border-blue-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-[#E2E8F0] mb-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>Residential / Office Address</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.address || ''}
                  onChange={e => handleChange('address', e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm font-semibold rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] focus:border-blue-500 focus:outline-hidden transition-all resize-none"
                  placeholder="House, Road, Area, City"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Floating Save Action Bar */}
        <div className="sticky bottom-4 z-30 bg-[#111C3D]/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#1E2C58] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-[#94A3B8] font-medium">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Updated profile and credentials sync across your active session upon saving.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="w-1/2 sm:w-auto px-5 py-2.5 rounded-xl border border-[#1E2C58] bg-[#080E21] hover:bg-[#16234D] text-[#94A3B8] hover:text-[#E2E8F0] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="w-1/2 sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
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
