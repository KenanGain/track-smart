import { AlertTriangle } from 'lucide-react';

interface Row {
  label: string;
  value: string;
  national: string;
  threshold: string;
  alert: boolean;
}

interface SafetyRatingOosCardProps {
  currentRating: string;
  currentRatingClass: string;
  infoText: string;
  rows: Row[];
  certificate: {
    number: string;
    effectiveDate: string;
    expiryDate: string;
    operatingStatus: string;
  };
}

export function SafetyRatingOosCard({
  currentRating,
  currentRatingClass,
  infoText,
  rows,
  certificate
}: SafetyRatingOosCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Safety Rating & OOS</h3>
        <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${currentRatingClass}`}>
          {currentRating}
        </span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-[13px] text-slate-500 leading-relaxed border-l-2 border-slate-200 pl-3 italic">
          {infoText}
        </p>

        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider">Metric</th>
                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider">Carrier</th>
                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">National</th>
                <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{r.label}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono font-bold ${r.alert ? 'text-red-600' : 'text-slate-900'}`}>
                      {r.alert && <AlertTriangle size={12} className="inline mr-1 -mt-0.5 text-red-500" />}
                      {r.value}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-500 hidden sm:table-cell">{r.national}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-500 hidden sm:table-cell">{r.threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Certificate Info</h4>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Number</div>
              <div className="text-[13px] font-bold text-slate-800">{certificate.number}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
              <div className="text-[13px] font-bold text-slate-800">{certificate.operatingStatus}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Effective</div>
              <div className="text-[13px] font-bold text-slate-800">{certificate.effectiveDate}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Expiry</div>
              <div className="text-[13px] font-bold text-slate-800">{certificate.expiryDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
