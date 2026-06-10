import { useEffect, useState } from "react";

// ── Hiring checklists ────────────────────────────────────────────────────────
// A checklist is a staged approval document attached to a template; it becomes
// the Review & Completion step (header fields → stages w/ items + signature →
// footer fields). Stored in localStorage with one seeded default.

export type ChecklistFieldType = "text" | "phone" | "date";
export type ChecklistField = { id: string; label: string; type: ChecklistFieldType };
export type ChecklistItem = { id: string; text: string };
export type ChecklistStage = { id: string; title: string; items: ChecklistItem[]; signature: boolean };
export type Checklist = {
    id: string; name: string; description?: string; note?: string; locked?: boolean;
    headerFields: ChecklistField[];
    stages: ChecklistStage[];
    footerFields: ChecklistField[];
};

// Per-applicant fill state for a checklist.
export type ChecklistState = { fields?: Record<string, string>; items?: Record<string, boolean>; sigs?: Record<string, string> };

const NOTE = "All drivers must be approved by a supervisor before hitting the road on any {{company}} equipment. If a supervisor has not signed the approval for all 3 stages, do not dispatch the driver.";
const header = (p: string): ChecklistField[] => [
    { id: `${p}-name`, label: "Driver Name", type: "text" },
    { id: `${p}-phone`, label: "Driver Phone #", type: "phone" },
    { id: `${p}-ref`, label: "Reference By", type: "text" },
];
const footer = (p: string): ChecklistField[] => [{ id: `${p}-cc`, label: "Driver CC#", type: "text" }];
const stage = (p: string, n: number, title: string, items: string[]): ChecklistStage => ({ id: `${p}-s${n}`, title, signature: true, items: items.map((t, i) => ({ id: `${p}-s${n}-i${i}`, text: t })) });

// A staged approval checklist tailored to a driver type.
const mk = (id: string, name: string, description: string, stage1Review: string, withPsp: boolean, withCvor: boolean): Checklist => ({
    id, name, description, note: NOTE, locked: true,
    headerFields: header(id),
    stages: [
        stage(id, 1, "Stage 1 — Review & Screening", [
            stage1Review,
            "Started application on Truckright",
            "Primarily had discussions on which lane the driver wants to drive",
            ...(withCvor ? ["Confirmed CVOR / Driver Abstract pulled and reviewed"] : []),
        ]),
        stage(id, 2, "Stage 2 — Interview & Road Test", [
            "Driver is interviewed in detail to make sure the driver understands the pay structures, the routes, the type of trucks and the work environment",
            "Schedule a road test with one of the approved examiners",
            "After the road test is passed — review the road test results; if passed, complete the Truckright application / CarriersEdge training / drug test, send reference checks and schedule the driver for the next orientation",
            ...(withPsp ? ["PSP check (USA driving experience)"] : []),
        ]),
        stage(id, 3, "Stage 3 — Onboarding & CC#", [
            "After CarriersEdge training done, road test passed, Truckright profile fully completed, drug test results good, and orientation complete — Safety team will assign a CC#",
            "Driver added in: Samsara, Transplus, active driver list (Google Sheet)",
        ]),
    ],
    footerFields: footer(id),
});

const DEFAULTS: Checklist[] = [
    mk("cl-us", "US Driver Approval", "3-stage approval for interstate US drivers (PSP).", "Reviewed MVR / PSP / Experience / Attitude", true, false),
    mk("cl-canada", "Canada Driver Approval", "3-stage approval for Canadian drivers (CVOR / Abstract).", "Reviewed CVOR / Abstract / Experience / Attitude", false, true),
    mk("cl-local", "Local / Domestic Approval", "3-stage approval for local / domestic CDL hires.", "Reviewed MVR / Abstract / Experience / Attitude", false, false),
    mk("cl-cross", "Cross-Border Approval", "3-stage approval for cross-border drivers (PSP + CVOR).", "Reviewed CVOR / MVR / PSP / Experience / Attitude", true, true),
];

// Default checklist id for a driver type.
export const checklistForDriverType: Record<string, string> = { us: "cl-us", canada: "cl-canada", local: "cl-local", "cross-border": "cl-cross" };

export const checklistName = (id?: string) => DEFAULTS.concat(loadCustoms()).find((c) => c.id === id)?.name ?? "—";
export function totalChecklistItems(c: Checklist): number { return c.stages.reduce((n, s) => n + s.items.length, 0); }

const KEY = "hp_checklists_v1";
const EVENT = "hp-checklists-change";

function loadCustoms(): Checklist[] {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Checklist[]; } catch { /* ignore */ }
    return [];
}
function load(): Checklist[] {
    const customs = loadCustoms().filter((c) => !DEFAULTS.some((d) => d.id === c.id));
    return [...DEFAULTS, ...customs];
}
function persist(list: Checklist[]) {
    const customs = list.filter((c) => !c.locked && !DEFAULTS.some((d) => d.id === c.id));
    localStorage.setItem(KEY, JSON.stringify(customs));
    window.dispatchEvent(new CustomEvent(EVENT));
}

export function getChecklist(id?: string): Checklist | undefined { return load().find((c) => c.id === id); }

export function useChecklists() {
    const [checklists, setChecklists] = useState<Checklist[]>(load);
    useEffect(() => {
        const h = () => setChecklists(load());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);
    const save = (c: Checklist) => { const cur = load(); const idx = cur.findIndex((x) => x.id === c.id); persist(idx >= 0 ? cur.map((x) => (x.id === c.id ? c : x)) : [...cur, c]); };
    const remove = (id: string) => persist(load().filter((x) => x.id !== id));
    return { checklists, save, remove };
}
