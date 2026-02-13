
import { MOCK_DRIVERS } from './mock-app-data';

export interface Paystub {
  id: number;
  driverId: string; // Link to MOCK_DRIVERS
  driverName: string;
  date: string;
  payPeriod: string;
  miles: number;
  distanceUnit: 'mi' | 'km'; // New field
  currency: 'USD' | 'CAD'; // New field
  // rate: number; // Removed
  grossPay: number;
  deductions: number;
  taxes: number; // New field
  deductionDesc: string;
  reimbursement: number;
  netPay: number; // gross - deductions - taxes + reimbursement
  paidDate: string;
  status: "Paid" | "Pending" | "Processing" | "Draft";
  avatar: string;
  color: string;
  hasUpload?: boolean;
  fileName?: string;
}

export const INITIAL_PAYSTUBS: Paystub[] = [
  // --- John Doe (d1 - DRV-2001) History ---
  {
    id: 101,
    driverId: MOCK_DRIVERS[0].id,
    driverName: MOCK_DRIVERS[0].name,
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 2450,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1470.00,
    deductions: 150.00,
    taxes: 200.00,
    deductionDesc: "Insurance",
    reimbursement: 50.00,
    netPay: 1170.00, // 1470 - 150 - 200 + 50
    paidDate: "2023-11-02",
    status: "Paid",
    avatar: "JS",
    color: "bg-blue-100 text-blue-700"
  },
  {
    id: 102,
    driverId: MOCK_DRIVERS[0].id,
    driverName: MOCK_DRIVERS[0].name,
    date: "2023-10-16",
    payPeriod: "Oct 01 - Oct 15",
    miles: 2300,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1380.00,
    deductions: 150.00,
    taxes: 180.00,
    deductionDesc: "Insurance",
    reimbursement: 0.00,
    netPay: 1050.00, // 1380 - 150 - 180
    paidDate: "2023-10-17",
    status: "Paid",
    avatar: "JS",
    color: "bg-blue-100 text-blue-700"
  },
  {
    id: 103,
    driverId: MOCK_DRIVERS[0].id,
    driverName: MOCK_DRIVERS[0].name,
    date: "2023-10-01",
    payPeriod: "Sep 16 - Sep 30",
    miles: 2500,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1500.00,
    deductions: 150.00,
    taxes: 210.00,
    deductionDesc: "Insurance",
    reimbursement: 25.00,
    netPay: 1165.00, // 1500 - 150 - 210 + 25
    paidDate: "2023-10-02",
    status: "Paid",
    avatar: "JS",
    color: "bg-blue-100 text-blue-700"
  },

  // --- Sarah Miller (d2 - DRV-2002) History ---
  {
    id: 201,
    driverId: MOCK_DRIVERS[1].id,
    driverName: MOCK_DRIVERS[1].name,
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 3100,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 2015.00,
    deductions: 200.00,
    taxes: 300.00,
    deductionDesc: "Lease",
    reimbursement: 0.00,
    netPay: 1515.00,
    paidDate: "-",
    status: "Pending",
    avatar: "SM",
    color: "bg-indigo-100 text-indigo-700"
  },
  {
    id: 202,
    driverId: MOCK_DRIVERS[1].id,
    driverName: MOCK_DRIVERS[1].name,
    date: "2023-10-16",
    payPeriod: "Oct 01 - Oct 15",
    miles: 2900,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1885.00,
    deductions: 200.00,
    taxes: 280.00,
    deductionDesc: "Lease",
    reimbursement: 45.00,
    netPay: 1450.00,
    paidDate: "2023-10-17",
    status: "Paid",
    avatar: "SM",
    color: "bg-indigo-100 text-indigo-700"
  },

  // --- Mike Johnson (d3 - DRV-2003) History ---
  {
    id: 301,
    driverId: MOCK_DRIVERS[2].id,
    driverName: MOCK_DRIVERS[2].name,
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 1800,
    distanceUnit: 'mi',
    currency: 'USD',
    grossPay: 990.00,
    deductions: 100.00,
    taxes: 120.00,
    deductionDesc: "Garnishment",
    reimbursement: 0.00,
    netPay: 770.00,
    paidDate: "-",
    status: "Processing",
    avatar: "MJ",
    color: "bg-teal-100 text-teal-700"
  },
  
  // --- Elena Rodriguez (d4 - DRV-2004) History ---
  {
    id: 401,
    driverId: MOCK_DRIVERS[3].id,
    driverName: MOCK_DRIVERS[3].name,
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 2100,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1218.00,
    deductions: 0.00,
    taxes: 150.00,
    deductionDesc: "-",
    reimbursement: 0.00,
    netPay: 1068.00,
    paidDate: "-",
    status: "Draft",
    avatar: "ER",
    color: "bg-gray-200 text-gray-700"
  },

  // --- James Sullivan (DRV-1001) History ---
  {
    id: 501,
    driverId: "DRV-1001",
    driverName: "James Sullivan",
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 2600,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1612.00,
    deductions: 180.00,
    taxes: 220.00,
    deductionDesc: "Insurance",
    reimbursement: 20.00,
    netPay: 1232.00,
    paidDate: "2023-11-02",
    status: "Paid",
    avatar: "JS",
    color: "bg-orange-100 text-orange-700"
  },
  {
    id: 502,
    driverId: "DRV-1001",
    driverName: "James Sullivan",
    date: "2023-10-16",
    payPeriod: "Oct 01 - Oct 15",
    miles: 2550,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1581.00,
    deductions: 180.00,
    taxes: 210.00,
    deductionDesc: "Insurance",
    reimbursement: 0.00,
    netPay: 1191.00,
    paidDate: "2023-10-17",
    status: "Paid",
    avatar: "JS",
    color: "bg-orange-100 text-orange-700"
  },

  // --- Maria Rodriguez (DRV-1002) History ---
  {
    id: 601,
    driverId: "DRV-1002",
    driverName: "Maria Rodriguez",
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 2200,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 1276.00,
    deductions: 100.00,
    taxes: 180.00,
    deductionDesc: "Advances",
    reimbursement: 0.00,
    netPay: 996.00,
    paidDate: "-",
    status: "Pending",
    avatar: "MR",
    color: "bg-purple-100 text-purple-700"
  },

  // --- Robert Chen (DRV-1003) History ---
  {
    id: 701,
    driverId: "DRV-1003",
    driverName: "Robert Chen",
    date: "2023-10-01",
    payPeriod: "Sep 16 - Sep 30",
    miles: 0, 
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 0, 
    deductions: 0,
    taxes: 0,
    deductionDesc: "-", 
    reimbursement: 500.00, // Sick leave payout?
    netPay: 500.00,
    paidDate: "2023-10-02",
    status: "Paid",
    avatar: "RC",
    color: "bg-cyan-100 text-cyan-700"
  },

  // --- Sarah Johnson (DRV-1004) History ---
  {
    id: 801,
    driverId: "DRV-1004",
    driverName: "Sarah Johnson",
    date: "2023-11-01",
    payPeriod: "Oct 16 - Oct 31",
    miles: 2800,
    distanceUnit: 'mi',
    currency: 'USD',
    grossPay: 1820.00,
    deductions: 250.00,
    taxes: 260.00,
    deductionDesc: "Lease",
    reimbursement: 60.00,
    netPay: 1370.00,
    paidDate: "-",
    status: "Processing",
    avatar: "SJ",
    color: "bg-pink-100 text-pink-700"
  },
  {
    id: 802,
    driverId: "DRV-1004",
    driverName: "Sarah Johnson",
    date: "2023-10-16",
    payPeriod: "Oct 01 - Oct 15",
    miles: 2750,
    distanceUnit: 'mi',
    currency: 'USD',
    grossPay: 1787.50,
    deductions: 250.00,
    taxes: 250.00,
    deductionDesc: "Lease",
    reimbursement: 0.00,
    netPay: 1287.50,
    paidDate: "2023-10-17",
    status: "Paid",
    avatar: "SJ",
    color: "bg-pink-100 text-pink-700"
  },

  // --- Michael Brown (DRV-1005) History ---
  {
    id: 901,
    driverId: "DRV-1005",
    driverName: "Michael Brown",
    date: "2023-09-01",
    payPeriod: "Aug 16 - Aug 31",
    miles: 1500,
    distanceUnit: 'mi',
    currency: 'CAD',
    grossPay: 825.00,
    deductions: 50.00,
    taxes: 100.00,
    deductionDesc: "Uniform",
    reimbursement: 0.00,
    netPay: 675.00,
    paidDate: "2023-09-02",
    status: "Paid",
    avatar: "MB",
    color: "bg-slate-200 text-slate-700"
  }
];
