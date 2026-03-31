import re

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure all the BcReportAccordionItem invocations actually have correct labels as requested by the user
titles = re.findall(r'title="([^"]+)"', text[text.find('{/* -- BC Report Formatted Data -- */}'):text.find(' {/* -- Main Tabs -- */}', text.find('{/* -- BC Report Formatted Data -- */}'))])
print("Titles found in BC Report section:")
for t in titles:
    print(t)
