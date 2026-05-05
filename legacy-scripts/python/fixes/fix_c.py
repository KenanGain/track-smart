import re
import sys

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add BcPanels imports if not present
if "import { BcCvsaPanel, BcAccidentPanel } from './BcPanels';" not in text:
    text = text.replace(
        "import { NSC_VIOLATION_CATALOG, violationDetailsData, parseCcmtaCode, NscAnalysis, type CvsaDefectRow, type CvsaRow } from './NscAnalysis';",
        "import { NSC_VIOLATION_CATALOG, violationDetailsData, parseCcmtaCode, NscAnalysis, type CvsaDefectRow, type CvsaRow } from './NscAnalysis';\nimport { BcCvsaPanel, BcAccidentPanel } from './BcPanels';"
    )

    if text.count("import { BcCvsaPanel") == 0:
        # Fallback if the user's import is different
        text = text.replace(
            "import { NscAnalysis } from './NscAnalysis';",
            "import { NscAnalysis } from './NscAnalysis';\nimport { BcCvsaPanel, BcAccidentPanel } from './BcPanels';"
        )


# 2. Add BcReportAccordionItem component at the end of the file or before default export
accordion_code = '''
function BcReportAccordionItem({ title, subtitle, badgeLabel, children, defaultOpen = false }: any) {
  const [isOpen, React_setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => React_setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left bg-white border-0 outline-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 normal-case tracking-normal font-normal truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
          {badgeLabel && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide bg-slate-100 text-slate-500">{badgeLabel}</span>
          )}
          <svg className={w-4 h-4 text-slate-400 transition-transform } viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-slate-200/80 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
'''
if 'BcReportAccordionItem' not in text:
    text = accordion_code + "\n" + text

# 3. Fix active fleet box styling so it fits seamlessly inside accordion
if 'function BcContraventionsAccordion()' in text:
    old_contra_regex = re.compile(r'function BcContraventionsAccordion\(\) \{.*?return \(\s*<div className="bg-white border.*?<button.*?<span.*?Total:.*?<\/span>.*?<\/button>.*?\{isOpen && \(\s*<div className="border-t border-slate-100">\s*', re.DOTALL)
    text = old_contra_regex.sub('''function BcContraventionsContent() {
  return (
    <div className="bg-slate-50/20 border-t-0 p-1">
      <div>
''', text)

    text = text.replace('''        </div>
      )}
    </div>
  );
}

function BcSnapshotHistory()''', '''        </div>
      </div>
    </div>
  );
}

function BcSnapshotHistory()''')


# 4. Find BC CARRIER PROFILE content manually to be safe
start_idx = text.find('{/* -- Snapshot History -- */}')
end_idx = text.find('})()}', start_idx)

if start_idx != -1 and end_idx != -1:
    old_block = text[start_idx:end_idx]
    
    new_block = '''{/* -- BC Report Formatted Data -- */}
                <div className="p-4 space-y-2">
                  <BcReportAccordionItem 
                    title="Carrier Information"
                    subtitle="Includes carrier demographics, safety rating, and summary of interventions"
                    badgeLabel="Profile"
                    defaultOpen={true}
                  >
                    <div className="border-t-0 p-4 bg-slate-50/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Carrier Details</div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Demographics</span><span className="text-xs text-slate-600">{bcProfile.address}, {bcProfile.city}</span></div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Business Type</span><span className="text-xs text-slate-600">{bcProfile.businessType}</span></div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Extra Provincial</span><span className="text-xs text-slate-600">{bcProfile.extraProvincial ? 'Yes' : 'No'}</span></div>
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Certificate</div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Status</span><span className="text-xs font-bold text-emerald-600">{bcProfile.certStatus}</span></div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Safety Rating</span><span className="text-xs font-bold text-slate-700">{bcProfile.safetyRating}</span></div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Profile Status</span><span className="text-xs font-bold text-emerald-600">{bcProfile.profileStatus}</span></div>
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stats</div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Fleet Size Avg</span><span className="text-xs font-mono text-slate-700">{bcProfile.avgFleetSize}</span></div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Licensed Veh</span><span className="text-xs font-mono text-slate-700">{bcProfile.licensedVehicles}</span></div>
                          <div className="flex gap-2 mb-1"><span className="text-xs font-semibold text-slate-800 w-24">Cert Issue</span><span className="text-xs text-slate-600">{bcProfile.certIssueDate}</span></div>
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Interventions</div>
                          {bcProfile.interventions.length > 0 ? (
                            bcProfile.interventions.map((inv, idx) => (
                              <div key={idx} className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-slate-700">{inv.type}</span>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">{inv.date}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-slate-500 italic">None reported</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="Profile Scores"
                    subtitle={Based on data as of }
                    badgeLabel="24 Months"
                  >
                    <div className="p-1 border-t-0 bg-slate-50/20">
                      <BcSnapshotHistory />
                    </div>
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="Active Fleet"
                    subtitle="Vehicles actively registered to this carrier"
                    badgeLabel="Fleet"
                  >
                    <div className="border-t-0 -mt-6">
                      <BcActiveFleetTable />
                    </div>
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="Contraventions"
                    subtitle="Driver and carrier contraventions (Guilty & Pending)"
                    badgeLabel="Tickets"
                  >
                    <BcContraventionsContent />
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="CVSA Inspection Results"
                    subtitle="Includes Out of Service, Requires Attention, and defects by category"
                    badgeLabel="CVSA"
                  >
                    <BcCvsaPanel />
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="Accident Information"
                    subtitle="Collision summary and active points"
                    badgeLabel="Collisions"
                  >
                    <BcAccidentPanel />
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="Audit Summary"
                    subtitle="Historical audit records and scores"
                    badgeLabel="Audit"
                  >
                    <div className="p-8 text-center bg-slate-50/30">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                        <FileText size={20} className="text-slate-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">Audit Summary Unavailable</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">This carrier currently has no audit summary data on file.</p>
                    </div>
                  </BcReportAccordionItem>

                  <BcReportAccordionItem 
                    title="CVIP Vehicle Inspection History"
                    subtitle="Commercial Vehicle Inspection Program history"
                    badgeLabel="CVIP"
                  >
                    <div className="p-8 text-center bg-slate-50/30">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                        <Wrench size={20} className="text-slate-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">CVIP History Unavailable</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">CVIP safety inspections are pending integration.</p>
                    </div>
                  </BcReportAccordionItem>
                </div>
            );\n          '''
    
    text = text[:start_idx] + new_target + text[end_idx:]

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("done regex replacement")
