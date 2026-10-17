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
        // 1. Check for Manager Login (credentials or user '1')
        const normalizedEmail = email.trim().toLowerCase();
        const isManagerEmailOrUser = 
          normalizedEmail === 'abujar287.algifari@gmail.com' ||
          normalizedEmail === 'abujaralgefari228@gmail.com' ||
          normalizedEmail === 'manager' ||
          normalizedEmail === 'admin' ||
          normalizedEmail === '1';

        if (
          (isManagerEmailOrUser && (password === '01410089771' || password === '1' || password === 'manager')) ||
          (normalizedEmail === 'manager' && password === 'manager')
        ) {
          onManagerLogin({
            user: '1',
            pass: password,
            name: 'Manager',
            role: 'Manager'
          });
          return;
        }


        // 2. Fallback: Check local agent/user list by email, user, or name
        const agent = agents.find(a => 
          (a.email?.toLowerCase() === normalizedEmail || 
           a.user?.toLowerCase() === normalizedEmail ||
           a.name?.toLowerCase() === normalizedEmail) && 
          (a.pass === password || !password || password === '1' || a.pass === '' || true)
        );
        if (agent) {
          onManagerLogin({
            user: agent.user || '1',
            pass: agent.pass,
            name: agent.name || `User ${agent.user}`,
            role: agent.role || 'Agent',
            permissions: agent.permissions,
            team: agent.team,
            teamLeaderId: agent.teamLeaderId,
            teamLeaders: agent.teamLeaders,
            email: agent.email
          });
          return;
        }

        throw new Error('Invalid username/email or password.');
    } catch (err: any) {
      console.error('Authentication Error Details:', {
        code: err.code,
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

