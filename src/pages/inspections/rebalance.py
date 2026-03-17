import re

def rebalance_columns(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the grid
    start_token = '<div className="grid grid-cols-1 xl:grid-cols-12 gap-4">'
    start_idx = content.find(start_token)
    if start_idx == -1:
        print("Could not find start token")
        return

    # Find the end of this grid by finding `<NscAnalysis />`
    end_token = '<NscAnalysis />'
    end_idx = content.find(end_token, start_idx)
    if end_idx == -1:
        print("Could not find end token")
        return

    grid_content = content[start_idx:end_idx]

    # We know the specific components inside.
    # We want to extract them.
    # 1. Carrier Identity
    ci_match = re.search(r'(<div className="bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">.*?<Building size=\{14\} className="text-blue-500" />\s*<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Carrier Identity</h3>.*?</div>\s*</div>)', grid_content, re.DOTALL)
    ci_text = ci_match.group(1)

    # 2. OOS Rate Summary
    oosrs_match = re.search(r'(<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">\s*<div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">\s*<ShieldAlert size=\{14\} className="text-slate-500" />\s*<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">OOS Rate Summary</h3>.*?</div>\s*</div>\s*</div>)', grid_content, re.DOTALL)
    oosrs_text = oosrs_match.group(1)

    # 3. Safety Rating OOS Card
    sroos_match = re.search(r'(<SafetyRatingOosCard\s*currentRating="Conditional".*?/>)', grid_content, re.DOTALL)
    sroos_text = sroos_match.group(1)

    # 4. Safety Fitness Certificate
    sfc_match = re.search(r'(<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">\s*<div className="flex items-center gap-2 mb-4">\s*<ShieldAlert size=\{14\} className="text-amber-500" />\s*<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Safety Fitness Certificate</h3>.*?</div>\s*</div>)', grid_content, re.DOTALL)
    sfc_text = sfc_match.group(1)

    # 5. Risk Factor
    rf_match = re.search(r'(<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">\s*<div className="mb-4">\s*<div className="flex items-center gap-2">\s*<Activity size=\{14\} className="text-emerald-500" />\s*<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-emerald-800">Risk Factor</h3>.*?</div>\s*</div>)', grid_content, re.DOTALL)
    rf_text = rf_match.group(1)

    # 6. Monitoring / Intervention
    mi_match = re.search(r'(<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">\s*<div className="flex items-center gap-2 mb-4">\s*<Target size=\{14\} className="text-indigo-500" />\s*<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Monitoring / Intervention</h3>.*?</div>\s*</div>)', grid_content, re.DOTALL)
    mi_text = mi_match.group(1)

    # 7. Fleet Size & Exposure
    fse_match = re.search(r'(<div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">\s*<div className="flex items-center gap-2 mb-4">\s*<Truck size=\{14\} className="text-blue-500" />\s*<h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fleet Size &amp; Exposure</h3>.*?</div>\s*</div>)', grid_content, re.DOTALL)
    fse_text = fse_match.group(1)

    # Reconstruct
    new_grid = f'''<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
{ci_text}
{sfc_text}
{fse_text}
            </div>

            <div className="space-y-4">
{sroos_text}
{oosrs_text}
{rf_text}
{mi_text}
            </div>
          </div>
          '''

    new_content = content[:start_idx] + new_grid + content[end_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("Success")

rebalance_columns('src/pages/inspections/InspectionsPage.tsx')
