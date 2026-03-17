import { FileText, ShieldAlert, AlertTriangle, Scale, Target, ListChecks } from 'lucide-react';

// NSC-specific carrier data (matches the Carrier Identity in the NSC tab header)
const NSC_CARRIER = {
  nscNumber: 'AB320-9327',
  carrierName: 'Bent Transport Inc.',
  periodStart: '2022 OCT 01',
  periodEnd: '2024 OCT 15',
};

// Conviction data derived from the carrier's NSC profile
// These map to the fleet's actual conviction categories
const CONVICTION_DATA = [
  { category: 'Speeding',                count: 0, group: 'Driving (Passing, Disobey Signs, Signals, etc.)' },
  { category: 'Stop signs/Traffic lights',count: 1, group: 'Driving (Passing, Disobey Signs, Signals, etc.)' },
  { category: 'Hours of Service',         count: 2, group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
  { category: 'Trip Inspections',         count: 0, group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
  { category: 'Brakes',                   count: 2, group: 'CVIP' },
  { category: 'Mechanical Defects',       count: 0, group: 'CVIP' },
  { category: 'Oversize/Overweight',      count: 0, group: 'CVIP' },
  { category: 'Security of Loads',        count: 0, group: 'CVIP' },
  { category: 'Dangerous Goods',          count: 0, group: 'CVIP' },
  { category: 'Criminal Code',            count: 0, group: 'Driving (Passing, Disobey Signs, Signals, etc.)' },
  { category: 'Permits',                  count: 0, group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
  { category: 'Miscellaneous',            count: 0, group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
  { category: 'Administrative Actions',   count: 0, group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
];

const TOTAL_DOCUMENTS = 5;
const TOTAL_CONVICTIONS = CONVICTION_DATA.reduce((s, r) => s + r.count, 0) || 5;
const ACTIVE_POINTS = 2;

export function NSCConvictionSection() {
  const rows = CONVICTION_DATA.map(r => ({
    ...r,
    percent: TOTAL_CONVICTIONS > 0 ? (r.count / TOTAL_CONVICTIONS) * 100 : 0,
  }));

  // Group subtotals
  const groupTotals: Record<string, number> = {};
  for (const r of rows) {
    groupTotals[r.group] = (groupTotals[r.group] || 0) + r.count;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col w-full h-full">
      {/* Header Area */}
      <div className="bg-slate-50 border-b border-slate-200 p-5 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm border border-red-200">
            <Scale size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-[15px] uppercase tracking-wide leading-none">
                Part 2: Conviction Information
              </h3>
              <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                NSC Report
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Convictions against the carrier over the profile period
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          <FileText size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600">pg. 4</span>
        </div>
      </div>

      <div className="p-6">
        {/* Carrier Details & Totals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Profile Details */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Profile Period Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-600">NSC Number</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{NSC_CARRIER.nscNumber}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-600">Carrier Name</span>
                <span className="font-bold text-slate-900">{NSC_CARRIER.carrierName}</span>
              </div>
              <div className="h-px bg-slate-200 my-2"></div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Period Start</span>
                <span className="font-mono text-slate-700">{NSC_CARRIER.periodStart}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Period End</span>
                <span className="font-mono text-slate-700">{NSC_CARRIER.periodEnd}</span>
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-red-50/50 rounded-xl p-5 border border-red-100/50">
            <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Target size={12} /> Reporting Totals
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-sm">
                <div className="text-xl font-black text-slate-800">{TOTAL_DOCUMENTS}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Documents</div>
              </div>
              <div className="bg-white border border-red-200 rounded-lg p-3 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <div className="text-xl font-black text-red-600">{TOTAL_CONVICTIONS}</div>
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-1">Convictions</div>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-3 text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <div className="text-xl font-black text-amber-600">{ACTIVE_POINTS}</div>
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-1">Active Pts</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Conviction Analysis Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-slate-500" />
              <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Conviction Analysis</h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">Breakdown by Category</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-center">Number of<br/>Convictions</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider text-center">Percent<br/>of Total</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Group Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.count > 0 ? 'bg-white' : 'bg-slate-50/30 text-slate-400'}`}>
                    <td className="px-5 py-2.5">
                      <span className={row.count > 0 ? "font-medium text-slate-800" : ""}>{row.category}</span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${row.count > 0 ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}>
                        {row.count > 0 ? row.count : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={row.count > 0 ? "font-mono font-medium text-slate-700" : ""}>
                        {row.count > 0 ? `${row.percent.toFixed(1)} %` : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`text-[13px] ${row.count > 0 ? "text-slate-600" : "text-slate-400"}`}>
                        {row.group}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-5 py-3 font-bold text-slate-800 uppercase tracking-wider text-right">Total Convictions</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center justify-center bg-slate-800 text-white w-7 h-7 rounded text-sm font-black shadow-sm">
                      {TOTAL_CONVICTIONS}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">
                    100.0 %
                  </td>
                  <td className="px-5 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Conviction Note Section */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <ShieldAlert size={16} className="text-slate-500" />
            <h4 className="font-bold text-slate-700 text-sm">Conviction Note</h4>
          </div>
          
          <div className="p-5 bg-slate-50/30">
            <div className="bg-white p-5 text-sm text-slate-600 leading-relaxed rounded-b-xl">
              <p className="mb-4">
                The information recorded in this Part reflects convictions. A <strong>"conviction"</strong> is an offence that has resulted in a
                conviction being registered in the courts. Events are shown in order of offence date, with the most recent date
                shown first.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                <p className="mb-3 font-medium text-slate-700">
                  Points ranging from <span className="text-emerald-600 font-bold">0</span> to <span className="text-red-600 font-bold">5</span> are assigned to a conviction depending on the severity of the offence, <span className="font-bold underline decoration-red-300">5 being the most serious</span> offence. As an example:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 hover:bg-slate-100/50 rounded px-2 transition-colors">
                    <span className="text-[13px] truncate pr-2">Faulty lights, no out-of-service</span>
                    <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full shrink-0">1 pt</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 hover:bg-slate-100/50 rounded px-2 transition-colors">
                    <span className="text-[13px] truncate pr-2">Speed, 21-30 km/hr over limit</span>
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">2 pts</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 hover:bg-slate-100/50 rounded px-2 transition-colors">
                    <span className="text-[13px] truncate pr-2">No permit or conditions breach</span>
                    <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full shrink-0">3 pts</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 hover:bg-slate-100/50 rounded px-2 transition-colors">
                    <span className="text-[13px] truncate pr-2">Drive while disqualified</span>
                    <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">5 pts</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-blue-50/50 text-blue-800 p-4 border border-blue-100 rounded-lg">
                <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[13px] leading-relaxed">
                  <p className="mb-2">
                    Conviction points, Administrative Penalty points, CVSA points per vehicle, Collision points over a 12 month period, and the carrier's average fleet size are used to establish the carriers <strong>Risk Factor score (R-Factor)</strong>. Alberta Transportation and Economic Corridors will intervene with those carriers with an unacceptable R-Factor score.
                  </p>
                  <p className="font-semibold text-blue-900 bg-blue-100/50 inline-block px-2 py-0.5 rounded">
                    Events will stay on the carrier profile report for 12 months from the conviction date, not the event date.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
