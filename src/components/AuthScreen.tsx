import React, { useState, useRef } from 'react';
import { AgentUser, ManagerUser } from '../types';
import { Lock, LogIn, AlertCircle, ShieldAlert, UserCheck, Shield } from 'lucide-react';

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
  const [loginType, setLoginType] = useState<'agent' | 'manager'>('agent');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    const u = userId.trim();
    const p = password.trim();

    if (!u) {
      setError(loginType === 'agent' ? 'Enter Agent ID' : 'Enter Manager ID');
      return;
    }

    if (!p) {
      setError('Enter your password');
      return;
    }

    // Smart detection: user entered Manager credentials on Agent tab
    if (loginType === 'agent' && (u.toLowerCase() === 'manager' || u.toLowerCase() === 'manager01')) {
      setError('This is a Manager ID. Please click "Manager Login" tab above!');
      return;
    }

    // Smart detection: user entered Agent credentials on Manager tab
    if (loginType === 'manager' && u.toLowerCase().startsWith('agent')) {
      setError('This is an Agent ID. Please click "Agent Login" tab above!');
      return;
    }

    // 1. MANAGER LOGIN FLOW
    if (loginType === 'manager') {
      const isManagerUser = u.toLowerCase() === 'manager' || u.toLowerCase() === 'manager01';
      if (!isManagerUser) {
        setError('Invalid Manager ID! Expected "manager"');
        return;
      }

      // Manager password check (supports 'manager' or 'Manager')
      const isCorrectPass = (u.toLowerCase() === 'manager' && (p === 'manager' || p === 'Manager')) ||
                            (u.toLowerCase() === 'manager01' && (p === 'manager01' || p === 'Manager01'));

      if (!isCorrectPass) {
        setError('Invalid Password! (ভুল পাসওয়ার্ড - সঠিক পাসওয়ার্ড দিন)');
        return;
      }

      // Successful Manager Login
      setError('');
      onManagerLogin({
        user: u,
        pass: p,
        name: 'Manager (Admin)',
        role: 'System Administrator'
      });
      return;
    }

    // 2. AGENT LOGIN FLOW
    if (loginType === 'agent') {
      const agentIndex = agents.findIndex(
        (a) => a.user.toLowerCase() === u.toLowerCase()
      );

      if (agentIndex === -1) {
        setError('Invalid Agent ID! Agent not found.');
        return;
      }

      const agent = agents[agentIndex];

      // Check if account is currently deactivated
      if (agent.status === 'deactivated') {
        setError('Account Deactivated! You entered incorrect password 3 times. Account is locked. Contact Manager to reactivate.');
        return;
      }

      // Check password strictly
      if (agent.pass !== p) {
        // Wrong password entered!
        const currentFails = (agent.failedAttempts || 0) + 1;

        if (currentFails >= 3) {
          // Deactivate account after 3 failed attempts
          const updated = agents.map((a, idx) =>
            idx === agentIndex
              ? { ...a, failedAttempts: currentFails, status: 'deactivated' as const }
              : a
          );
          onUpdateAgents(updated);
          setError('Account Deactivated! You entered incorrect password 3 times. Account is locked. Contact Manager to reactivate.');
        } else {
          // Warn remaining attempts
          const remaining = 3 - currentFails;
          const updated = agents.map((a, idx) =>
            idx === agentIndex ? { ...a, failedAttempts: currentFails } : a
          );
          onUpdateAgents(updated);
          setError(`Invalid Password! (${remaining} attempt${remaining > 1 ? 's' : ''} remaining before account is deactivated)`);
        }
        return; // STOP! NEVER call onAgentLogin!
      }

      // Password is correct! Reset failed attempts if any
      if ((agent.failedAttempts || 0) > 0) {
        const updated = agents.map((a, idx) =>
          idx === agentIndex ? { ...a, failedAttempts: 0 } : a
        );
        onUpdateAgents(updated);
      }

      setError('');
      onAgentLogin(agent);
    }
  };

  const handleTabChange = (type: 'agent' | 'manager') => {
    setLoginType(type);
    setUserId('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-7 transition-all">
        {/* Dual Login Tabs (Agent Login & Manager Login) */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange('agent')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginType === 'agent'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Agent Login</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('manager')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginType === 'manager'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Manager Login</span>
          </button>
        </div>

        {/* Header without any demo text */}
        <div className="text-center mb-5">
          <div
            className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center mb-2.5 shadow-md ${
              loginType === 'agent'
                ? 'bg-blue-700 text-white shadow-blue-700/20'
                : 'bg-purple-700 text-white shadow-purple-700/20'
            }`}
          >
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {loginType === 'agent' ? 'Agent Login' : 'Manager Login'}
          </h2>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Clean Form: Enter Agent ID / Enter Manager ID & Enter your password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {loginType === 'agent' ? 'Enter agent ID' : 'Enter manager ID'}
            </label>
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  passwordInputRef.current?.focus();
                  passwordInputRef.current?.select();
                }
              }}
              placeholder={loginType === 'agent' ? 'Enter agent ID' : 'Enter manager ID'}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter your password
            </label>
            <input
              ref={passwordInputRef}
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2.5 px-4 text-white rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
              loginType === 'agent'
                ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/20 active:scale-[0.99]'
                : 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/20 active:scale-[0.99]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        </form>
      </div>
    </div>
  );
};
