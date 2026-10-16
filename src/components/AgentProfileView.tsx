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
  // Editable fields: all fields
  const [name, setName] = useState(currentAgent.name || '');
  const [contact, setContact] = useState(currentAgent.contact || '');
  const [email, setEmail] = useState(currentAgent.email || '');
  const [address, setAddress] = useState(currentAgent.address || '');
  const [bloodGroup, setBloodGroup] = useState(currentAgent.bloodGroup || '');
  const [gender, setGender] = useState(currentAgent.gender || '');
  const [birthday, setBirthday] = useState(currentAgent.birthday || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AgentUser = {
      ...currentAgent,
      name: name.trim(),
      contact: contact.trim(),
      email: email.trim(),
      address: address.trim(),
      bloodGroup: bloodGroup,
      gender: gender,
      birthday: birthday
    };

    onUpdateAgentProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Profile</h1>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* User ID (Read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">User ID</label>
              <input type="text" readOnly value={currentAgent.user} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-mono cursor-not-allowed" />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300" />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Number</label>
              <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300" />
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Blood Group</label>
              <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300">
                <option value="">Select</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Residential Address</label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  🔒 Editable by Manager Only
                </span>
              </div>
              <textarea
                rows={2}
                value={address}
                disabled={true}
                readOnly={true}
                placeholder="Address can only be updated by Manager"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button type="submit" className="py-2.5 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
