export interface TicketStats {
    outstandingFines: number;
    openOffenses: number;
    inCourt: number;
    paidThisMonth: number;
}

export type TicketStatus = 'Due' | 'In Court' | 'Paid' | 'Closed';
export type ViolationType = 'Speeding' | 'Overweight' | 'Logbook violation' | 'Equipment defect' | 'Insurance lapse' | 'Red Light' | 'Parking';

/** Paper vs electronic citation. Each variant carries a different set of
 *  detail fields (officer + court for Paper; portal / QR / device for
 *  Electronic) — see `TicketRecord.ticketDetails` below. */
export type TicketKind = 'Paper' | 'Electronic';

export interface TicketDetails {
    // Paper ticket fields
    officerName?: string;
    officerBadge?: string;
    courtLocation?: string;
    courtDate?: string;
    // Electronic ticket fields
    portalUrl?: string;
    qrReference?: string;
    eIssuingDevice?: string;
}

/** Regulatory + administrative identifiers carried on a ticket. Grouped
 *  to match the form's collapsible-style sub-sections; every field is
 *  optional because no real-world ticket will have all 24 at once.
 *  Different jurisdictions use different naming conventions for the
 *  primary citation reference — we keep them as separate fields so the
 *  exported record matches the source paperwork verbatim. */
export interface TicketIdentifiers {
    // 1) Citation / Offence — the primary reference under various names
    ticketNumber?: string;
    citationNumber?: string;
    violationTicketNumber?: string;
    offenceNumber?: string;
    offenceNoticeNumber?: string;
    contraventionNumber?: string;

    // 2) Court / Legal
    docketNumber?: string;
    courtCaseNumber?: string;
    courtLocationCode?: string;
    iconCourtCode?: string;       // ON's ICON system court code

    // 3) Violation / Statute
    violationCode?: string;
    statuteSection?: string;

    // 4) Driver / Asset (often pre-printed on the ticket)
    driverLicenceNumber?: string;
    plateNumber?: string;
    vinNumber?: string;

    // 5) Inspection / Officer
    inspectionReportNumber?: string;
    officerBadgeNumber?: string;

    // 6) Carrier / Operator
    usdotNumber?: string;
    mcNumber?: string;
    cvorNumber?: string;
    nscNumber?: string;
    carrierNumber?: string;

    // 7) Financial
    finePenaltyNumber?: string;
    paymentReferenceNumber?: string;
    receiptNumber?: string;
}

export interface TicketRecord {
    id: string;
    offenseNumber: string;
    date: string;
    time: string;
    driverId: string;
    location: string;
    description: string;
    assetId: string;
    driverName: string;
    violationType: ViolationType;
    /** Specific violation description picked from the master chart
     *  (FMCSA SMS / CVOR / NSC). E.g. violationType="Speeding" with
     *  violationSubtype="Speeding 6–10 mph over". Free-form on purpose
     *  since the master chart text isn't a closed enum. */
    violationSubtype?: string;
    /** BASIC category label from VIOLATION_DATA (e.g. "Unsafe Driving"). */
    violationCategory?: string;
    /** Sub-category / violation group from VIOLATION_DATA
     *  (e.g. "Speeding 6-10"). */
    violationGroup?: string;
    /** Out-of-service flag — mirrors the master chart's isOos for the
     *  picked violation. Drives the OOS-qualifying chip on the form. */
    isOos?: boolean;
    fineAmount: number;
    currency: 'USD' | 'CAD';
    status: TicketStatus;
    hasTicketFile: boolean;
    hasReceiptFile: boolean;
    hasNoticeFile: boolean;
    assignedToThirdParty?: boolean;
    /** Paper vs Electronic — defaults to 'Paper' for legacy records. */
    ticketKind?: TicketKind;
    /** Variant-specific detail fields. */
    ticketDetails?: TicketDetails;
    /** Grouped regulatory + administrative identifiers from the citation. */
    identifiers?: TicketIdentifiers;
}

export const TICKET_STATS: TicketStats = {
    outstandingFines: 1050,
    openOffenses: 3,
    inCourt: 1,
    paidThisMonth: 1
};

export const MOCK_TICKETS: TicketRecord[] = [
    {
        id: '1',
        offenseNumber: 'OFF-84729',
        date: '2023-10-24',
        time: '14:30',
        driverId: 'DRV-2001',
        location: 'Toronto, ON',
        description: 'Hwy 401 Westbound near Exit 312',
        assetId: 'TRK-042',
        driverName: 'John Smith',
        violationType: 'Speeding',
        fineAmount: 250.00,
        currency: 'CAD',
        status: 'Due',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '2',
        offenseNumber: 'OFF-84730',
        date: '2023-10-20',
        time: '09:15',
        driverId: 'DRV-2002',
        location: 'Buffalo, NY',
        description: 'I-190 Southbound at weigh station',
        assetId: 'TRK-118',
        driverName: 'Sarah Miller',
        violationType: 'Overweight',
        fineAmount: 1250.00,
        currency: 'USD',
        status: 'In Court',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: true,
        assignedToThirdParty: true
    },
    {
        id: '3',
        offenseNumber: 'OFF-84731',
        date: '2023-10-15',
        time: '16:45',
        driverId: 'DRV-2003',
        location: 'Detroit, MI',
        description: 'I-75 Northbound rest area',
        assetId: 'TRK-088',
        driverName: 'Mike Johnson',
        violationType: 'Logbook violation',
        fineAmount: 500.00,
        currency: 'USD',
        status: 'Paid',
        hasTicketFile: true,
        hasReceiptFile: true,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '4',
        offenseNumber: 'OFF-84732',
        date: '2023-09-02',
        time: '11:00',
        driverId: 'DRV-2004',
        location: 'Montreal, QC',
        description: 'Autoroute 40 East at inspection checkpoint',
        assetId: 'TRK-012',
        driverName: 'Elena Rodriguez',
        violationType: 'Equipment defect',
        fineAmount: 150.00,
        currency: 'CAD',
        status: 'Closed',
        hasTicketFile: false,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '5',
        offenseNumber: 'OFF-84733',
        date: '2023-10-28',
        time: '08:20',
        driverId: 'DRV-1001',
        location: 'Chicago, IL',
        description: 'I-90 Westbound toll plaza',
        assetId: 'TRK-095',
        driverName: 'James Sullivan',
        violationType: 'Insurance lapse',
        fineAmount: 800.00,
        currency: 'USD',
        status: 'Due',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '6',
        offenseNumber: 'OFF-84734',
        date: '2024-01-12',
        time: '07:45',
        driverId: 'DRV-2001',
        location: 'Springfield, IL',
        description: 'I-55 Southbound mile marker 92',
        assetId: 'TRK-042',
        driverName: 'John Smith',
        violationType: 'Red Light',
        fineAmount: 350.00,
        currency: 'USD',
        status: 'Paid',
        hasTicketFile: true,
        hasReceiptFile: true,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '7',
        offenseNumber: 'OFF-84735',
        date: '2024-03-08',
        time: '13:10',
        driverId: 'DRV-1002',
        location: 'Houston, TX',
        description: 'US-59 Northbound near downtown',
        assetId: 'TRK-055',
        driverName: 'Maria Rodriguez',
        violationType: 'Speeding',
        fineAmount: 200.00,
        currency: 'USD',
        status: 'Closed',
        hasTicketFile: true,
        hasReceiptFile: true,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '8',
        offenseNumber: 'OFF-84736',
        date: '2024-05-22',
        time: '10:30',
        driverId: 'DRV-1003',
        location: 'Sacramento, CA',
        description: 'I-80 Eastbound at truck scales',
        assetId: 'TRK-077',
        driverName: 'Robert Chen',
        violationType: 'Overweight',
        fineAmount: 950.00,
        currency: 'USD',
        status: 'Due',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '9',
        offenseNumber: 'OFF-84737',
        date: '2024-06-15',
        time: '18:00',
        driverId: 'DRV-1001',
        location: 'Indianapolis, IN',
        description: 'I-465 construction zone',
        assetId: 'TRK-095',
        driverName: 'James Sullivan',
        violationType: 'Speeding',
        fineAmount: 450.00,
        currency: 'USD',
        status: 'In Court',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: true,
        assignedToThirdParty: true
    },
    {
        id: '10',
        offenseNumber: 'OFF-84738',
        date: '2024-07-03',
        time: '15:20',
        driverId: 'DRV-1005',
        location: 'Columbus, OH',
        description: 'I-70 Westbound rest stop',
        assetId: 'TRK-033',
        driverName: 'Michael Brown',
        violationType: 'Logbook violation',
        fineAmount: 375.00,
        currency: 'USD',
        status: 'Paid',
        hasTicketFile: true,
        hasReceiptFile: true,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '11',
        offenseNumber: 'OFF-84739',
        date: '2024-08-19',
        time: '06:50',
        driverId: 'DRV-2002',
        location: 'Dallas, TX',
        description: 'I-35E Southbound near exit 425',
        assetId: 'TRK-118',
        driverName: 'Sarah Miller',
        violationType: 'Speeding',
        fineAmount: 300.00,
        currency: 'USD',
        status: 'Due',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '12',
        offenseNumber: 'OFF-84740',
        date: '2024-09-10',
        time: '12:15',
        driverId: 'DRV-1004',
        location: 'Jacksonville, FL',
        description: 'I-95 Northbound bridge approach',
        assetId: 'TRK-061',
        driverName: 'Sarah Johnson',
        violationType: 'Equipment defect',
        fineAmount: 175.00,
        currency: 'USD',
        status: 'Closed',
        hasTicketFile: false,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '13',
        offenseNumber: 'OFF-84741',
        date: '2024-11-05',
        time: '09:40',
        driverId: 'DRV-2003',
        location: 'Cleveland, OH',
        description: 'I-77 Southbound weigh station',
        assetId: 'TRK-088',
        driverName: 'Mike Johnson',
        violationType: 'Overweight',
        fineAmount: 1100.00,
        currency: 'USD',
        status: 'Due',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
    {
        id: '14',
        offenseNumber: 'OFF-84742',
        date: '2025-01-18',
        time: '14:55',
        driverId: 'DRV-2001',
        location: 'Nashville, TN',
        description: 'I-40 Eastbound downtown area',
        assetId: 'TRK-042',
        driverName: 'John Smith',
        violationType: 'Parking',
        fineAmount: 75.00,
        currency: 'USD',
        status: 'Closed',
        hasTicketFile: false,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    },
];
