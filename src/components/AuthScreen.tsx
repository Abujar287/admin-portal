import React, { useState, useRef } from 'react';
import { AgentUser, ManagerUser } from '../types';
import { Lock, LogIn, AlertCircle, ShieldAlert, UserCheck, Shield, UserPlus, Mail } from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
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
      if (mode === 'login') {
        if (email === 'abujar287.algifari@gmail.com' && password === '01410089771') {
          onManagerLogin({
            user: 'abujar287.algifari@gmail.com',
            pass: '01410089771',
            name: 'Manager',
            role: 'Manager'
          });
          return;
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAgentLogin({ 
          user: userCredential.user.email || '', 
          pass: '', 
          name: userCredential.user.displayName || '', 
          role: 'Agent',
          team: 'General'
        });
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent! Check your inbox.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-7 transition-all">
        <div className="text-center mb-5">
          <div className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center mb-2.5 shadow-md bg-blue-700 text-white shadow-blue-700/20">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'login' ? 'Login' : 'Reset Password'}
          </h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-bold">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'login' || mode === 'forgot') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm" placeholder="Email" />
            </div>
          )}
          {mode === 'login' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm" placeholder="Password" />
            </div>
          )}


          <button type="submit" className="w-full py-2.5 bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md cursor-pointer hover:bg-blue-800">
            {mode === 'login' ? 'Login' : 'Send Reset Email'}
          </button>
          {/* No manager login button */}

        </form>

        <div className="mt-4 flex justify-between text-xs font-semibold text-blue-700">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('forgot')}>Forgot Password?</button>
            </>
          )}
          {mode !== 'login' && <button onClick={() => setMode('login')}>Back to Login</button>}
        </div>
      </div>
    </div>
  );
};
