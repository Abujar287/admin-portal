import React from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, LogOut, ShieldCheck } from 'lucide-react';
import { ManagerUser } from '../types';

interface LockScreenProps {
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  managerProfile: ManagerUser;
  handleUnlockSession: (e: React.FormEvent) => void;
  unlockPassword:  string;
  setUnlockPassword: (pass: string) => void;
  unlockError: string;
  setUnlockError: (err: string) => void;
  showUnlockPassword: boolean;
  setShowUnlockPassword: (show: boolean) => void;
  setShowLogoutConfirmModal: (show: boolean) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isLocked,
  setIsLocked,
  managerProfile,
  handleUnlockSession,
  unlockPassword,
  setUnlockPassword,
  unlockError,
  setUnlockError,
  showUnlockPassword,
  setShowUnlockPassword,
  setShowLogoutConfirmModal
}) => {
  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#080E21]/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300 select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="w-full max-w-[440px] bg-[#111C3D] rounded-[2rem] shadow-2xl border border-[#1E2C58] p-10 text-center space-y-8 relative overflow-hidden text-[#E2E8F0]">
        <div className="space-y-4 relative z-10">
          {/* Avatar Monogram */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-[#0E1736] text-[#E2E8F0] font-black text-3xl flex items-center justify-center shadow-2xl border-2 border-[#1E2C58] group transition-transform hover:scale-105 duration-500">
            {(managerProfile.name || managerProfile.user || 'M')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0].toUpperCase())
              .join('') || 'M'}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-blue-600 border-2 border-[#111C3D] flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {managerProfile.name || managerProfile.user || 'Manager'}
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#94A3B8]">
              <span className="text-blue-400">ID: #{managerProfile.user}</span>
              <span>·</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">{managerProfile.role || 'Manager'}</span>
            </div>
          </div>
          
          <p className="text-xs text-[#64748B] max-w-[280px] mx-auto leading-relaxed">
            Your session is encrypted and locked for security. Enter your password to continue your work.
          </p>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlockSession} className="space-y-5 relative z-10 text-left">
          {unlockError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in shake duration-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{unlockError}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">
                Authentication Key
              </label>
            </div>
            <div className="relative group">
              <input
                type={showUnlockPassword ? 'text' : 'password'}
                autoFocus
                required
                value={unlockPassword}
                onChange={(e) => {
                  setUnlockPassword(e.target.value);
                  if (unlockError) setUnlockError('');
                }}
                placeholder="••••••••••••"
                className="w-full pl-5 pr-12 py-4 text-base font-bold font-mono rounded-2xl border border-[#1E2C58] bg-[#080E21] text-white focus:outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-[#1E2C58]"
              />
              <button
                type="button"
                onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white cursor-pointer p-1.5 transition-colors"
                title={showUnlockPassword ? 'Hide password' : 'Show password'}
              >
                {showUnlockPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.98] group"
          >
            <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Unlock Session</span>
          </button>
        </form>

        {/* Full logout option */}
        <div className="pt-4 border-t border-[#1E2C58]/60 relative z-10">
          <button
            type="button"
            onClick={() => {
              setIsLocked(false);
              sessionStorage.removeItem('portal_screen_locked');
              setShowLogoutConfirmModal(true);
            }}
            className="w-full py-2.5 text-xs font-bold text-[#64748B] hover:text-rose-400 flex items-center justify-center gap-2 cursor-pointer transition-colors group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Switch Account or Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

