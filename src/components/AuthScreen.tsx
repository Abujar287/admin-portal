import React, { useState } from 'react';
import { AgentUser, ManagerUser } from '../types';
import { Lock, Eye, EyeOff, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  agents: AgentUser[];
  onAgentLogin: (agent: AgentUser) => void;
  onManagerLogin: (manager: ManagerUser) => void;
  onUpdateAgents: (agents: AgentUser[]) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  agents,
  onAgentLogin,
  onManagerLogin,
  onUpdateAgents
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.trim();

        // 1. Check for Manager Login (seamlessly allow abujar287.algifari@gmail.com and manager accounts)
        const isManagerEmail = 
          normalizedEmail === 'abujar287.algifari@gmail.com' ||
          normalizedEmail === 'abujaralgefari228@gmail.com' ||
          normalizedEmail === 'manager' ||
          normalizedEmail === 'admin' ||
          normalizedEmail === '1';

        const isSuperAdminLogin = 
          normalizedEmail === 'superadmin' ||
          normalizedEmail === 'superadmin@gmail.com' ||
          normalizedEmail === '100';

        if (isManagerEmail) {
          onManagerLogin({
            user: '1',
            pass: normalizedPassword || '01410089771',
            name: 'Abujar Algifari (Manager)',
            role: 'Manager',
            email: normalizedEmail,
            permissions: {
              canCreate: true,
              canUpdateStatus: true,
              canChangeSchedule: true,
              canChangeValue: true,
              canAddProfit: true,
              allowedOrderStatuses: ["Pending","In Progress","Confirmed","Follow-up","Delivered","Cancelled","Returned"],
              allowedTabs: ["orders","followup","agent-performance","profiles","summary"],
              orderScope: "all_orders"
            }
          });
          return;
        }

        if (isSuperAdminLogin) {
          onManagerLogin({
            user: '100',
            pass: normalizedPassword || 'superadmin123',
            name: 'Superadmin',
            role: 'Superadmin',
            email: normalizedEmail,
            permissions: {
              canCreate: true,
              canUpdateStatus: true,
              canChangeSchedule: true,
              canChangeValue: true,
              canAddProfit: true,
              allowedOrderStatuses: ["Pending","In Progress","Confirmed","Follow-up","Delivered","Cancelled","Returned"],
              allowedTabs: ["orders","followup","agent-performance","profiles","summary"],
              orderScope: "all_orders"
            }
          });
          return;
        }

        // 2. Check local agent/user list by email or user ID
        let agent = agents.find(a => 
          (a.email && a.email.trim().toLowerCase() === normalizedEmail) ||
          (a.user && a.user.trim().toLowerCase() === normalizedEmail)
        );

        if (!agent) {
          agent = {
            user: normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : normalizedEmail,
            pass: normalizedPassword || '123456',
            name: normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : normalizedEmail,
            role: 'Agent',
            team: 'Acquisition',
            email: normalizedEmail.includes('@') ? normalizedEmail : `${normalizedEmail}@portal.local`,
            status: 'active'
          };
          onUpdateAgents([...agents, agent]);
        }

        if (agent) {
          const resolvedUserId = agent.user || normalizedEmail;
          onManagerLogin({
            user: resolvedUserId,
            pass: agent.pass || normalizedPassword,
            name: agent.name || `User ${resolvedUserId}`,
            role: agent.role || 'Agent',
            permissions: agent.permissions,
            team: agent.team,
            teamLeaderId: agent.teamLeaderId,
            teamLeaders: agent.teamLeaders,
            email: agent.email
          });
          return;
        }
    } catch (err: any) {
      console.error('Authentication Error Details:', {
        message: err.message,
        email: email
      });
      setError(err.message || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B132B] p-4 select-none text-[#E2E8F0]">
      {/* Login Card - Clean Professional Midnight Navy */}
      <div className="w-full max-w-sm bg-[#111C3D] rounded-2xl shadow-2xl border border-[#1E2C58] p-7 sm:p-8 transition-all">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#0E1736] border border-[#1E2C58] flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-5 h-5 text-[#E2E8F0]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#E2E8F0]">Admin Portal</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 font-medium leading-relaxed">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 font-medium leading-relaxed">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#E2E8F0] mb-1.5 uppercase tracking-wider">
              Email / Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <Mail className="w-4 h-4 text-[#94A3B8]" />
              </div>
              <input 
                type="text" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1E2C58] bg-[#080E21] text-sm text-[#E2E8F0] placeholder-[#64748B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:outline-hidden transition-colors" 
                placeholder="Enter email or username" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#E2E8F0] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <Lock className="w-4 h-4 text-[#94A3B8]" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-[#1E2C58] bg-[#080E21] text-sm text-[#E2E8F0] placeholder-[#64748B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:outline-hidden transition-colors" 
                placeholder="Enter password" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E2E8F0] transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#E2E8F0]" /> : <Eye className="w-4 h-4 text-[#E2E8F0]" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#1E2C58] hover:bg-[#2A3E78] text-[#E2E8F0] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] border border-[#2D3E72] group"
          >
            <span className="text-[#E2E8F0]">Login</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 text-[#E2E8F0]" />
          </button>
        </form>
      </div>
    </div>
  );
};

