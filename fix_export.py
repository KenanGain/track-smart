import re
with open('src/pages/inspections/NscAnalysis.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Export the data arrays
text = text.replace('const collisionData:', 'export const collisionData:')
text = text.replace('const collisionSummaryData:', 'export const collisionSummaryData:')
text = text.replace('const cvsaSummaryData:', 'export const cvsaSummaryData:')

with open('src/pages/inspections/NscAnalysis.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
