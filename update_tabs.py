import os

path = r"c:\Users\kenan\Full prototpye code\src\pages\inspections\InspectionsPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_tabs = """              { id: 'carrier-profile-ab' as const, label: 'Carrier Profile (NSC Alberta)' },
              { id: 'carrier-profile-bc' as const, label: 'Carrier Profile (NSC BC)' },
            ].map(tab => ("""

new_tabs = """              { id: 'carrier-profile-ab' as const, label: 'Carrier Profile (NSC Alberta)' },
              { id: 'carrier-profile-bc' as const, label: 'Carrier Profile (NSC BC)' },
              { id: 'carrier-profile-pe' as const, label: 'Carrier Profile ( nsc prince edward island )' },
              { id: 'carrier-profile-ns' as const, label: 'Carrier Profile ( nsc nova scotia )' },
            ].map(tab => ("""

content = content.replace(old_tabs, new_tabs)

old_end = """        </div>
      )}

      {/* ===== UPLOAD MODAL ===== */}"""

new_end = """        </div>
      )}

      {/* ===== TAB: CARRIER PROFILE (NSC PE) ===== */}
      {activeMainTab === 'carrier-profile-pe' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Prince Edward Island Carrier Profile</h2>
            <p className="text-slate-500">This page is currently blank. Content for Prince Edward Island profile will be added here.</p>
          </div>
        </div>
      )}

      {/* ===== TAB: CARRIER PROFILE (NSC NS) ===== */}
      {activeMainTab === 'carrier-profile-ns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nova Scotia Carrier Profile</h2>
            <p className="text-slate-500">This page is currently blank. Content for Nova Scotia profile will be added here.</p>
          </div>
        </div>
      )}

      {/* ===== UPLOAD MODAL ===== */}"""

content = content.replace(old_end, new_end)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacement Complete")
