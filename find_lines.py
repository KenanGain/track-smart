import json

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
    lines = text.split('\n')

start_line = -1
end_line = -1

for i, line in enumerate(lines):
    if line.strip() == 'return (' and lines[i+1].strip() == '<div className="space-y-4">' and lines[i+2].strip() == '{/* -- Snapshot History -- */}':
        start_line = i + 1
    if start_line > 0 and i > start_line and line.strip() == '})()}':
        end_line = i + 1
        break

print(f"Start: {start_line}, End: {end_line}")
