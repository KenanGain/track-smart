/**
 * Recommendations engine — derives action cards from top contributors.
 *
 * Spec: docs/SAFETY.md §10.10, §17 (Glossary → Recommendation).
 *
 * Pure: no React, no I/O. Each recommendation has a `severity`, a `title`,
 * a one-line description, and an `actionKey` the UI maps to a deep-link.
 */

import type {
    RiskContribution,
    RiskRecommendation,
    RiskScope,
} from './risk-engine.types';

/** Build up to 5 recommendations from a list of top contributors. */
export function recommendationsFor(
    contributors: RiskContribution[],
    scope: RiskScope,
): RiskRecommendation[] {
    if (contributors.length === 0) return [];
    const seen = new Set<string>();
    const out: RiskRecommendation[] = [];

    for (const c of contributors) {
        const key = recoKeyFor(c);
        if (seen.has(key)) continue;
        seen.add(key);
        const r = recoFor(c, scope);
        if (r) out.push(r);
        if (out.length >= 5) break;
    }
    return out;
}

function recoKeyFor(c: RiskContribution): string {
    return `${c.source}:${c.domain}`;
}

function recoFor(c: RiskContribution, scope: RiskScope): RiskRecommendation | undefined {
    const sev: RiskRecommendation['severity'] = c.severity >= 8 ? 'urgent'
        : c.severity >= 5 ? 'warn'
        : 'info';

    // OOS-prone domains → maintenance / inspection routes.
    if (c.domain === 'vehicleMaintenance' || c.domain === 'assetHealth') {
        return {
            severity: sev,
            title: 'Address vehicle-maintenance findings',
            description: 'Recent OOS or maintenance contribution is dragging the asset score. Open a work order and verify safety-critical systems.',
            actionKey: 'open-work-order',
            deepLink: scope.kind === 'asset' || scope.kind === 'carrierAsset' || scope.kind === 'driverAsset' || scope.kind === 'carrierDriverAsset'
                ? `/assets/${(scope as { assetId?: string }).assetId}`
                : undefined,
        };
    }
    if (c.domain === 'inspection') {
        return {
            severity: sev,
            title: 'Review recent roadside inspection',
            description: 'Inspection findings contribute to the score. Confirm the violation outcome was logged and remediation is tracked.',
            actionKey: 'review-inspection',
            deepLink: '/inspections',
        };
    }
    if (c.domain === 'crash' || c.domain === 'collision') {
        return {
            severity: sev,
            title: 'Investigate incident',
            description: 'A recent crash / collision is materially impacting risk. Review preventability and confirm corrective actions.',
            actionKey: 'review-driver',
            deepLink: scope.kind === 'driver' || scope.kind === 'carrierDriver' || scope.kind === 'driverAsset' || scope.kind === 'carrierDriverAsset'
                ? `/profile/drivers/${(scope as { driverId?: string }).driverId}`
                : undefined,
        };
    }
    if (c.domain === 'hos') {
        return {
            severity: sev,
            title: 'HOS / ELD compliance gap',
            description: 'HOS violations are a top contributor. Audit recent ELD logs for falsification or driving-time excess.',
            actionKey: 'review-driver',
        };
    }
    if (c.domain === 'unsafeDriving') {
        return {
            severity: sev,
            title: 'Coach unsafe-driving behaviour',
            description: 'Telematics or violation data shows an unsafe-driving pattern. Schedule coaching or VEDR review.',
            actionKey: 'schedule-training',
        };
    }
    if (c.domain === 'training') {
        return {
            severity: sev,
            title: 'Renew expired training',
            description: 'Mandatory training has expired or is near expiry. Schedule recertification before the next dispatch.',
            actionKey: 'schedule-training',
            deepLink: '/training',
        };
    }
    if (c.domain === 'documentCompliance') {
        return {
            severity: sev,
            title: 'Renew expired document',
            description: 'A required document has expired (registration, DOT card, etc.). Verify and re-upload.',
            actionKey: 'verify-document',
        };
    }
    if (c.domain === 'driverFitness' || c.domain === 'controlledSubstance') {
        return {
            severity: sev,
            title: 'Driver-fitness review',
            description: 'Driver-fitness contributors flagged. Confirm medical card / drug-test compliance.',
            actionKey: 'review-driver',
        };
    }
    if (c.domain === 'conviction') {
        return {
            severity: sev,
            title: 'Recent conviction on file',
            description: 'A conviction is contributing significant points. Review CCMTA equivalency and dispute window.',
            actionKey: 'review-driver',
        };
    }
    return {
        severity: 'info',
        title: 'Review carrier profile',
        description: 'Source-level signal is contributing to risk. Review the carrier profile for context.',
        actionKey: 'review-carrier-profile',
    };
}
