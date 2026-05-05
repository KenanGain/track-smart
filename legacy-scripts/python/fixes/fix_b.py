import re
with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace activeMainTab return block entirely using regex block extraction
match = re.search(r'return \(\s*<div className="space-y-4">.*?</div>\s*\);\s*}\)\(\)}', text, re.DOTALL)
if match:
    # Build the new block
    # Note we use backticks or multiline strings in python safely
    new_block = '''return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 mt-6">
                {/* -- Header -- */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-blue-700"/>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                       NSC Analysis
                       <span className="text-[10px] bg-blue-100/60 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg uppercase tracking-wider font-bold">NSC BC</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Updated {bcProfile.scoresAsOf}</div>
                    <button onClick={() => setShowAbUploadModal(true)} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                      <Upload size={14} className="text-slate-400" /> Upload Profile
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4 bg-slate-50/30">
                  
                  {/* SECTION 1 */}
                  <BcReportAccordionItem 
                    title="Section 1 - Carrier Information"
                    subtitle="Demographics, contact info, and registration details"
                    rightElement={<span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md uppercase font-bold tracking-wider">{bcProfile.profileStatus}</span>}
                    defaultOpen={true}
                  >
                    <div className="divide-y divide-slate-100">
                      <div className="px-6 py-6 grid grid-cols-2 gap-10">
                        {/* LEFT: Demographic Information */}
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Demographic Information</div>
                          <div className="space-y-3">
                            {[
                              ['Jurisdiction',          bcProfile.jurisdiction],
                              ['Business Type',         bcProfile.businessType],
                              ['Certificate Issue Date', bcProfile.certIssueDate],
                              ['Address',               ${bcProfile.address}, ],
                              ['Licensed Vehicles',     String(bcProfile.licensedVehicles)],
                            ].map(([label, val]) => (
                              <div key={label} className="flex items-start justify-between gap-4">
                                <span className="text-[13px] text-slate-500 shrink-0">{label}</span>
                                <span className="text-[13px] font-bold text-slate-800 text-right">{val}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            {[
                              { label: 'Extra-Provincial',   val: bcProfile.extraProvincial },
                              { label: 'Premium Carrier',    val: bcProfile.premiumCarrier },
                              { label: 'Weigh2GoBC',         val: bcProfile.weigh2GoBC },
                              { label: 'Prev. Maintenance',  val: bcProfile.preventativeMaintenance },
                            ].map(({ label, val }) => (
                              <div key={label} className={ounded-xl border px-3 py-3 flex items-center justify-between }>
                                <div className="text-[11px] font-bold text-slate-600">{label}</div>
                                <div className={	ext-[11px] font-bold }>{val ? 'YES' : 'NO'}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* RIGHT: Certificate Information + Interventions */}
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Certificate Information</div>
                          <div className="space-y-3">
                            {[
                              { label: 'Certificate Status', val: bcProfile.certStatus,    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                              { label: 'Safety Rating',      val: bcProfile.safetyRating,  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                              { label: 'Profile Status',     val: bcProfile.profileStatus, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                              { label: 'Audit Status',       val: bcProfile.auditStatus,   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
                            ].map(({ label, val, cls }) => (
                              <div key={label} className="flex items-center justify-between gap-4">
                                <span className="text-[13px] text-slate-500">{label}</span>
                                <span className={px-2 py-0.5 text-[11px] font-bold rounded border }>{val}</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 pt-5 border-t border-slate-100">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">NSC Interventions · Past 25 Months</div>
                            {bcProfile.interventions.length > 0 ? bcProfile.interventions.map((iv, i) => (
                              <div key={i} className="flex items-center justify-between bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200"><AlertTriangle size={14} className="text-amber-600 shrink-0"/></div>
                                  <span className="text-[13px] font-bold text-amber-900">{iv.type}</span>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded">{iv.date}</span>
                              </div>
                            )) : (
                              <div className="text-[13px] text-slate-400 italic bg-slate-50 rounded-xl px-4 py-4 border border-slate-200/60">No interventions on record.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </BcReportAccordionItem>

                  {/* SECTION 2 */}
                  <BcReportAccordionItem 
                    title="Section 2 - Profile Scores"
                    subtitle={As of  | Rolling 24-month profile monitoring}
                    rightElement={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Total Score <span className="text-[13px] font-black font-mono text-slate-800 ml-1">{bcProfile.scores.total.toFixed(2)}</span></span>}
                  >
                     <div className="p-6 space-y-8 bg-slate-50/30">
                        <BcSnapshotHistory />
                     </div>
                  </BcReportAccordionItem>

                  {/* SECTION 3 */}
                  <BcReportAccordionItem 
                    title="Section 3 - Active Fleet from 17-Apr-2023 to 17-Apr-2025"
                    subtitle="Vehicles insured under this carrier's certificates"
                    rightElement={<span className="text-[10px] px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-md uppercase tracking-wider">{bcProfile.licensedVehicles} Vehicles</span>}
                  >
                    <div className="border-t-0 -mt-6">
                      <BcActiveFleetTable />
                    </div>
                  </BcReportAccordionItem>

                  {/* SECTION 4 */}
                  <BcReportAccordionItem 
                    title="Section 4 - Contraventions"
                    subtitle="Summary & Ticket Details (Guilty & Pending)"
                    rightElement={<span className="text-[10px] px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 font-bold rounded-md uppercase tracking-wider">11 Violations</span>}
                  >
                     <div className="bg-slate-50/30 -mt-6 border-t-0 p-1">
                        <BcContraventionsContent />
                     </div>
                  </BcReportAccordionItem>

                  {/* SECTION 5 */}
                  <BcReportAccordionItem title="Section 5 - CVSA Inspection Results" subtitle="Driver, Vehicle and Cargo inspection history" rightElement={<span className="text-[10px] px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-md uppercase tracking-wider">43 Inspections</span>}>
                     <div className="p-6 text-sm text-slate-500 italic bg-slate-50/50 border-t border-slate-100">CVSA Inspector Data details pending complete import.</div>
                  </BcReportAccordionItem>
                  {/* SECTION 6 */}
                  <BcReportAccordionItem title="Section 6 - Accident Information" subtitle="Reportable Collisions and incidents" rightElement={<span className="text-[10px] px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 font-bold rounded-md uppercase tracking-wider">0 Events</span>}>
                     <div className="p-6 text-sm text-slate-500 italic bg-slate-50/50 border-t border-slate-100">Accident Records pending.</div>
                  </BcReportAccordionItem>
                  {/* SECTION 7 */}
                  <BcReportAccordionItem title="Section 7 - Audit Summary" subtitle="NSC audit results and interventions" rightElement={<span className="text-[10px] px-2.5 py-1 text-slate-400 font-bold uppercase tracking-wider">Unaudited</span>}>
                     <div className="p-6 text-sm text-slate-500 italic bg-slate-50/50 border-t border-slate-100">Audit details pending.</div>
                  </BcReportAccordionItem>
                  {/* SECTION 8 */}
                  <BcReportAccordionItem title="Section 8 - CVIP Vehicle Inspection History" subtitle="Commercial Vehicle Inspection Program records" rightElement={<span className="text-[10px] px-2.5 py-1 text-slate-400 font-bold uppercase tracking-wider">0 Records</span>}>
                     <div className="p-6 text-sm text-slate-500 italic bg-slate-50/50 border-t border-slate-100">CVIP records pending.</div>
                  </BcReportAccordionItem>

                </div>
              </div>
            );
          })()}'''

    text = text[:match.start()] + new_block + text[match.end():]

# Now insert BcReportAccordionItem component before {/* -- BC CARRIER PROFILE CONTENT -- */}
accordion_component = '''function BcReportAccordionItem({ title, subtitle, rightElement, children, defaultOpen = false }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={order rounded-xl transition-colors duration-200 overflow-hidden }>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full px-5 py-4 flex items-center justify-between outline-none bg-white hover:bg-slate-50 transition-colors border-none text-left focus:outline-none focus:ring-0">
        <div className="text-left flex-1">
          <div className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-4 ml-4 shrink-0">
          {rightElement}
          <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/80">
            <svg className={	ransition-transform duration-200 text-slate-400 } width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
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
text = text.replace('{/* -- BC CARRIER PROFILE CONTENT -- */}', accordion_component + '{/* -- BC CARRIER PROFILE CONTENT -- */}')

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("done regex replacement")
