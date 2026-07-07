import { useEffect, useState } from "react";

// ── Account (carrier profile) signature on file ─────────────────────────────
// Each carrier account can save one signature. Once saved it can be dragged
// straight onto a document in the template builder as an already-applied stamp
// (no need for the driver to sign the company's part).
// localStorage-backed (prototype); the signature is held as a PNG data URL.

const KEY = "carrier_signatures_v1";
const EVENT = "carrier-signatures-change";

type Store = Record<string, string>;   // carrierId → signature data URL

function load(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}
function persist(store: Store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota — prototype only */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

// A stable fallback bucket when no carrier is in scope, so the builder still works.
const keyFor = (carrierId?: string) => carrierId || "__default__";

export function getCarrierSignature(carrierId?: string): string | null {
    return load()[keyFor(carrierId)] ?? null;
}

export function useCarrierSignature(carrierId?: string) {
    const [signature, setSignature] = useState<string | null>(() => getCarrierSignature(carrierId));
    useEffect(() => {
        const h = () => setSignature(getCarrierSignature(carrierId));
        h();
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, [carrierId]);

    const save = (dataUrl: string) => {
        const store = load();
        store[keyFor(carrierId)] = dataUrl;
        persist(store);
    };
    const clear = () => {
        const store = load();
        delete store[keyFor(carrierId)];
        persist(store);
    };
    return { signature, save, clear };
}
