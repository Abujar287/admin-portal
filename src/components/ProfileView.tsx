import React from 'react';
import { AgentUser, OrderItem } from '../types';
import { User, Shield, Briefcase, Mail, CheckCircle2, TrendingUp, Package } from 'lucide-react';

interface ProfileViewProps {
  currentAgent: AgentUser;
  orders: OrderItem[];
  onNavigateToCreate: () => void;
  onNavigateToOrders: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentAgent,
  orders,
  onNavigateToCreate,
  onNavigateToOrders
}) => {
  const myOrders = orders.filter(
    (o) => o.agentId.toLowerCase() === currentAgent.user.toLowerCase()
  );

  const deliveredOrders = myOrders.filter(
    (o) => o.followupStatus.toLowerCase() === 'delivered'
  );

  const totalDeliveredValue = deliveredOrders.reduce((sum, o) => sum + o.orderValue, 0);
  const totalEarnedProfit = deliveredOrders.reduce((sum, o) => sum + o.profit, 0);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your account credentials, assignment team, and active standing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <div className="md:col-span-1 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3 text-2xl font-bold">
                {currentAgent.name.charAt(0) || 'A'}
              </div>
              <h2 className="text-base font-bold text-slate-900">{currentAgent.name}</h2>
              <span className="mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                {currentAgent.team} Team
              </span>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Agent ID
                </span>
                <strong className="font-semibold text-slate-800">{currentAgent.user}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Team
                </span>
                <strong className="font-semibold text-slate-800">{currentAgent.team}</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> System Contact
                </span>
                <span className="font-medium text-slate-700 text-[11px]">{currentAgent.email || `${currentAgent.user}@portal.internal`}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={onNavigateToCreate}
              className="w-full py-2.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Create New Order</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights / Stats */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders Logged</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{myOrders.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Lifetime activity</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Successfully Delivered</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">{deliveredOrders.length}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {myOrders.length > 0
                    ? `${Math.round((deliveredOrders.length / myOrders.length) * 100)}% delivery success rate`
                    : '0% rate'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered Value</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  ৳ {totalDeliveredValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Completed orders volume</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold">৳</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commission Profit</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                  ৳ {totalEarnedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Earnings recognized</p>
              </div>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl p-5 border border-blue-100 flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                Acquisition Agent Guidelines
              </h3>
              <p className="text-xs text-blue-700/90 mt-1 max-w-xl leading-relaxed">
                Orders booked via this terminal are synchronized with Google Sheets. Please ensure customer contacts are verified and the correct delivery area is selected to prevent return costs.
              </p>
            </div>
            <button
              onClick={onNavigateToOrders}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline whitespace-nowrap cursor-pointer shrink-0 ml-4"
            >
              View My Orders →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
