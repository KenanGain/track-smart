// Driver-application consent forms.
//
// Each consent is regulatory text the applicant must read and (when
// `requiresSignature`) sign before the hiring workflow can advance. The forms
// are referenced by id from the per-step hiring template — so the admin can
// pick exactly which consents appear on which step.

import type { PipelineStepId } from "./ats.data";

export type ConsentCategory =
    | 'fcra_disclosure'
    | 'driver_certification'
    | 'pre_employment_drug'
    | 'safety_performance'
    | 'psp_disclosure'
    | 'clearinghouse_query'
    | 'mvr_release'
    | 'background_check';

export interface ConsentForm {
    id: ConsentCategory;
    title: string;
    /** Short subtitle shown under the title in the consent reader. */
    subtitle: string;
    /** Regulatory anchor — printed in the audit log when signed. */
    citation: string;
    /** Body — paragraph array (renders as <p> blocks). */
    body: string[];
    /** A "signature" line is required and recorded in the event log. */
    requiresSignature: boolean;
    /** Default step this consent attaches to in the system template. */
    defaultStep: PipelineStepId;
    /** Suggested document(s) produced/attached when signing this consent. */
    producesDocumentLabel?: string;
}

export const CONSENT_FORMS: ConsentForm[] = [
    {
        id: 'fcra_disclosure',
        title: 'FCRA Background Report Disclosure',
        subtitle: 'Fair Credit Reporting Act — Section 604(b)(2)(A)',
        citation: 'FCRA § 604(b)(2)(A)',
        requiresSignature: true,
        defaultStep: 'application_review',
        producesDocumentLabel: 'Signed FCRA Disclosure',
        body: [
            'In accordance with the provisions of Section 604 (b)(2)(A) of the Fair Credit Reporting Act, you are being informed that reports verifying your previous employment, previous drug and alcohol test results, and your driving record may be obtained on you for employment purposes.',
            'Pursuant to the federal Fair Credit Reporting Act, I hereby authorize this company and its designated agents and representatives to conduct a comprehensive review of my background through any consumer report for employment.',
        ],
    },
    {
        id: 'driver_certification',
        title: 'Driver Requirements Certification',
        subtitle: 'FMCSR Parts 383 & 391',
        citation: 'FMCSR Parts 383, 391',
        requiresSignature: true,
        defaultStep: 'application_review',
        producesDocumentLabel: 'Signed Driver Requirements Certification',
        body: [
            'DRIVER REQUIREMENTS: Parts 383 and 391 of the Federal Motor Carrier Safety Regulations contain some requirements that you as a contractor must comply with.',
            '1. Possess only one license: You may not possess more than one motor vehicle operator\'s license.',
            '2. Notification of license suspension, revocation or cancellation: You must notify the carrier the NEXT BUSINESS DAY of any revocation or suspension of your driver\'s license.',
            'I certify that I have read and understand the above requirements.',
        ],
    },
    {
        id: 'pre_employment_drug',
        title: 'Pre-Employment Alcohol & Controlled-Substance Testing',
        subtitle: 'FMCSR pre-employment testing consent',
        citation: 'FMCSR § 382.301',
        requiresSignature: true,
        defaultStep: 'substance_testing',
        producesDocumentLabel: 'Signed Pre-Employment Substance Testing Consent',
        body: [
            'I understand that, as required by the Federal Motor Carrier Safety Regulations and Company policy, all drivers must submit to alcohol and controlled substance testing as a condition of employment. I also understand that any offer of employment will be contingent upon the results of an alcohol and controlled substance test.',
            'Therefore, I agree to submit to the following alcohol and controlled substance tests:',
            '• Pre-Employment, to determine employment eligibility',
            '• Random',
            '• Reasonable Suspicion',
            '• Post-Accident',
        ],
    },
    {
        id: 'safety_performance',
        title: 'Safety Performance History Release',
        subtitle: '49 CFR Parts 40.25 / 382.413 / 391.23',
        citation: '49 CFR §§ 40.25, 382.413, 391.23',
        requiresSignature: true,
        defaultStep: 'dot_employment_verification',
        producesDocumentLabel: 'Signed Safety Performance Release',
        body: [
            'I hereby authorize release of information to the company from my employment file and my Department of Transportation regulated drug and alcohol testing records. This release is in accordance with DOT Regulation 49 CFR Parts 40.25/382.413/391.23.',
            'I further authorize my former employer to release my safety performance history information to my prospective employer for investigation purposes as required by FMCSR 391.23, 382.405 (f) & 382.413(b) for the 3 years preceding this release.',
        ],
    },
    {
        id: 'psp_disclosure',
        title: 'PSP Disclosure & Authorization',
        subtitle: 'FMCSA Pre-Employment Screening Program',
        citation: 'FMCSA PSP — 49 USC § 31150',
        requiresSignature: true,
        defaultStep: 'psp',
        producesDocumentLabel: 'Signed PSP Disclosure & Authorization',
        body: [
            'THE BELOW DISCLOSURE AND AUTHORIZATION LANGUAGE IS FOR MANDATORY USE BY ALL ACCOUNT HOLDERS — IMPORTANT DISCLOSURE REGARDING BACKGROUND REPORTS FROM THE PSP Online Service.',
            'In connection with your application for employment with the company, Prospective Employer, its employees, agents or contractors may obtain one or more reports regarding your driving, and safety inspection history from the Federal Motor Carrier Safety Administration (FMCSA).',
            'AUTHORIZATION: I authorize the company ("Prospective Employer") to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history.',
        ],
    },
    {
        id: 'clearinghouse_query',
        title: 'FMCSA Clearinghouse Limited-Query Consent',
        subtitle: 'CDL Drug & Alcohol Clearinghouse',
        citation: '49 CFR § 382.701',
        requiresSignature: true,
        defaultStep: 'substance_testing',
        producesDocumentLabel: 'Signed Clearinghouse Limited-Query Consent',
        body: [
            'I hereby provide consent the company to conduct a limited query of the FMCSA Commercial Driver\'s License Drug and Alcohol Clearinghouse (Clearinghouse) to determine whether drug or alcohol violation information about me exists in the Clearinghouse.',
            'I am consenting to multiple limited queries for the duration of employment with the company.',
            'I understand that if the limited query conducted by the company indicates that drug or alcohol violation information about me exists in the Clearinghouse, FMCSA will not disclose that information to the company without first obtaining additional specific consent from me.',
            'I further understand that if I refuse to provide consent for the company to conduct a limited query of the Clearinghouse, the company must prohibit me from performing safety-sensitive functions, including driving a commercial motor vehicle, as required by FMCSA\'s drug and alcohol program regulations.',
        ],
    },
    {
        id: 'mvr_release',
        title: 'Motor Vehicle Record (MVR) Release',
        subtitle: 'Federal Drivers Privacy Protection Act',
        citation: '18 USC § 2721 et seq. (DPPA)',
        requiresSignature: true,
        defaultStep: 'mvr',
        producesDocumentLabel: 'Signed MVR Release',
        body: [
            'In conjunction with my potential employment ("the company"), I (applicant) consent to the release of my Motor Vehicle Records (MVR) to the company. I understand the company will use these records to evaluate my suitability to fulfill driving duties that may be related to the position for which I am applying. I also consent to the review, evaluation, and other use of any MVR I may have provided to the company.',
            'This consent is given in satisfaction of Public Law 18 USC 2721 et. Seq., "Federal Drivers Privacy Protection Act", and is intended to constitute "written consent" as required by this Act.',
        ],
    },
    {
        id: 'background_check',
        title: 'Criminal Background Check Consent',
        subtitle: 'Application data + employer / education verification',
        citation: 'FCRA · Company Policy',
        requiresSignature: true,
        defaultStep: 'criminal_background',
        producesDocumentLabel: 'Signed Background Check Consent',
        body: [
            'I (the applicant) am applying for a contract at the company (my "Potential Contractee") and want to provide my consent for only this application.',
            'Confirmation of Application Data: I certify that the information I provided in the previous step regarding my Driver\'s License, Accident History, Moving Violations, Education, and Equipment Experience is true and complete.',
            'I further certify that I do not possess more than one motor vehicle license (per Section 383.21 FMCSR) and that I did not test positive or refuse to test on a pre-employment Drug or Alcohol test administered by an employer.',
            'I agree that my Potential Contractee and its service provider, Truck Right Data Management Inc. ("Service Provider"), may contact all my former employers/contractees to conduct a reference and driving safety check (including employment dates, status, duties, reason for leaving, and accident records). I also authorize contact with educational institutions to confirm awards/credentials.',
            'I understand that Service Provider retains employment history records. I agree that my Potential Contractee and Service Provider may use and disclose my personal information as required for these purposes. I will not hold my Potential Contractee, Service Provider, or contacting organizations liable for this disclosure.',
            'I understand that I have the right to (1) review the information provided by previous employers, (2) have errors corrected and re-submitted, and (3) have a rebuttal statement attached to information I allege to be erroneous.',
            'I consent to verification of my driver licence status. I certify that this application was completed by me and that all entries are true and complete. I understand that any misstatement or omission may result in my dismissal.',
        ],
    },
];

export const CONSENT_BY_ID: Record<ConsentCategory, ConsentForm> = Object.fromEntries(
    CONSENT_FORMS.map(c => [c.id, c]),
) as Record<ConsentCategory, ConsentForm>;
