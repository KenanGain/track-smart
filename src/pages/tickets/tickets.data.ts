export interface TicketStats {
    outstandingFines: number;
    openOffenses: number;
    inCourt: number;
    paidThisMonth: number;
}

export type TicketStatus = 'Due' | 'In Court' | 'Paid' | 'Closed';
export type ViolationType = 'Speeding' | 'Overweight' | 'Logbook violation' | 'Equipment defect' | 'Insurance lapse' | 'Red Light' | 'Parking';

export interface TicketRecord {
    id: string;
    offenseNumber: string;
    date: string;
    time: string;
    location: string;
    description: string;
    assetId: string;
    driverName: string;
    violationType: ViolationType;
    fineAmount: number;
    currency: 'USD' | 'CAD';
    status: TicketStatus;
    hasTicketFile: boolean;
    hasReceiptFile: boolean;
    hasNoticeFile: boolean;
    assignedToThirdParty?: boolean;
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
        date: 'Oct 24, 2023',
        time: '02:30 PM',
        location: 'Toronto, ON',
        description: 'Hwy 401 Westbound near ...',
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
        date: 'Oct 20, 2023',
        time: '09:15 AM',
        location: 'Buffalo, NY',
        description: 'I-190 Southbound',
        assetId: 'TRK-118',
        driverName: 'Sarah Connor',
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
        date: 'Oct 15, 2023',
        time: '04:45 PM',
        location: 'Detroit, MI',
        description: 'I-75 Northbound',
        assetId: 'TRK-088',
        driverName: 'Mike Ross',
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
        date: 'Sep 2, 2023',
        time: '11:00 AM',
        location: 'Montreal, QC',
        description: 'Autoroute 40 East',
        assetId: 'TRK-012',
        driverName: 'Louis Litt',
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
        date: 'Oct 28, 2023',
        time: '08:20 AM',
        location: 'Chicago, IL',
        description: 'I-90 Westbound',
        assetId: 'TRK-095',
        driverName: 'Jessica Pearson',
        violationType: 'Insurance lapse',
        fineAmount: 800.00,
        currency: 'USD',
        status: 'Due',
        hasTicketFile: true,
        hasReceiptFile: false,
        hasNoticeFile: false,
        assignedToThirdParty: false
    }
];
