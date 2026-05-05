import sys

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = "          {activeMainTab === 'carrier-profile-bc' && ("
start_idx = text.find(start_marker)

if start_idx == -1:
    print("Could not find start marker")
    sys.exit(1)

# Find the end of this block
end_idx = text.find("          )}\n\n          {/* -- BC CARRIER PROFILE CONTENT -- */}", start_idx)
if end_idx == -1:
    end_idx = text.find("          )}\n", start_idx) + sum([1 for _ in range(13)]) # fallback

old_block = text[start_idx:end_idx]

new_block = '''          {activeMainTab === 'carrier-profile-bc' && (
            <div className="space-y-2">
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
                defaultOpen={true}
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
                <div className="border-t-0 p-2 bg-slate-50/20">
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
                subtitle="Inspection defect summary plus detailed BC CVSA inspection results."
                badgeLabel="CVSA"
              >
                <div className="border-t-0 p-1 bg-slate-50/20">
                  <BcCvsaPanel />
                </div>
              </BcReportAccordionItem>

              <BcReportAccordionItem
                title="ACCIDENT INFORMATION"
                subtitle="Collision summary and event-level accident details from the loaded NSC dataset."
                badgeLabel="Collisions"
              >
                <div className="border-t-0 p-1 bg-slate-50/20">
                  <BcAccidentPanel />
                </div>
              </BcReportAccordionItem>

              <BcReportAccordionItem
                title="AUDIT SUMMARY"
                subtitle="Audit posture, intervention trigger history, and current BC safety standing."
                badgeLabel="Audit"
              >
                <div className="border-t-0 p-1 bg-slate-50/20">
                  <BcAuditSummaryPanel />
                </div>
              </BcReportAccordionItem>

              <BcReportAccordionItem
                title="CVIP VEHICLE INSPECTION HISTORY"
                subtitle="Periodic inspection history placeholder tied to the loaded BC active-fleet records."
                badgeLabel="CVIP"
              >
                <div className="border-t-0 p-1 bg-slate-50/20">
                  <BcCvipHistoryPanel />
                </div>
              </BcReportAccordionItem>
            </div>'''

text = text.replace(old_block, new_block)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("BC CARRIER PROFILE UI updated successfully!")
