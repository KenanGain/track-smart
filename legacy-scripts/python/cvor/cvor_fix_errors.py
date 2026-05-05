#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

# ── 1. Fix periodInspections missing in CVOR SECTION 3 ───────────────────────
# Section 3 was inside Section 2's IIFE (which had periodInspections defined).
# Now Section 3 is standalone — add the definition at the top of its IIFE.
old_sec3_open = """            {/* ===== CVOR SECTION 3: METRICS BY PROVINCE ===== */}
            {(() => {
              const sortKey2 = cvorMetricsView === 'INSPECTIONS' ? 'inspections' : cvorMetricsView === 'VIOLATIONS' ? 'violations' : 'points';"""

new_sec3_open = """            {/* ===== CVOR SECTION 3: METRICS BY PROVINCE ===== */}
            {(() => {
              const now = new Date('2025-12-31');
              const periodMonths = cvorPeriod === 'Monthly' ? 1 : cvorPeriod === 'Quarterly' ? 3 : cvorPeriod === 'Semi-Annual' ? 6 : 12;
              const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - periodMonths);
              const periodInspections = cvorInspections.filter((i: any) => new Date(i.date) >= cutoff);
              const sortKey2 = cvorMetricsView === 'INSPECTIONS' ? 'inspections' : cvorMetricsView === 'VIOLATIONS' ? 'violations' : 'points';"""

src = src.replace(old_sec3_open, new_sec3_open)

# ── 2. Remove unused state: cvorSummaryView, setCvorSummaryView ───────────────
src = src.replace(
    "  const [cvorSummaryView, setCvorSummaryView] = useState<'CATEGORIES' | 'INSPECTIONS'>('CATEGORIES');\n",
    ""
)

# ── 3. Remove unused state: cvorTopViolSort, setCvorTopViolSort ───────────────
old_viol_state = None
for line in src.split('\n'):
    if 'cvorTopViolSort' in line and 'useState' in line:
        old_viol_state = line
        break
if old_viol_state:
    src = src.replace(old_viol_state + '\n', '')

# ── 4. Remove unused function: renderCvorAnalysisRow ─────────────────────────
# Find the function definition and remove it
idx = src.find('const renderCvorAnalysisRow')
if idx != -1:
    # Find the end of this function (next top-level const/let/function at same indent)
    end_idx = src.find('\n  const ', idx + 1)
    if end_idx == -1:
        end_idx = src.find('\n  function ', idx + 1)
    if end_idx != -1:
        src = src[:idx] + src[end_idx+1:]
        print("Removed renderCvorAnalysisRow")

# ── 5. Fix type mismatch: smsListPeriod filter buttons use wrong period values ─
# The buttons iterate ['Monthly','Quarterly','Semi-Annual','All'] but smsListPeriod
# type is '1M'|'3M'|'6M'|'12M'|'24M'|'custom'. Fix the buttons to use correct values.
src = src.replace(
    "{(['Monthly','Quarterly','Semi-Annual','All'] as const).map(p => (\n                      <button key={p} onClick={() => { setSmsListPeriod(p); setPage(1); }}\n                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${smsListPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>\n                        {p}\n                      </button>\n                    ))}",
    "{([['1M','1M'],['3M','3M'],['6M','6M'],['12M','12M'],['24M','24M']] as const).map(([val,lbl]) => (\n                      <button key={val} onClick={() => { setSmsListPeriod(val); setPage(1); }}\n                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${smsListPeriod === val ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>\n                        {lbl}\n                      </button>\n                    ))}"
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

print("Done")
