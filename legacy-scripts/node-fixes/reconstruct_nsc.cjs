const fs = require('fs');

const path = 'src/pages/inspections/InspectionsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const nscCode = `
      {/* ===== TAB: CARRIER PROFILE (NSC) ===== */}
      {activeMainTab === 'carrier-profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Carrier Identity</h3>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                    12-Month Report As Of: <span className="font-mono text-blue-600 ml-1">2024 OCT 15</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-5 pb-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-tight">Acme Trucking Inc.</h2>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        1200 North Dupont Highway<br />
                        Wilmington, DE 19801, United States
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">NSC Number</div>
                      <div className="font-mono text-sm font-bold text-slate-900">AB320-9327</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">MVID Number</div>
                      <div className="font-mono text-sm font-bold text-slate-900">0930-15188</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Profile Period Start</div>
                      <div className="font-mono text-sm font-bold text-slate-900">2022 OCT 01</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Profile Period End</div>
                      <div className="font-mono text-sm font-bold text-slate-900">2024 OCT 15</div>
                    </div>
                  </div>
                </div>
              </div>

              <SafetyRatingOosCard
                currentRating="Conditional"
                currentRatingClass="bg-amber-100 text-amber-800 border-amber-200"
                iconColorClass="text-amber-500"
                infoText="NSC uses the same carrier OOS breakdown shown in the Canadian views, paired here with the active safety fitness rating."
                rows={[
                  {
                    label: 'Overall OOS',
                    value: \`\${carrierProfile.cvorAnalysis.counts.oosOverall}%\`,
                    national: \`\${parseFloat(carrierProfile.oosRates.vehicle.national)}%\`,
                    threshold: \`\${cvorOosThresholds.overall}%\`,
                    alert: carrierProfile.cvorAnalysis.counts.oosOverall > cvorOosThresholds.overall,
                  },
                  {
                    label: 'Vehicle OOS',
                    value: \`\${carrierProfile.cvorAnalysis.counts.oosVehicle}%\`,
                    national: \`\${parseFloat(carrierProfile.oosRates.vehicle.national)}%\`,
                    threshold: \`\${cvorOosThresholds.vehicle}%\`,
                    alert: carrierProfile.cvorAnalysis.counts.oosVehicle > cvorOosThresholds.vehicle,
                  },
                  {
                    label: 'Driver OOS',
                    value: \`\${carrierProfile.cvorAnalysis.counts.oosDriver}%\`,
                    national: \`\${parseFloat(carrierProfile.oosRates.driver.national)}%\`,
                    threshold: \`\${cvorOosThresholds.driver}%\`,
                    alert: carrierProfile.cvorAnalysis.counts.oosDriver > cvorOosThresholds.driver,
                  },
                ]}
                certificate={{
                  number: '002050938',
                  effectiveDate: '2021 NOV 03',
                  expiryDate: '2024 OCT 31',
                  operatingStatus: 'Federal',
                }}
              />

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Truck size={14} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fleet Size &amp; Exposure</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Power units</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(carrierProfile.cvorAnalysis.counts.trucks)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drivers</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(carrierProfile.drivers)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected-period miles</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(nscAnalytics.periodMiles)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points / MM miles</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(nscAnalytics.pointsPerMillionMiles, 2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg border border-slate-100 bg-red-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">Overall OOS</div>
                    <div className="mt-1 text-sm font-black text-red-700">{carrierProfile.cvorAnalysis.counts.oosOverall}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-orange-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Vehicle OOS</div>
                    <div className="mt-1 text-sm font-black text-orange-700">{carrierProfile.cvorAnalysis.counts.oosVehicle}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-violet-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Driver OOS</div>
                    <div className="mt-1 text-sm font-black text-violet-700">{carrierProfile.cvorAnalysis.counts.oosDriver}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Monitoring / Intervention</h3>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <span className={\`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider \${nscRiskBand.badge}\`}>
                    {nscRiskBand.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">{carrierProfile.cvorAnalysis.rating.toFixed(2)}%</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{nscRiskBand.detail}</p>
                <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Warning threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.warning}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Intervention threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.intervention}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Show-cause threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.showCause}%</span>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                  This band is derived from the configured NSC threshold logic already used in the app. An official monitoring dataset is not present in the repo.
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-emerald-800">Risk Factor</h3>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 italic">(dynamically calculated based on profile request date)</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 relative overflow-hidden group">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">R-Factor Score</div>
                    <div className="mt-1.5 font-mono text-[16px] font-black text-emerald-600">0.356</div>
                    <div className="text-[9px] text-slate-400 mt-1 opacity-80">(carrier must strive for the lowest score)</div>
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-400 rounded-r-lg group-hover:w-1.5 transition-all"></div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Range</div>
                    <div className="mt-2 text-sm font-bold text-slate-900">8.0-13.9</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Type</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">Truck</div>
                  </div>
                </div>
                <div className="space-y-3 mt-5">
                  <div className="mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Contribution to R-Factor</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 italic">(dynamically calculated based on profile request date)</div>
                  </div>
                  {[
                    { label: 'Convictions', value: '34.6%', color: 'bg-red-500', bg: 'bg-red-50', events: 5 },
                    { label: 'Administrative Penalties', value: '0.0%', color: 'bg-slate-300', bg: 'bg-slate-50', events: 0 },
                    { label: 'CVSA Inspections', value: '32.3%', color: 'bg-blue-500', bg: 'bg-blue-50', events: 43 },
                    { label: 'Reportable Collisions', value: '33.1%', color: 'bg-amber-500', bg: 'bg-amber-50', events: 6 },
                  ].map((row) => (
                    <div key={row.label} className={\`p-2 rounded-lg border border-slate-100 \${row.bg} relative group cursor-pointer overflow-hidden\`}>
                      <div className="flex items-center justify-between gap-3 mb-1.5 text-sm transition-opacity group-hover:opacity-0 delay-75">
                        <span className="font-semibold text-slate-700">{row.label}</span>
                        <span className="font-mono font-black text-slate-900">{row.value}</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200/60 shadow-inner transition-opacity group-hover:opacity-0 delay-75">
                        <div className={\`h-full rounded-full \${row.color}\`} style={{ width: row.value }} />
                      </div>
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-4 z-10 translate-y-1 group-hover:translate-y-0">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            <Info size={14} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{row.label} Details</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">
                              {row.events} Event{row.events !== 1 ? 's' : ''}
                            </div>
                            <div className={\`px-2 py-0.5 rounded text-xs font-bold \${row.color.replace('bg-', 'text-').replace('-500', '-700')} \${row.bg}\`}>
                              {row.value} Impact
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <NscAnalysis />

          <NscCvsaInspections />
        </div>
      )}

      {/* ===== UPLOAD MODAL ===== */}
`;

const targetContent = "      {/* ===== UPLOAD MODAL ===== */}";
if (!content.includes(targetContent)) {
    console.error("Target content not found");
    process.exit(1);
}
const newContent = content.replace(targetContent, nscCode.trimStart());
fs.writeFileSync(path, newContent, 'utf8');

const importFixes = [
  { item: 'Target', importSrc: 'lucide-react' },
  { item: 'Building', importSrc: 'lucide-react' },
  { item: 'Info', importSrc: 'lucide-react' },
  { item: 'NscAnalysis', importSrc: './NscAnalysis' },
  { item: 'NscCvsaInspections', importSrc: './NscCvsaInspections' },
  { item: 'nscRiskBand', importSrc: './inspectionsData' },
  { item: 'nscAnalytics', importSrc: './inspectionsData' },
  { item: 'cvorOosThresholds', importSrc: './inspectionsData' },
  { item: 'SafetyRatingOosCard', importSrc: './SafetyRatingOosCard' }
];

let importUpdates = fs.readFileSync(path, 'utf8');
const lucideImportsMatch = importUpdates.match(/import\s+{([^}]+)}\s+from\s+'lucide-react';/);
if (lucideImportsMatch) {
    let currentLucideImports = lucideImportsMatch[1].split(',').map(s => s.trim());
    let added = false;
    for (const { item, importSrc } of importFixes) {
        if (importSrc === 'lucide-react' && !currentLucideImports.includes(item)) {
            currentLucideImports.push(item);
            added = true;
        }
    }
    if (added) {
        const replacement = \`import { \${currentLucideImports.join(', ')} } from 'lucide-react';\`;
        importUpdates = importUpdates.replace(lucideImportsMatch[0], replacement);
    }
}

const ensureLocalImport = (item, src) => {
    if (!importUpdates.includes(\`\${item}\`)) {
        const lastLocalImportMatch = [...importUpdates.matchAll(/import.*?from\s+['"].*?['"];\n/g)].pop();
        if (lastLocalImportMatch) {
            const lastImportIdx = lastLocalImportMatch.index + lastLocalImportMatch[0].length;
            importUpdates = importUpdates.slice(0, lastImportIdx) + \`import { \${item} } from '\${src}';\\n\` + importUpdates.slice(lastImportIdx);
        }
    }
}

ensureLocalImport('NscAnalysis', './NscAnalysis');
ensureLocalImport('NscCvsaInspections', './NscCvsaInspections');
if (!importUpdates.includes('nscRiskBand')) {
    importUpdates = importUpdates.replace(/import { (.*?) } from '\.\/inspectionsData';/, "import { $1, nscRiskBand, nscAnalytics, cvorOosThresholds } from './inspectionsData';");
}
ensureLocalImport('SafetyRatingOosCard', './SafetyRatingOosCard');

fs.writeFileSync(path, importUpdates, 'utf8');
console.log('SuccessNode');
