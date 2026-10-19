import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto animate-fadeIn select-none" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#111C3D] rounded-3xl w-full max-w-sm flex flex-col shadow-2xl p-6 border border-[#1E2C58] text-[#E2E8F0]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-lg text-[#E2E8F0]">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#0E1736] text-[#94A3B8] hover:text-[#E2E8F0] rounded-full transition-colors cursor-pointer"><X className="w-5 h-5 text-[#E2E8F0]" /></button>
        </div>
        
        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
          {options.map((option, idx) => (
            <button 
              key={`sel-modal-opt-${option}-${idx}`} 
              onClick={() => { onSelect(option); onClose(); }} 
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                selected === option 
                  ? 'bg-[#1E2C58] text-[#E2E8F0] border border-[#2D3E72] shadow-xs' 
                  : 'bg-[#080E21] text-[#E2E8F0] hover:bg-[#16234D] border border-[#1E2C58]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            value={newValue} 
            onChange={(e) => setNewValue(e.target.value)} 
            placeholder="Add new..." 
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#1E2C58] bg-[#080E21] text-[#E2E8F0] placeholder-[#64748B] text-sm font-medium focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={() => { onAdd(newValue); setNewValue(''); onClose(); }} 
            className="px-4 py-2.5 bg-[#1E2C58] hover:bg-[#2A3E78] text-[#E2E8F0] rounded-xl text-sm font-bold border border-[#2D3E72] transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
