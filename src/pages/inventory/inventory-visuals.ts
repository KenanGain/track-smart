// ─────────────────────────────────────────────────────────────────────────────
// What each category LOOKS like — one icon and one palette per kind of thing.
//
// Lived inside InventoryListPage, which was fine until a second list needed it: the
// give-out picker shows the same items and has to draw them the same way, and it cannot
// import a page to find that out. A key is a key whichever list it is in.
// ─────────────────────────────────────────────────────────────────────────────

import type { ElementType } from "react";
import {
    Fuel, Radio, Activity, Map as MapIcon, Camera, Wrench, Layers,
    KeyRound, ShieldCheck, Package, Cpu, CreditCard,
} from "lucide-react";

export type CategoryVisual = {
    icon: ElementType;
    bg: string;
    text: string;
    bar: string;
    avatarBg: string;
    avatarText: string;
};

export const CATEGORY_VISUAL: Record<string, CategoryVisual> = {
    "cat-fuel-card":          { icon: Fuel,     bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   avatarBg: "bg-amber-100",   avatarText: "text-amber-800"   },
    "cat-transponder":        { icon: Radio,    bg: "bg-violet-50",  text: "text-violet-700",  bar: "bg-violet-500",  avatarBg: "bg-violet-100",  avatarText: "text-violet-800"  },
    "cat-eld-provider":       { icon: Activity, bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500",    avatarBg: "bg-blue-100",    avatarText: "text-blue-800"    },
    "cat-gps-tracking":       { icon: MapIcon,  bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", avatarBg: "bg-emerald-100", avatarText: "text-emerald-800" },
    "cat-dashcam":            { icon: Camera,   bg: "bg-cyan-50",    text: "text-cyan-700",    bar: "bg-cyan-500",    avatarBg: "bg-cyan-100",    avatarText: "text-cyan-800"    },
    "cat-repair-maintenance": { icon: Wrench,   bg: "bg-slate-100",  text: "text-slate-700",   bar: "bg-slate-500",   avatarBg: "bg-slate-200",   avatarText: "text-slate-800"   },
    "cat-keys":               { icon: KeyRound,    bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   avatarBg: "bg-amber-100",   avatarText: "text-amber-800"   },
    "cat-safety-ppe":         { icon: ShieldCheck, bg: "bg-rose-50",    text: "text-rose-700",    bar: "bg-rose-500",    avatarBg: "bg-rose-100",    avatarText: "text-rose-800"    },
    "cat-equipment":          { icon: Package,     bg: "bg-teal-50",    text: "text-teal-700",    bar: "bg-teal-500",    avatarBg: "bg-teal-100",    avatarText: "text-teal-800"    },
    "cat-devices":            { icon: Cpu,         bg: "bg-sky-50",     text: "text-sky-700",     bar: "bg-sky-500",     avatarBg: "bg-sky-100",     avatarText: "text-sky-800"     },
    "cat-cards-docs":         { icon: CreditCard,  bg: "bg-violet-50",  text: "text-violet-700",  bar: "bg-violet-500",  avatarBg: "bg-violet-100",  avatarText: "text-violet-800"  },
};

export const DEFAULT_VISUAL: CategoryVisual = {
    icon: Layers, bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-400",
    avatarBg: "bg-slate-200", avatarText: "text-slate-800",
};

export const visualFor = (categoryId: string): CategoryVisual => CATEGORY_VISUAL[categoryId] ?? DEFAULT_VISUAL;
