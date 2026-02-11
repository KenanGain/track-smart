import React from 'react';
import { Edit, X } from 'lucide-react';

// --- Utility Functions ---
export const maskSSN = (ssn: string) => {
  if (!ssn || ssn.length < 4) return '***-**-****';
  return `***-**-${ssn.slice(-4)}`;
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const calculateAge = (dob: string) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const calculateExperience = (history: any[]) => {
  if (!history || history.length === 0) return 0;
  
  let totalMonths = 0;
  
  history.forEach(job => {
    if (job.startDate && job.endDate) {
      const start = new Date(job.startDate);
      const end = new Date(job.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalMonths += months > 0 ? months : 0;
    }
  });

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  if (years === 0 && months === 0) return 'Less than 1 month';
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
};

// --- Shared Components ---
export const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Active: 'bg-green-100 text-green-700 border border-green-200',
    Valid: 'bg-green-100 text-green-700 border border-green-200',
    Expired: 'bg-red-100 text-red-700 border border-red-200',
    Inactive: 'bg-gray-100 text-gray-700 border border-gray-200',
    Voluntary: 'bg-gray-100 text-gray-600 border border-gray-200',
    'On Leave': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    Terminated: 'bg-red-100 text-red-700 border border-red-200'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.Inactive}`}>
      {status}
    </span>
  );
};

export const SectionHeader = ({ icon: Icon, title, onEdit, action }: { icon: any, title: string, onEdit?: () => void, action?: React.ReactNode }) => (
  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5 mt-2">
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-blue-50 rounded text-blue-600">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
    <div className="flex items-center gap-2">
      {action}
      {onEdit && (
        <button onClick={onEdit} className="text-slate-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors" title="Edit Section">
          <Edit className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);

export const ViewField = ({ label, value, highlight = false, fullWidth = false }: { label: string, value: string | number | undefined, highlight?: boolean, fullWidth?: boolean }) => (
  <div className={`mb-4 ${fullWidth ? 'col-span-full' : ''}`}>
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-medium truncate ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
      {value || '-'}
    </p>
  </div>
);

export const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`${
          checked ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </button>
    <span className="text-sm font-medium text-slate-700">{label}</span>
  </div>
);

export const InputGroup = ({ label, name, type = "text", value, onChange, options = null, className = "", required = false, helper = "", multiple = false }: any) => (
  <div className={`flex flex-col ${className}`}>
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {options ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        multiple={multiple}
        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      />
    )}
    {helper && <p className="text-[10px] text-slate-400 mt-1">{helper}</p>}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, onSave, saveText = "Save Changes" }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white bg-white">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium">{saveText}</button>
        </div>
      </div>
    </div>
  );
};
