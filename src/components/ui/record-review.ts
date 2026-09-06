// ─────────────────────────────────────────────────────────────────────────────
// The review lifecycle, for records that did not have one.
//
// Hours-of-Service violations and telematics safety events already carry their own
// review state (verify → choose a resolution → close, reopen, notes) inside their
// data files. Tickets and accidents do not — they were built around a payment
// status and a verification flag — yet they need exactly the same review, because
// they are the same job: a safety manager looks at what happened and decides what
// to do about the driver.
//
// Rather than reshape two data models, the review lives beside them, keyed by
// record. That keeps ticket and accident data as it is, and lets both surfaces
// render the SAME `ReviewResolutionTab` the other two use.
//
// Closing with "Issue warning letter" files the letter as the driver's compliance
// record, carrying this record's own event details (see `warning-letters`).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ACTIVITY_BADGE_TONE } from '@/components/ui/activity-kinds';
import type { RawActivity } from '@/components/ui/ReviewResolution';
import { HOS_DISPOSITION_BY_ID, type HosDisposition, type HosVStatus } from '@/pages/hos/hos-violations.data';
import { issueWarningLetter, type WarningLetterSource } from '@/pages/compliance/warning-letters';

const KEY = 'record-review-v1';
const EVENT = 'record-review-change';

/** The record types that borrow this lifecycle. */
export type ReviewSubjectKind = 'ticket' | 'accident';

/** One record's review. Mirrors the fields `ReviewResolutionTab` reads. */
export interface RecordReview {
    status: HosVStatus;
    verified?: boolean;
    verifiedBy?: string;
    disposition?: HosDisposition;
    trainingName?: string;
    reviewedBy?: string;
    /** Newline-joined, the same shape the HOS record stores. */
    notes: string;
    activity: RawActivity[];
}

type Store = Record<string, RecordReview>;

const scopeKey = (kind: ReviewSubjectKind, id: string) => `${kind}::${id}`;

/** A record nobody has touched is already in review — that is what it is waiting for. */
export const emptyReview = (): RecordReview => ({ status: 'review', notes: '', activity: [] });

function loadAll(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}

function persist(all: Store) {
    try {
        localStorage.setItem(KEY, JSON.stringify(all));
    } catch { /* quota — best-effort for prototype */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

export function readReview(kind: ReviewSubjectKind, id: string): RecordReview {
    const saved = loadAll()[scopeKey(kind, id)];
    return saved ? { ...emptyReview(), ...saved, activity: saved.activity ?? [] } : emptyReview();
}

export function writeReview(kind: ReviewSubjectKind, id: string, next: RecordReview): void {
    const all = loadAll();
    all[scopeKey(kind, id)] = next;
    persist(all);
}

function stamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * One record's review, plus the actions the tab calls.
 *
 * `source` describes the record in the terms a warning letter needs — what happened, which
 * record, when — so choosing that resolution files a letter that says what it was for. It is
 * the caller's job because only the ticket page knows what a ticket is.
 */
export function useRecordReview({ kind, id, accountId, currentUser, source }: {
    kind: ReviewSubjectKind;
    id: string;
    accountId?: string;
    currentUser: string;
    source: WarningLetterSource;
}) {
    const [review, setReview] = useState<RecordReview>(() => readReview(kind, id));
    /** The letter most recently filed from this record, for the confirmation the user sees. */
    const [filedLetter, setFiledLetter] = useState<string | null>(null);

    useEffect(() => {
        const sync = () => setReview(readReview(kind, id));
        window.addEventListener(EVENT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
    }, [kind, id]);

    // Moving to a different record loads its own review. Adjusted during render rather than
    // in an effect, so the previous record's review is never painted under this one's header.
    const [scope, setScope] = useState(scopeKey(kind, id));
    if (scope !== scopeKey(kind, id)) {
        setScope(scopeKey(kind, id));
        setReview(readReview(kind, id));
        setFiledLetter(null);
    }

    const apply = useCallback((fn: (r: RecordReview) => RecordReview) => {
        const next = fn(readReview(kind, id));
        writeReview(kind, id, next);
        setReview(next);
        return next;
    }, [kind, id]);

    const withAct = useCallback((r: RecordReview, actKind: string, detail?: string, title?: string): RecordReview => ({
        ...r,
        activity: [...(r.activity ?? []), {
            id: `act-${Math.random().toString(36).slice(2, 9)}`,
            at: stamp(), by: currentUser, kind: actKind, detail, title,
            badge: { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer },
        }],
    }), [currentUser]);

    const verify = useCallback(() => apply(r => (r.verified ? r : withAct(
        { ...r, verified: true, verifiedBy: currentUser, reviewedBy: r.reviewedBy ?? currentUser },
        'verified', 'Verified against the record.', 'Verified',
    ))), [apply, withAct, currentUser]);

    /** Close with a resolution. The warning letter is the one that leaves a document behind. */
    const dispose = useCallback((disp: HosDisposition, trainingName?: string) => {
        const meta = HOS_DISPOSITION_BY_ID[disp];
        let letterNote = '';
        if (disp === 'warning') {
            const filed = issueWarningLetter(accountId, source, currentUser);
            if (filed) {
                letterNote = ' — filed to the driver’s Warning Letter record';
                setFiledLetter(filed.label);
            }
        }
        apply(r => withAct({
            ...r,
            status: 'resolved',
            disposition: disp,
            trainingName: disp === 'training' ? trainingName : r.trainingName,
            reviewedBy: r.reviewedBy ?? currentUser,
        }, meta.kind, `Closed — ${meta.label}${disp === 'training' && trainingName ? `: ${trainingName}` : ''}${letterNote}`));
    }, [apply, withAct, accountId, source, currentUser]);

    const assignTraining = useCallback((name: string) => dispose('training', name), [dispose]);

    const reopen = useCallback(() => apply(r => withAct(
        { ...r, status: 'review', disposition: undefined }, 'reopened', 'Reopened for review',
    )), [apply, withAct]);

    const addNote = useCallback((text: string) => apply(r => withAct(
        { ...r, notes: r.notes ? `${r.notes}\n${text}` : text }, 'note', text,
    )), [apply, withAct]);

    const activityCount = useMemo(() => review.activity?.length ?? 0, [review.activity]);

    return { review, activityCount, filedLetter, verify, dispose, assignTraining, reopen, addNote };
}
