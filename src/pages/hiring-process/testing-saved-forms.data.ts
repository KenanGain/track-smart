import { useCallback, useEffect, useState } from "react";

// Forms saved while testing (Settings → Hiring → Testing Forms). A "saved form" is a
// draft/submission captured from a testing preview so it can be reopened later. Stored
// in localStorage; the Saved forms tab lists them.
export type SavedTestForm = {
    id: string;
    formId: string;          // catalog id (e.g. "road-test", "employment-verification")
    label: string;           // human label shown in the list
    driverName: string;      // who the form was prefilled for
    examiner?: string;       // assigned examiner (road test)
    savedAt: number;
    status: "draft" | "submitted";
    values?: Record<string, unknown>;
};

const KEY = "hp_testing_saved_forms_v1";

function read(): SavedTestForm[] {
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as SavedTestForm[]) : [];
    } catch { return []; }
}
function write(list: SavedTestForm[]) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("hp-testing-saved-forms-updated"));
    } catch { /* ignore */ }
}

export function useSavedTestForms() {
    const [saved, setSaved] = useState<SavedTestForm[]>(() => read());

    useEffect(() => {
        const onUpdate = () => setSaved(read());
        window.addEventListener("hp-testing-saved-forms-updated", onUpdate);
        return () => window.removeEventListener("hp-testing-saved-forms-updated", onUpdate);
    }, []);

    // Upsert by (formId + driverName) so re-saving the same test form updates the entry.
    const save = useCallback((entry: Omit<SavedTestForm, "id" | "savedAt"> & { savedAt?: number }) => {
        const list = read();
        const at = entry.savedAt ?? Date.now();
        const matchIdx = list.findIndex((s) => s.formId === entry.formId && s.driverName === entry.driverName);
        const next: SavedTestForm = { id: matchIdx >= 0 ? list[matchIdx].id : `sf-${at}`, savedAt: at, ...entry };
        if (matchIdx >= 0) list[matchIdx] = next; else list.unshift(next);
        write(list);
    }, []);

    const remove = useCallback((id: string) => write(read().filter((s) => s.id !== id)), []);

    return { saved, save, remove };
}
