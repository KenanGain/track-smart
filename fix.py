import sys

with open('src/pages/profile/DriverProfileView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Accidents Tab
acc_start = text.find("{/* ACCIDENTS TAB */}")
acc_end = text.find("{/* ACCIDENT DETAIL POPUP */}")

# 2. Inspections Tab
ins_start = text.find("{/* INSPECTIONS TAB */}")
ins_end = text.find("{/* VIOLATIONS TAB */}")

# 3. Violations Tab
viol_start = text.find("{/* VIOLATIONS TAB */}")
viol_end = text.find("{['Training', 'Certificates', 'Trips', 'Tickets', 'Safety', 'HoursOfService', 'MileageReport'].includes(activeTab) && (() => {")

acc_text = text[acc_start:acc_end]
ins_text = text[ins_start:ins_end]
viol_text = text[viol_start:viol_end]

# What to replace them with
acc_replacement = """{/* ACCIDENTS TAB */}
            {activeTab === 'Accidents' && <AccidentsTab driverData={driverData} viewingAccident={viewingAccident} setViewingAccident={setViewingAccident} editingAccident={editingAccident} setEditingAccident={setEditingAccident} />}
"""

ins_replacement = """{/* INSPECTIONS TAB */}
            {activeTab === 'Inspections' && <InspectionsTab driverData={driverData} />}
"""

viol_replacement = """{/* VIOLATIONS TAB */}
            {activeTab === 'Violations' && <ViolationsTab driverData={driverData} />}
"""

# The extracted code should be transformed into components
acc_comp = """
export const AccidentsTab = ({ driverData, viewingAccident, setViewingAccident, editingAccident, setEditingAccident }: any) => {
""" + acc_text.split("(() => {", 1)[1].rsplit("})()", 1)[0] + """
};
"""

ins_comp = """
export const InspectionsTab = ({ driverData }: any) => {
""" + ins_text.split("(() => {", 1)[1].rsplit("})()", 1)[0] + """
};
"""

viol_comp = """
export const ViolationsTab = ({ driverData }: any) => {
""" + viol_text.split("(() => {", 1)[1].rsplit("})()", 1)[0] + """
};
"""

# Replace in text
text = text.replace(acc_text, acc_replacement)
text = text.replace(ins_text, ins_replacement)
text = text.replace(viol_text, viol_replacement)

# Remove the duplicate Violations block
dup_viol_start = text.find("{activeTab === 'Violations' && (\\n              <div className=\\"space-y-6", viol_end)
dup_viol_end = text.find("</div>\\n            )}\\n        </div>", dup_viol_start)
if dup_viol_start != -1 and dup_viol_end != -1:
    text = text[:dup_viol_start] + text[dup_viol_end:]

# Add components at the end
text += acc_comp + ins_comp + viol_comp

with open('src/pages/profile/DriverProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done')
