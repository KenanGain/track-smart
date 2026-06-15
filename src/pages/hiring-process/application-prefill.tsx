import { createContext, useContext } from "react";
import type { Applicant, SubSection, SubGroup } from "./applicants.data";

// Normalized data captured in the driver's application, reused to pre-fill the
// downstream hiring forms (driver name, licence, address, employment, …).

export type PrefillLicense = { number: string; cls: string; authority: string; issue: string; exp: string; cdl: string; endorsements: string; country?: string };
export type PrefillEmployer = { employer: string; position: string; dates: string; from: string; to: string; reason: string };
export type PrefillUnemployment = { dates: string; from: string; to: string; comments: string };
export type PrefillAddress = { street: string; city: string; state: string; zip: string; country: string; full: string };

export type ApplicantPrefill = {
    firstName: string; lastName: string; fullName: string;
    email: string; phone: string; dob: string; ssn: string; twic: string;
    position: string; country: string;
    address: PrefillAddress;
    licenses: PrefillLicense[];
    employment: PrefillEmployer[];
    unemployment: PrefillUnemployment[];
};

// Split a "MM-YYYY - MM-YYYY" (or "YYYY - YYYY") dates string into from / to.
// Separator is a hyphen surrounded by spaces, so internal "MM-YYYY" hyphens stay intact.
const splitDates = (s: string): { from: string; to: string } => {
    const parts = (s || "").split(/\s+[–-]\s+/).map((x) => x.trim());
    if (parts.length >= 2) return { from: parts[0], to: parts.slice(1).join(" - ") };
    return { from: s || "", to: "" };
};

const Ctx = createContext<ApplicantPrefill | null>(null);
export const PrefillProvider = Ctx.Provider;
export const usePrefill = () => useContext(Ctx);

// ── helpers ─────────────────────────────────────────────────────────────────
const fieldIn = (g: SubGroup, ...needles: string[]) => {
    for (const f of g.fields) {
        const l = f.label.toLowerCase();
        if (needles.some((n) => l.includes(n))) return f.value;
    }
    return "";
};
const section = (sub: SubSection[] | undefined, title: string) => sub?.find((s) => s.title === title);
const firstGroup = (sub: SubSection[] | undefined, title: string): SubGroup | undefined => section(sub, title)?.groups[0];
const val = (sub: SubSection[] | undefined, title: string, ...needles: string[]) => {
    const g = firstGroup(sub, title);
    return g ? fieldIn(g, ...needles) : "";
};

export function buildPrefill(a: Applicant): ApplicantPrefill {
    const sub = a.submission;
    const ag = firstGroup(sub, "Applicant Information");

    const dob = ag ? fieldIn(ag, "date of birth", "dob") : "";
    const ssn = ag ? fieldIn(ag, "ssn", "sin", "social") : "";
    const phone = ag ? fieldIn(ag, "phone") : (a.phone ?? "");
    const twic = ag ? fieldIn(ag, "twic") : "";

    const addrG = firstGroup(sub, "Address History");
    const address: PrefillAddress = {
        street: addrG ? fieldIn(addrG, "street") : "",
        city: addrG ? fieldIn(addrG, "city") : "",
        state: addrG ? fieldIn(addrG, "state", "province") : "",
        zip: addrG ? fieldIn(addrG, "zip", "postal") : "",
        country: addrG ? fieldIn(addrG, "country") : "",
        full: "",
    };
    address.full = [address.street, address.city, [address.state, address.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

    const licSec = section(sub, "License Details");
    const licenses: PrefillLicense[] = (licSec?.groups ?? []).map((g) => ({
        number: fieldIn(g, "number"),
        cls: fieldIn(g, "class"),
        authority: fieldIn(g, "authority"),
        country: fieldIn(g, "country"),
        issue: fieldIn(g, "issue"),
        exp: fieldIn(g, "expiration"),
        cdl: fieldIn(g, "commercial", "cdl"),
        endorsements: fieldIn(g, "endorsement"),
    })).filter((l) => l.number || l.cls);

    const empSec = section(sub, "Employment History");
    const employment: PrefillEmployer[] = (empSec?.groups ?? []).map((g) => {
        const dates = fieldIn(g, "dates");
        return { employer: fieldIn(g, "employer"), position: fieldIn(g, "position"), dates, ...splitDates(dates), reason: fieldIn(g, "reason") };
    }).filter((e) => e.employer);

    const unempSec = section(sub, "Unemployment History");
    const unemployment: PrefillUnemployment[] = (unempSec?.groups ?? []).map((g) => {
        const dates = fieldIn(g, "dates");
        return { dates, ...splitDates(dates), comments: fieldIn(g, "comment") };
    }).filter((u) => u.from && /\d/.test(u.from));

    return {
        firstName: a.firstName,
        lastName: a.lastName,
        fullName: `${a.firstName} ${a.lastName}`.trim(),
        email: a.email,
        phone,
        dob,
        ssn,
        twic,
        position: a.position ?? (ag ? fieldIn(ag, "position") : "") ?? "Driver",
        country: address.country || val(sub, "Address History", "country") || "United States",
        address,
        licenses,
        employment,
        unemployment,
    };
}

// Convenience: the primary licence (or empty).
export const primaryLicense = (pf: ApplicantPrefill | null): PrefillLicense | undefined => pf?.licenses[0];
