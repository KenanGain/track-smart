import sys

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = "          {/* -- BC CARRIER PROFILE CONTENT -- */}"
if start_marker not in text:
    print("Could not find BC CARRIER PROFILE CONTENT block")
    sys.exit(1)

start_idx = text.find(start_marker)
end_idx = text.find("})()}", start_idx)

if end_idx == -1:
    print("Could not find end of BC CARRIER PROFILE CONTENT")
    sys.exit(1)

new_content = '''          {/* -- BC CARRIER PROFILE CONTENT -- */}
          {activeMainTab === 'carrier-profile-bc' && (() => {
            return (
              <div className="space-y-2 max-w-[1200px]">
                {/* -- BC Report Formatted Data Accordion Styled like NSC Alberta -- */}
                <BcReportAccordionItem 
                  title="CARRIER INFORMATION"
                  subtitle="Carrier profile, certificate status, safety rating, and BC compliance identifiers."
                  badgeLabel="Profile"
                  defaultOpen={true}
                >
                  <div className="border-t-0 p-4 bg-slate-50/20">
                    <NscBcCarrierProfile {...INERTIA_CARRIER_BC_DATA} />
                  </div>
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="PROFILE SCORES AS OF MAR 2025"
                  subtitle={24 month snapshot history ending .}
                  badgeLabel="24 Months"
                >
                  <div className="p-1 border-t-0 bg-slate-50/20">
                    <BcSnapshotHistory />
                  </div>
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="ACTIVE FLEET"
                  subtitle="Vehicles actively registered to this carrier"
                  badgeLabel="Fleet"
                >
                  <div className="border-t-0 -mt-6">
                    <BcActiveFleetTable />
                  </div>
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="CONTRAVENTIONS"
                  subtitle="Driver and carrier contraventions (Guilty & Pending)"
                  badgeLabel="4 Subsections"
                >
                  <BcContraventionsContent />
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="CVSA INSPECTION RESULTS"
                  subtitle="Includes Out of Service, Requires Attention, and defects by category"
                  badgeLabel="CVSA"
                >
                  <BcCvsaPanel />
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="ACCIDENT INFORMATION"
                  subtitle="Collision summary and active points"
                  badgeLabel="Collisions"
                >
                  <BcAccidentPanel />
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="AUDIT SUMMARY"
                  subtitle="Historical audit records and scores"
                  badgeLabel="Audit"
                >
                  <div className="p-8 text-center bg-slate-50/30">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                      <FileText size={20} className="text-slate-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700 mb-1">Audit Summary Unavailable</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">This carrier currently has no audit summary data on file or details are pending integration.</p>
                  </div>
                </BcReportAccordionItem>

                <BcReportAccordionItem 
                  title="CVIP VEHICLE INSPECTION HISTORY"
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
            );
          '''

text = text[:start_idx] + new_content + text[end_idx:]

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("BC CARRIER PROFILE successfully replaced!")
