import { useEffect, useState } from "react";
import type { Quiz, QuizQuestion } from "./quizzes.data";

// ── Onboarding quizzes ───────────────────────────────────────────────────────
// SEPARATE from the hiring/driver-knowledge quizzes (quizzes.data.ts). These are
// the post-orientation knowledge checks a NEWLY-HIRED driver completes during
// onboarding — company orientation, policy, safety and compliance basics.
// Own localStorage key + own catalog so the two never mix.

export const ONB_QUIZ_CATEGORIES = ["Post Orientation"] as const;

const q = (id: string, prompt: string, options: string[], answer: number): QuizQuestion => ({ id, prompt, options, answer });

// Post-Orientation Quiz — generic (brand-neutral) version. Company-specific
// details (emails, ELD brand, fuel network) are replaced with generic wording:
// role-based emails @company.com, "the ELD", "approved fuel locations".
const B_postOrientation: QuizQuestion[] = [
    q("poq1", "Who do you ask for your load information?", ["Owner of the company", "Safety Department", "Send a text on the dispatch text number to ask about load information", "The ELD app"], 2),
    q("poq2", "Before starting the load from the yard, or after a pickup, when do you send a temperature-setting photo to dispatch?", ["Never", "When I remember", "Most of the time", "Always"], 3),
    q("poq3", "Make sure to scale the weight after the pickup from a nearby scale to confirm the trailer is not overweight.", ["True", "False"], 0),
    q("poq4", "After getting the BOL and POD, the driver must wait for dispatch approval before moving to the next assignment. Who do you email your BOL (Bill of Lading) and POD (Proof of Delivery) to?", ["safety@company.com", "payroll@company.com", "pod@company.com", "dispatch@company.com"], 2),
    q("poq5", "Send a photo showing that the load is secured before closing the doors of the trailer after the pickup.", ["True", "False"], 0),
    q("poq6", "Always call dispatch in case of a breakdown.", ["True", "False"], 0),
    q("poq7", "Fuel-ups should be done from approved fuel locations only. Do not leave for a run without a fuel card.", ["True", "False"], 0),
    q("poq8", "Run sheets must be sent to payroll@company.com by the 8th and 23rd of every month to get paid on time.", ["True", "False"], 0),
    q("poq9", "Payday is the 1st and 16th of every month. Driver settlements are sent prior to payday; corrections must be emailed to payroll@company.com within 24 hours of receiving the settlement.", ["True", "False"], 0),
    q("poq10", "Expenses are only reimbursed if receipts are attached along with the trip sheets.", ["True", "False"], 0),
    q("poq11", "If you drive owner-operator (O/O) trucks, you are entitled to receive a separate pay settlement along with a separate cheque on payday.", ["True", "False"], 0),
    q("poq12", "The Electronic Logging Device (ELD) must be ON and logged in at all times when on duty. It is always illegal to drive while the ELD is off.", ["True", "False"], 1),
    q("poq13", "When do you report ALL accidents and ALL incidents?", ["Never", "When I remember", "Most of the time", "Always — immediately to safety@company.com"], 3),
    q("poq14", "Original inspections (Pass or Fail) must be handed in to the Safety department on arrival at the terminal. A copy must be emailed immediately following the inspection to which address?", ["safety@company.com", "payroll@company.com", "pod@company.com", "dispatch@company.com"], 0),
    q("poq15", "Any issues with the ELD, logs, and/or safety must be addressed to which email?", ["safety@company.com", "payroll@company.com", "pod@company.com", "dispatch@company.com"], 0),
    q("poq16", "Drivers own and operate their own GPS device, mounted to the dash or windshield and pre-programmed before departing (adjusted only while parked). What type of GPS should you use?", ["Personal cell phone with Waze or Google Maps", "An approved truckers' GPS giving info on low bridges, truck routes, etc.", "Any GPS will do", "I know my way, I don't need GPS"], 1),
    q("poq17", "A Driver Vehicle Inspection Report (DVIR) is a formal report confirming a driver completed an inspection on a commercial motor vehicle. Drivers must complete pre-trip and post-trip inspections and detail any mechanical defects.", ["True", "False"], 0),
    q("poq18", "A Schedule 1 must always be carried. What is a Schedule 1?", ["The driver's work schedule", "Truck, Tractor, or Trailer daily inspections — items to inspect are numbered, with minor and major defects identified", "The dispatch work schedule", "The safety and compliance schedule"], 1),
    q("poq19", "A DOT instruction sheet (from your ELD provider) is required to be kept on board and available to present during inspections, per FMCSA 49 CFR 395.22(h).", ["True", "False"], 0),
    q("poq20", "In the event of an ELD malfunction that can't be fixed quickly, the FMCSA requires you to keep 8 days of blank paper logs in your truck (14 if you're driving in Canada).", ["True", "False"], 0),
];

export const SEED_ONB_QUIZZES: Quiz[] = [
    { id: "onb-post-orientation", title: "Post Orientation Quiz", description: "20-question knowledge check on load handling, pay, safety and FMCSA compliance — completed after orientation.", category: "Post Orientation", passPct: 80, locked: true, questions: B_postOrientation },
];

const KEY = "onb_quizzes_v1";
const EVENT = "onb-quizzes-change";

function load(): Quiz[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const saved = JSON.parse(raw) as Quiz[];
            const customs = saved.filter((c) => !SEED_ONB_QUIZZES.some((d) => d.id === c.id));
            return [...SEED_ONB_QUIZZES, ...customs];
        }
    } catch { /* ignore */ }
    return SEED_ONB_QUIZZES;
}
function persist(list: Quiz[]) {
    const customs = list.filter((c) => !c.locked && !SEED_ONB_QUIZZES.some((d) => d.id === c.id));
    localStorage.setItem(KEY, JSON.stringify(customs));
    window.dispatchEvent(new CustomEvent(EVENT));
}

export function useOnboardingQuizzes() {
    const [quizzes, setQuizzes] = useState<Quiz[]>(load);
    useEffect(() => {
        const h = () => setQuizzes(load());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);
    const save = (qz: Quiz) => {
        const cur = load();
        const idx = cur.findIndex((x) => x.id === qz.id);
        persist(idx >= 0 ? cur.map((x) => (x.id === qz.id ? qz : x)) : [...cur, qz]);
    };
    const remove = (id: string) => persist(load().filter((x) => x.id !== id));
    return { quizzes, save, remove };
}

export function getOnboardingQuiz(id: string): Quiz | undefined {
    return load().find((qz) => qz.id === id);
}
export function onboardingQuizTitle(id: string): string {
    return getOnboardingQuiz(id)?.title ?? id;
}
