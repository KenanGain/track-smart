// ─────────────────────────────────────────────────────────────────────────────
// Driver licence classes — one list for everywhere a class is asked for.
//
// The application form (hiring tracking system and Add Driver), the driver record and the
// Compliances & Documents licence record all pick from this list, so a class chosen on the
// application is the class filed on the licence record.
//
// Each entry names the Canadian number and the letter it pairs with — "Class 1 / A" — so a
// driver picks the one class they hold whichever side of the border issued it.
// ─────────────────────────────────────────────────────────────────────────────

export interface LicenseClassOption {
    value: string;
    /** One line on what the class lets them drive. */
    hint: string;
    /** Commercial — the classes a CDL / commercial licence record is about. */
    commercial: boolean;
}

export const LICENSE_CLASS_OPTIONS: LicenseClassOption[] = [
    { value: "Class 1 / A", commercial: true, hint: "Tractor-trailer and combination vehicles (US Class A · Canada Class 1 · Ontario A/AZ)" },
    { value: "Class 2 / B", commercial: true, hint: "Buses and heavy single vehicles (US Class B · Canada Class 2)" },
    { value: "Class 3 / C", commercial: true, hint: "Straight trucks over two axles; small hazmat or passenger vehicles (Canada Class 3 · US Class C · Ontario D/DZ)" },
    { value: "Class 4 / D", commercial: false, hint: "Taxis, ambulances and small buses; US regular licence (Canada Class 4 · US Class D)" },
    { value: "Class 5 / G", commercial: false, hint: "Cars and light trucks — full licence (Canada Class 5 · Ontario G)" },
    { value: "Class M", commercial: false, hint: "Motorcycle" },
];

/** Every class, in the order above. */
export const LICENSE_CLASS_VALUES: string[] = LICENSE_CLASS_OPTIONS.map((o) => o.value);

/** The same list for any country — each class already carries both names. */
export const licenseClassesFor = (_country?: string): string[] => LICENSE_CLASS_VALUES;

export const licenseClassHint = (value: string): string => LICENSE_CLASS_OPTIONS.find((o) => o.value === value)?.hint ?? "";

export const isCommercialClass = (value: string): boolean =>
    !!LICENSE_CLASS_OPTIONS.find((o) => o.value === normalizeLicenseClass(value))?.commercial;

/**
 * A class written the old way — "Class A", "A", "CDL Class A", "Class 1", "AZ" — in today's
 * naming, so records captured before this list read the same as new ones. Unknown text is kept.
 */
export function normalizeLicenseClass(raw?: string): string {
    const v = (raw ?? "").trim();
    if (!v || LICENSE_CLASS_VALUES.includes(v)) return v;
    const k = v.toUpperCase().replace(/^CDL\s*/, "").replace(/^CLASS\s*/, "").replace(/\s*\(.*\)\s*$/, "").trim();
    if (["A", "1", "AZ", "1/A", "1 / A"].includes(k)) return "Class 1 / A";
    if (["B", "2", "2/B", "2 / B"].includes(k)) return "Class 2 / B";
    if (["C", "3", "DZ", "3/C", "3 / C"].includes(k)) return "Class 3 / C";
    if (["D", "4", "4/D", "4 / D"].includes(k)) return "Class 4 / D";
    if (["5", "G", "5/G", "5 / G"].includes(k)) return "Class 5 / G";
    if (k === "M") return "Class M";
    return v;
}
