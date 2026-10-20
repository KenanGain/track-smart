import { Flag, Globe, Leaf, type LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// The three driver types — one per application form (Settings ▸ Application Form).
//
// The hiring workflow builder and the onboarding workflow builder each kept their own list
// of FOUR, with a "Local / Domestic" type no application form exists for. A workflow saved
// as "local" could never be matched to an applicant, because every applicant is filed under
// one of the three forms. So there is one list, it is the forms' list, and the names and
// regions read exactly as the Application Form cards do.
//
// `local` and `us-owner-operator` are older ids from before the catalog settled on three;
// both are US-domestic, so they read as US (same rule as `formShort` in applicants.data).
// ─────────────────────────────────────────────────────────────────────────────

export type DriverTypeId = "us" | "canada" | "cross-border";

export const DRIVER_TYPE_OPTIONS: { id: DriverTypeId; name: string; region: string; Icon: LucideIcon; accent: string }[] = [
    { id: "us", name: "US Only Driver", region: "United States", Icon: Flag, accent: "bg-blue-50 text-blue-600" },
    { id: "canada", name: "Canada Only Driver", region: "Canada", Icon: Leaf, accent: "bg-rose-50 text-rose-600" },
    { id: "cross-border", name: "Canada (Cross Border)", region: "Canada / US", Icon: Globe, accent: "bg-violet-50 text-violet-600" },
];

const IDS = new Set<string>(DRIVER_TYPE_OPTIONS.map((d) => d.id));

/** Any stored id (including the legacy ones) as one of the three, or undefined. */
export function normalizeDriverType(id?: string | null): DriverTypeId | undefined {
    if (!id) return undefined;
    if (id === "local" || id === "us-owner-operator") return "us";
    return IDS.has(id) ? (id as DriverTypeId) : undefined;
}

export const driverTypeLabel = (id?: string | null) => DRIVER_TYPE_OPTIONS.find((d) => d.id === normalizeDriverType(id))?.name;

/** Whether a workflow saved for `workflowType` is one an applicant on `applicantForm` can be given. */
export const driverTypeMatches = (workflowType: string | undefined, applicantForm: string | undefined) =>
    !!normalizeDriverType(workflowType) && normalizeDriverType(workflowType) === normalizeDriverType(applicantForm);
