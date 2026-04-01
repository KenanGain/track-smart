import os

path = r"c:\Users\kenan\Full prototpye code\src\pages\inspections\InspectionsPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_state = "useState<'overview' | 'sms' | 'cvor' | 'carrier-profile-ab' | 'carrier-profile-bc'>('overview');"
new_state = "useState<'overview' | 'sms' | 'cvor' | 'carrier-profile-ab' | 'carrier-profile-bc' | 'carrier-profile-pe' | 'carrier-profile-ns'>('overview');"

content = content.replace(old_state, new_state)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacement Complete")
