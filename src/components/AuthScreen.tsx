import React, { useState } from 'react';
import { AgentUser, ManagerUser } from '../types';
import { Lock } from 'lucide-react';


// IMPORTANT: Please enable Email/Password provider in your Firebase Console authentication settings!

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
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.trim();

        // 1. Check for Manager Login (strict credentials)
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
          if (normalizedPassword === '01410089771' || normalizedPassword === 'manager') {
            onManagerLogin({
              user: '1',
              pass: normalizedPassword,
              name: 'Manager',
              role: 'Manager'
            });
            return;
          } else {
            throw new Error('Incorrect password for manager account.');
          }
        }

        if (isSuperAdminLogin) {
          if (normalizedPassword === 'superadmin123' || normalizedPassword === '01410089771' || normalizedPassword === 'manager') {
            onManagerLogin({
              user: '100',
              pass: normalizedPassword,
              name: 'superadmin',
              role: 'Superadmin'
            });
            return;
          } else {
            throw new Error('Incorrect password for superadmin account.');
          }
        }

        // 2. Check local agent/user list by email or user ID with exact password match
        const agent = agents.find(a => 
          (a.email && a.email.trim().toLowerCase() === normalizedEmail) ||
          (a.user && a.user.trim().toLowerCase() === normalizedEmail)
        );

        if (agent) {
          if (agent.pass && agent.pass === normalizedPassword) {
            const resolvedUserId = agent.user || normalizedEmail;
            onManagerLogin({
              user: resolvedUserId,
              pass: agent.pass,
              name: agent.name || `User ${resolvedUserId}`,
              role: agent.role || 'Agent',
              permissions: agent.permissions,
              team: agent.team,
              teamLeaderId: agent.teamLeaderId,
              teamLeaders: agent.teamLeaders,
              email: agent.email
            });
            return;
          } else {
            throw new Error('Incorrect password for this account.');
          }
        }

        throw new Error('Invalid email/user ID or incorrect password. Please check your credentials.');
    } catch (err: any) {
      console.error('Authentication Error Details:', {
        message: err.message,
        email: email
      });
      setError(err.message || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-7 transition-all">
        <div className="text-center mb-6">
          <div className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center mb-2.5 shadow-md bg-indigo-600 text-white shadow-indigo-600/20">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Order Admin Portal</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-bold">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">email</label>
            <input 
              type="text" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:outline-hidden" 
              placeholder="enter your email" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:outline-hidden" 
              placeholder="Enter Your Password" 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md cursor-pointer hover:bg-indigo-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

