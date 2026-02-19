
import { Ban } from 'lucide-react';

export function ViolationsListPage() {
  return (
    <div className="flex-1 min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Ban className="text-red-600" size={32} />
                    Violations
                </h1>
                <p className="text-slate-500 mt-1">Manage and review driver and vehicle violations.</p>
            </div>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                Export Report
            </button>
        </div>

        {/* Content Placeholder */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ban className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Violations List Coming Soon</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
                This dashboard will allow you to track, filter, and manage all operational violations across your fleet. 
                Configure risk settings in <strong>Settings &gt; Violations</strong>.
            </p>
        </div>
      </div>
    </div>
  );
}
