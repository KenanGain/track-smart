import { useEffect, useState } from "react";

// Accessories hand-over catalog — the physical items (keys, devices, cards, PPE…)
// a new driver is issued during onboarding. Items are grouped into named
// **accessory checklists** that get attached to an onboarding workflow's
// Accessories step: staff hand each item over and check it off, then the driver
// verifies receipt.

export type AccessoryType = {
  id: string;
  name: string;
  category: string;
  note?: string;
};

// The master item catalog — used as the pick-list when building a checklist.
export const ACCESSORY_TYPES: AccessoryType[] = [
  // ── Keys & Access ──────────────────────────────────────────────
  { id: "truck_keys", name: "Truck Keys", category: "Keys & Access", note: "Ignition + cab keys" },
  { id: "trailer_keys", name: "Trailer / Padlock Keys", category: "Keys & Access", note: "Trailer door + padlock keys" },
  { id: "fuel_cap_key", name: "Fuel Cap Key", category: "Keys & Access" },
  { id: "key_fob", name: "Key Fob / Remote", category: "Keys & Access" },
  { id: "gate_access_card", name: "Yard / Gate Access Card", category: "Keys & Access" },

  // ── Devices & Electronics ──────────────────────────────────────
  { id: "eld_device", name: "ELD Device / Tablet", category: "Devices & Electronics", note: "Electronic logging device" },
  { id: "dashcam", name: "Dashcam", category: "Devices & Electronics" },
  { id: "gps_unit", name: "GPS / Telematics Unit", category: "Devices & Electronics" },
  { id: "temp_sensor", name: "Reefer Temperature Sensor", category: "Devices & Electronics" },
  { id: "tire_sensor", name: "Tire Pressure Sensor (TPMS)", category: "Devices & Electronics" },
  { id: "company_phone", name: "Company Phone", category: "Devices & Electronics" },

  // ── Cards & Documents ──────────────────────────────────────────
  { id: "fuel_card", name: "Fuel Card", category: "Cards & Documents" },
  { id: "toll_transponder", name: "Toll Transponder", category: "Cards & Documents" },
  { id: "insurance_card", name: "Insurance Card", category: "Cards & Documents" },
  { id: "registration_docs", name: "Vehicle Registration & Permits", category: "Cards & Documents" },
  { id: "ifta_docs", name: "IFTA / IRP Documents", category: "Cards & Documents" },

  // ── Safety & PPE ───────────────────────────────────────────────
  { id: "hi_vis_vest", name: "Hi-Vis Safety Vest", category: "Safety & PPE" },
  { id: "hard_hat", name: "Hard Hat", category: "Safety & PPE" },
  { id: "safety_gloves", name: "Safety Gloves", category: "Safety & PPE" },
  { id: "safety_boots", name: "Safety Boots", category: "Safety & PPE" },
  { id: "first_aid_kit", name: "First-Aid Kit", category: "Safety & PPE" },
  { id: "fire_extinguisher", name: "Fire Extinguisher", category: "Safety & PPE" },

  // ── Equipment & Supplies ───────────────────────────────────────
  { id: "load_straps", name: "Load Straps / Chains", category: "Equipment & Supplies" },
  { id: "load_bars", name: "Load Bars", category: "Equipment & Supplies" },
  { id: "padlocks_seals", name: "Padlocks & Seals", category: "Equipment & Supplies" },
  { id: "uniform", name: "Company Uniform", category: "Equipment & Supplies" },
  { id: "winter_kit", name: "Winter Emergency Kit", category: "Equipment & Supplies" },
];

export const ACCESSORY_CATEGORIES = [
  "Keys & Access",
  "Devices & Electronics",
  "Cards & Documents",
  "Safety & PPE",
  "Equipment & Supplies",
];

export const getAccessoryType = (id: string) => ACCESSORY_TYPES.find((a) => a.id === id);

// ── Accessory checklists ─────────────────────────────────────────────────────
// A named set of accessory items, created & edited in Onboarding Setup and
// attached to a workflow's Accessories step. Items are self-contained (seeded
// from the catalog, but editable / extendable with custom items).
export type AccessoryChecklistItem = { id: string; name: string; category?: string; note?: string };
export type AccessoryChecklist = { id: string; name: string; description?: string; items: AccessoryChecklistItem[]; locked?: boolean };

// Build a checklist item from a catalog id.
const fromCatalog = (id: string): AccessoryChecklistItem => {
  const a = getAccessoryType(id);
  return a ? { id: a.id, name: a.name, category: a.category, note: a.note } : { id, name: id };
};

function seededChecklists(): AccessoryChecklist[] {
  return [
    {
      id: "acl-standard",
      name: "Standard Driver Kit",
      description: "Everyday items issued to a local / company driver.",
      locked: true,
      items: ["truck_keys", "fuel_card", "eld_device", "hi_vis_vest", "uniform"].map(fromCatalog),
    },
    {
      id: "acl-otr",
      name: "OTR / Long-Haul Kit",
      description: "Full kit for over-the-road drivers — keys, devices, securement & seasonal gear.",
      items: ["truck_keys", "trailer_keys", "fuel_card", "eld_device", "dashcam", "hi_vis_vest", "load_straps", "winter_kit", "uniform"].map(fromCatalog),
    },
    {
      id: "acl-cross",
      name: "Cross-Border Kit",
      description: "Owner-operator / cross-border items including toll & gate access.",
      items: ["truck_keys", "fuel_card", "toll_transponder", "eld_device", "dashcam", "gate_access_card"].map(fromCatalog),
    },
  ];
}

const ACL_KEY = "onb_accessory_checklists_v1";
const ACL_HIDE_KEY = "onb_accessory_checklists_hidden_v1";
const ACL_EVENT = "onb-accessory-checklists-change";

function loadStored(): AccessoryChecklist[] {
  try { const raw = localStorage.getItem(ACL_KEY); if (raw) return JSON.parse(raw) as AccessoryChecklist[]; } catch { /* ignore */ }
  return [];
}
function loadHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ACL_HIDE_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
function persistHidden(s: Set<string>) { try { localStorage.setItem(ACL_HIDE_KEY, JSON.stringify([...s])); } catch { /* ignore */ } }

// Full list = stored (user-created / edited) + seeded (stored copy overrides a
// seed of the same id; a deleted id is remembered so seeds stay removed).
function loadChecklists(): AccessoryChecklist[] {
  const hidden = loadHidden();
  const stored = loadStored().filter((c) => !hidden.has(c.id));
  const ids = new Set(stored.map((c) => c.id));
  const seeds = seededChecklists().filter((c) => !ids.has(c.id) && !hidden.has(c.id));
  return [...stored, ...seeds];
}
function persist(list: AccessoryChecklist[]) {
  localStorage.setItem(ACL_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(ACL_EVENT));
}

export function useAccessoryChecklists() {
  const [checklists, setChecklists] = useState<AccessoryChecklist[]>(loadChecklists);
  useEffect(() => {
    const h = () => setChecklists(loadChecklists());
    window.addEventListener(ACL_EVENT, h);
    return () => window.removeEventListener(ACL_EVENT, h);
  }, []);
  const save = (c: AccessoryChecklist) => {
    const cur = loadStored();
    const i = cur.findIndex((x) => x.id === c.id);
    persist(i >= 0 ? cur.map((x) => (x.id === c.id ? c : x)) : [...cur, c]);
  };
  const remove = (id: string) => {
    const hidden = loadHidden(); hidden.add(id); persistHidden(hidden);
    persist(loadStored().filter((x) => x.id !== id));
  };
  return { checklists, save, remove };
}

export function getAccessoryChecklist(id: string | null | undefined): AccessoryChecklist | undefined {
  if (!id) return undefined;
  return loadChecklists().find((c) => c.id === id);
}

export function blankAccessoryChecklist(): AccessoryChecklist {
  return { id: `acl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, name: "", description: "", items: [] };
}
