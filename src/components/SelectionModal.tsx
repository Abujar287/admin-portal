import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SelectionModalProps {
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onAdd: (value: string) => void;
  onClose: () => void;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({ title, options, selected, onSelect, onAdd, onClose }) => {
  const [newValue, setNewValue] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div className="space-y-2 mb-6">
          {options.map(option => (
            <button key={option} onClick={() => { onSelect(option); onClose(); }} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm ${selected === option ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'}`}>
              {option}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            value={newValue} 
            onChange={(e) => setNewValue(e.target.value)} 
            placeholder="Add new..." 
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium"
          />
          <button onClick={() => { onAdd(newValue); setNewValue(''); onClose(); }} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold">Add</button>
        </div>
      </div>
    </div>
  );
};
