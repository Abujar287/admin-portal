import React from 'react';
import { User, Layers, Lock, LogOut, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { ManagerUser, AgentNavTab } from '../types';

interface UserMenuProps {
  managerProfile: ManagerUser;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: AgentNavTab) => void;
  setIsLocked: (locked: boolean) => void;
  onLogout: () => void;
  setShowLogoutConfirmModal: (show: boolean) => void;
  userMenuRef: React.RefObject<HTMLDivElement | null>;
  isTabAllowed: (tab: AgentNavTab) => boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  managerProfile,
  isUserMenuOpen,
  setIsUserMenuOpen,
  setActiveTab,
  setIsLocked,
  setShowLogoutConfirmModal,
  userMenuRef,
  isTabAllowed
}) => {
  return (
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-[#111C3D] hover:bg-[#16234D] rounded-xl border border-[#1E2C58] transition-all cursor-pointer shadow-sm select-none"
        title="Account Menu"
      >
        <div className="w-8 h-8 rounded-lg bg-[#080E21] text-[#E2E8F0] font-bold text-sm flex items-center justify-center shadow-inner shrink-0 border border-[#1E2C58]">
          {(managerProfile.name || managerProfile.user || 'M')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('') || 'M'}
        </div>
        <div className="flex flex-col text-left leading-tight max-w-[140px]">
          <span className="text-xs font-bold text-[#E2E8F0] truncate">
            {managerProfile.name || managerProfile.user || 'Manager'}
          </span>
          <span className="text-[10px] font-medium text-[#94A3B8] truncate uppercase tracking-wider">
            {managerProfile.role || 'Manager'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180 text-[#E2E8F0]' : ''}`} />
      </button>

      {/* User Dropdown Menu */}
      {isUserMenuOpen && (
        <div 
          className="absolute right-0 top-full mt-3 w-72 bg-[#0E1736] border border-[#1E2C58] rounded-2xl shadow-2xl py-2 z-[999999] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* User Profile Header */}
          <div className="px-5 py-4 border-b border-[#1E2C58] bg-[#111C3D]/40">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
                {(managerProfile.name || managerProfile.user || 'M')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(w => w[0].toUpperCase())
                  .join('') || 'M'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-[#E2E8F0] truncate">
                  {managerProfile.name || managerProfile.user}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-[#94A3B8]">
                  <span className="text-blue-400">#{managerProfile.user}</span>
                  <span>·</span>
                  <span className="uppercase tracking-tighter">{managerProfile.role || 'Agent'}</span>
                  {managerProfile.team && (
                    <>
                      <span>·</span>
                      <span className="truncate">{managerProfile.team}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profiles');
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#E2E8F0] hover:bg-[#16234D] hover:text-white transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#080E21] border border-[#1E2C58] flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span>My Account</span>
                <span className="text-[10px] font-normal text-[#64748B]">View and edit profile</span>
              </div>
            </button>

            {isTabAllowed('sheet-connection') && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sheet-connection');
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#E2E8F0] hover:bg-[#16234D] hover:text-white transition-all cursor-pointer text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#080E21] border border-[#1E2C58] flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span>Google Sheet</span>
                  <span className="text-[10px] font-normal text-[#64748B]">Manage connections</span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsLocked(true);
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-950/20 hover:text-amber-200 transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#080E21] border border-[#1E2C58] flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span>Lock Screen</span>
                <span className="text-[10px] font-normal text-amber-600/60">Lock your current session</span>
              </div>
            </button>

            <div className="my-2 border-t border-[#1E2C58]/60 mx-2" />

            <button
              type="button"
              onClick={() => {
                setIsUserMenuOpen(false);
                setShowLogoutConfirmModal(true);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span>Logout</span>
                <span className="text-[10px] font-normal text-rose-900/60">Sign out completely</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

