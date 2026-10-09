import React, { useState } from 'react';
import { AgentUser } from '../types';
import { 
  Shield, 
  User, 
  Briefcase, 
  Phone, 
  Mail, 
  MapPin, 
  Heart, 
  Calendar, 
  Save, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

interface AgentProfileViewProps {
  currentAgent: AgentUser;
  onUpdateAgentProfile: (updatedAgent: AgentUser) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const AgentProfileView: React.FC<AgentProfileViewProps> = ({
  currentAgent,
  onUpdateAgentProfile
}) => {
  // Editable fields only: contact, email, address, bloodGroup, birthday
  const [contact, setContact] = useState(currentAgent.contact || '');
  const [email, setEmail] = useState(currentAgent.email || '');
  const [address, setAddress] = useState(currentAgent.address || '');
  const [bloodGroup, setBloodGroup] = useState(currentAgent.bloodGroup || '');
  const [birthday, setBirthday] = useState(currentAgent.birthday || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AgentUser = {
      ...currentAgent,
      contact: contact.trim(),
      email: email.trim(),
      address: address.trim(),
      bloodGroup: bloodGroup,
      birthday: birthday
      // ID, name, team are preserved strictly from currentAgent
    };

    onUpdateAgentProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal contact information, residential address, blood group, and birthday.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        {/* Fixed Information Section (ID, Full Name, Team - Cannot be edited) */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-100">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Official Identity (Fixed &amp; Read-Only)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-400" /> Agent ID
              </label>
              <input
                type="text"
                readOnly
                value={currentAgent.user}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-mono font-bold select-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Full Name
              </label>
              <input
                type="text"
                readOnly
                value={currentAgent.name}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-bold select-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-slate-400" /> Team
              </label>
              <input
                type="text"
                readOnly
                value={`${currentAgent.team} Team`}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-bold select-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Editable Personal Details Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-900 pb-2 border-b border-blue-100">
            Editable Personal Information
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Contact Number</span>
              </label>
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 017xxxxxxxx"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@portal.com"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <span>Blood Group</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Birthday</span>
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Present / Residential Address</span>
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter full residential address"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-700/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
