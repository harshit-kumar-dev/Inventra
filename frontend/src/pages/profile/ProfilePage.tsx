import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, Mail, Calendar, Key, CheckCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <User className="w-7 h-7 text-indigo-400" /> User Profile & Security
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review your authenticated identity, assigned access privileges, and system credentials
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/30">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">ID: {user.loginId}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Mail className="w-4 h-4 text-indigo-400" /> Email Address
            </div>
            <div className="text-base font-medium text-white">{user.email}</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-emerald-400" /> Access Authorization
            </div>
            <div className="text-base font-medium text-white">
              {user.role === 'INVENTORY_MANAGER' ? 'Full Administrative Control' : 'Standard Warehouse Operator'}
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Key className="w-4 h-4 text-amber-400" /> Authentication Method
            </div>
            <div className="text-base font-medium text-white">JWT + Bcrypt Password Hash</div>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <CheckCircle className="w-4 h-4 text-cyan-400" /> Security Status
            </div>
            <div className="text-base font-medium text-emerald-400">Active & Verified Session</div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
