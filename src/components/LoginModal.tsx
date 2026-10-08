import React, { useState } from 'react';
import { AgentUser } from '../types';
import { ShieldCheck, LogIn, UserCheck, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
  agents: AgentUser[];
  onLogin: (agent: AgentUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ agents, onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = userId.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError('Please enter a User ID');
      return;
    }

    const found = agents.find(
      a => a.user.toLowerCase() === cleanUser.toLowerCase()
    );

    if (found) {
      // If password provided and matches, or accept user
      if (!cleanPass || found.pass === cleanPass || cleanPass === cleanUser) {
        setError('');
        onLogin(found);
      } else {
        setError('Incorrect password for registered agent.');
      }
    } else {
      // Auto-register new custom agent from Google Sheet
      const newAgent: AgentUser = {
        user: cleanUser,
        pass: cleanPass || cleanUser,
        name: `Agent (${cleanUser})`,
        team: 'Acquisition',
        email: `${cleanUser.toLowerCase()}@portal.local`
      };
      setError('');
      onLogin(newAgent);
    }
  };

  const handleQuickLogin = (agent: AgentUser) => {
    setUserId(agent.user);
    setPassword(agent.pass);
    setError('');
    onLogin(agent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-7 shadow-2xl border border-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Agent Portal</h2>
            <p className="text-xs text-slate-500 font-medium">Google Sheets Live Connected Portal</p>
          </div>
        </div>

        {/* Live Sheet Status Banner */}
        <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-[11px]">Synced with Google Sheet Web App</span>
          </div>
          <span className="text-[10px] bg-emerald-200/60 text-emerald-900 font-mono px-2 py-0.5 rounded-full font-bold">
            Live
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. agent01 or your name"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (default: same as User ID)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white rounded-lg font-semibold text-sm shadow-md shadow-blue-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Agent Portal</span>
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Available Sheet Agents (1-Click Login)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {agents.slice(0, 4).map((agent) => (
              <button
                key={agent.user}
                type="button"
                onClick={() => handleQuickLogin(agent)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-md bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-700 flex items-center justify-center text-xs font-bold transition-colors">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{agent.user}</p>
                  <p className="text-[10px] text-slate-500 truncate">{agent.team}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
