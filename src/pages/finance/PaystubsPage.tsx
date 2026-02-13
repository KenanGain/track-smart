
import React, { useState, useMemo } from 'react';
import { 
  Search,
  Plus,
  UploadCloud, 
  X,
  ChevronDown,
  DollarSign,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  FileText,
  Download,
  Clock,
  TrendingUp,
  Columns,
  ArrowUpDown
} from 'lucide-react';

// --- Mock Data ---
import { MOCK_DRIVERS } from '../../data/mock-app-data';
import { INITIAL_PAYSTUBS } from '../../data/paystubs.data';
import type { Paystub } from '../../data/paystubs.data';

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    "Paid": "bg-green-100 text-green-800 border-green-200",
    "Pending": "bg-amber-100 text-amber-800 border-amber-200",
    "Processing": "bg-blue-100 text-blue-800 border-blue-200",
    "Draft": "bg-gray-100 text-gray-600 border-gray-200"
  };

  return (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${styles[status] || styles['Draft']}`}>
      {status}
    </span>
  );
};

const Modal = ({ isOpen, onClose, children, title }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const PaystubDetailsModal = ({ stub, onClose, onEdit }: { stub: Paystub | null, onClose: () => void, onEdit?: () => void }) => {
  if (!stub) return null;

  return (
    <Modal isOpen={!!stub} onClose={onClose} title={`Paystub Details: ${stub.id}`}>
       <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-start">
             <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${stub.color}`}>
                  {stub.avatar}
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900">{stub.driverName}</h3>
                   <p className="text-sm text-gray-500">Period: {stub.payPeriod}</p>
                </div>
             </div>
             <div className="text-right">
                <StatusBadge status={stub.status} />
                <p className="text-xs text-gray-400 mt-2">Paid: {stub.paidDate}</p>
                {onEdit && (
                    <button 
                        onClick={onEdit}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline block w-full text-right"
                    >
                        Edit Paystub
                    </button>
                )}
             </div>
          </div>

          {/* Financials Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Gross Pay</p>
                <p className="text-2xl font-bold text-gray-900">${stub.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <div className="mt-2 text-xs text-blue-800 flex justify-between">
                  <span>Distance: {stub.miles.toLocaleString()} {stub.distanceUnit}</span>
               </div>
            </div>
             <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Net Pay</p>
                <p className="text-2xl font-bold text-gray-900">${stub.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <p className="mt-2 text-xs text-green-800">Final Payout Amount</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Taxes</p>
                <p className="text-xl font-bold text-gray-900">-${stub.taxes.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
             </div>
             <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Deductions</p>
                <p className="text-xl font-bold text-gray-900">-${stub.deductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <p className="mt-1 text-xs text-red-800 italic">{stub.deductionDesc || 'No description'}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Reimbursements</p>
                <p className="text-xl font-bold text-gray-900">+${stub.reimbursement.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
             </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={16} /> Download PDF
             </button>
             <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Close
             </button>
          </div>
       </div>
    </Modal>
  );
};

const InputGroup = ({ label, type = "text", placeholder, name, value, onChange, icon: Icon, step }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
        placeholder={placeholder}
      />
      {Icon && (
        <div className="absolute left-3 top-2.5 text-gray-400">
          <Icon size={18} />
        </div>
      )}
    </div>
  </div>
);

interface PaystubsPageProps {
    driverId?: string;
    onPaystubChange?: () => void;
}

export const PaystubsPage = (props: PaystubsPageProps) => {
  const { driverId } = props;
  const [paystubs, setPaystubs] = useState<Paystub[]>(INITIAL_PAYSTUBS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Paystubs");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [driverFilter, setDriverFilter] = useState("All");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // 'driver', or null
  
  // Sort & Column Visibility State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    driver: true,
    date: true,
    miles: true,
    gross: true,
    deductions: true,
    reimbursement: true,
    taxes: true,
    net: true,
    paidDate: true,
    status: true,
    actions: true
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  const formatCurrency = (value: number, currencyCode: string) => {
    const symbol = currencyCode === 'CAD' ? 'C$' : '$';
    return `${symbol}${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [viewingStub, setViewingStub] = useState<Paystub | null>(null);
  const [editingStubId, setEditingStubId] = useState<number | null>(null);
  const isEditing = !!editingStubId;
  
  // New Paystub Form State
  const [formData, setFormData] = useState({
    driverId: driverId || "",
    startDate: "",
    endDate: "",
    miles: "",
    distanceUnit: "mi",
    currency: "CAD",
    grossPay: "",
    taxes: "",
    deductions: "",
    reimbursement: "",
    deductionDesc: ""
  });

  React.useEffect(() => {
    if (driverId) {
      setFormData(prev => ({ ...prev, driverId }));
    }
  }, [driverId]);

  // Close KPI dropdown when clicking outside
  React.useEffect(() => {
    if (activeDropdown && activeDropdown.startsWith('kpi-filter-')) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // Check if click is outside dropdown
        if (!target.closest('.kpi-dropdown-container')) {
          setActiveDropdown(null);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  // Extract unique options for dropdowns
  const drivers = useMemo(() => ["All", ...new Set(paystubs.map(s => s.driverName))], [paystubs]);

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("All Paystubs");
    setDateRange({ start: "", end: "" });
    setDriverFilter("All");
  };

  const resetForm = () => {
      setFormData({
        driverId: driverId || "",
        startDate: "",
        endDate: "",
        miles: "",
        distanceUnit: "mi",
        currency: "CAD",
        grossPay: "",
        taxes: "",
        deductions: "",
        reimbursement: "",
        deductionDesc: ""
      });
      setUploadedFileName("");
      setEditingStubId(null);
  };

  const handleOpenAddModal = () => {
      resetForm();
      setIsModalOpen(true);
  };

  const handleOpenEditModal = (stub: Paystub) => {
      setEditingStubId(stub.id);
      
      setFormData({
        driverId: stub.driverId || "",
        startDate: stub.date || "", 
        endDate: "", 
        miles: (stub.miles || 0).toString(),
        distanceUnit: stub.distanceUnit || "mi",
        currency: stub.currency || "CAD",
        grossPay: (stub.grossPay || 0).toString(),
        taxes: (stub.taxes || 0).toString(),
        deductions: (stub.deductions || 0).toString(),
        reimbursement: (stub.reimbursement || 0).toString(),
        deductionDesc: stub.deductionDesc || ""
      });
      setIsModalOpen(true);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const miles = parseFloat(formData.miles) || 0;
    const distanceUnit = formData.distanceUnit as 'mi' | 'km';
    const currency = formData.currency as 'USD' | 'CAD';
    const gross = parseFloat(formData.grossPay) || 0;
    const taxes = parseFloat(formData.taxes) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const reimbursement = parseFloat(formData.reimbursement) || 0;
    const net = gross - deductions - taxes + reimbursement;

    const selectedDriver = MOCK_DRIVERS.find(d => d.id === formData.driverId);
    const driverName = selectedDriver ? selectedDriver.name : "Unknown Driver";

    // Format Period
    let periodStr = "Current";
    if (formData.startDate && formData.endDate) {
        const sDate = new Date(formData.startDate);
        const eDate = new Date(formData.endDate);
        // Add one day to fix timezone off-by-one errors if using UTC input
        const sDateFix = new Date(sDate.getTime() + sDate.getTimezoneOffset() * 60000);
        const eDateFix = new Date(eDate.getTime() + eDate.getTimezoneOffset() * 60000);
        
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        periodStr = `${fmt(sDateFix)} - ${fmt(eDateFix)}`;
    } else if (editingStubId) {
        // Keep existing period if not changing dates
        const existing = paystubs.find(p => p.id === editingStubId);
        if (existing) periodStr = existing.payPeriod;
    }

    if (editingStubId) {
        // Update Existing
        setPaystubs(paystubs.map(p => p.id === editingStubId ? {
            ...p,
            driverId: formData.driverId,
            driverName: driverName,
            date: formData.startDate || p.date,
            payPeriod: periodStr,
            miles,
            distanceUnit,
            currency,
            grossPay: gross,
            taxes,
            deductions,
            deductionDesc: formData.deductionDesc || "Misc",
            reimbursement,
            netPay: net,
            // Keep avatar/color consistent or update if driver changed (advanced)
        } : p));
    } else {
        // Create New
        const newStub: Paystub = {
          id: Date.now(),
          driverId: formData.driverId,
          driverName: driverName,
          date: formData.startDate || new Date().toISOString().split('T')[0],
          payPeriod: periodStr,
          miles: miles,
          distanceUnit: distanceUnit,
          currency: currency,
          grossPay: gross,
          taxes: taxes,
          deductions: deductions,
          deductionDesc: formData.deductionDesc || "Misc",
          reimbursement: reimbursement,
          netPay: net,
          paidDate: "-", 
          status: "Draft",
          avatar: (driverName || "ND").split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase(),
          color: "bg-gray-100 text-gray-700",
          fileName: uploadedFileName || ""
        };

        // Mock Document Upload if file present
        if (uploadedFileName && formData.driverId) {
            const driverIndex = MOCK_DRIVERS.findIndex(d => d.id === formData.driverId);
            if (driverIndex >= 0) {
                const newDoc = {
                    id: `doc_ps_${Date.now()}`,
                    typeId: 'DT-PAYSTUB',
                    name: `Paystub ${periodStr}`,
                    dateUploaded: new Date().toLocaleDateString(),
                    expiryDate: undefined,
                    status: 'Active',
                    hasUpload: true,
                    fileName: uploadedFileName
                };
                if (!MOCK_DRIVERS[driverIndex].documents) {
                    MOCK_DRIVERS[driverIndex].documents = [];
                }
                MOCK_DRIVERS[driverIndex].documents.push(newDoc);
            }
        }
        
        setPaystubs([newStub, ...paystubs]);
    }
    
    // Notify parent
    props.onPaystubChange?.();

    setIsModalOpen(false);
    resetForm(); 

  };

  // Filter Logic
  const filteredPaystubs = useMemo(() => {
    return paystubs.filter(stub => {
      // 0. Driver Prop Filter
      if (driverId && stub.driverId !== driverId) return false;

      // 1. Search Query
      const matchesSearch = stub.driverName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            stub.payPeriod.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Tab Filter
      const statusMap: Record<string, string> = {
        "All Paystubs": "All",
        "Paid": "Paid",
        "Pending": "Pending",
        "Drafts": "Draft"
      };
      const targetStatus = statusMap[filterStatus];
      const matchesStatus = targetStatus === "All" || stub.status === targetStatus;

      // 3. Dropdown Filters
      const matchesDriver = driverFilter === "All" || stub.driverName === driverFilter;
      
      // 4. Currency Filter - REMOVED per request
      // const stubCurrency = stub.currency || 'CAD';
      // const matchesCurrency = currency === "All" || stubCurrency === currency;

      // 4. Date Range Filter
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
          const stubDate = new Date(stub.date);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          // Include end date (set time to end of day)
          endDate.setHours(23, 59, 59, 999);
          matchesDate = stubDate >= startDate && stubDate <= endDate;
      } else if (dateRange.start) {
          const stubDate = new Date(stub.date);
          const startDate = new Date(dateRange.start);
          matchesDate = stubDate >= startDate;
      } else if (dateRange.end) {
          const stubDate = new Date(stub.date);
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = stubDate <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDriver && matchesDate;
    }).sort((a, b) => {
        if (!sortConfig) return new Date(b.date).getTime() - new Date(a.date).getTime();

        let aVal: any = a[sortConfig.key as keyof typeof a];
        let bVal: any = b[sortConfig.key as keyof typeof b];

        // Handle specific sort keys
        if (sortConfig.key === 'driver') { aVal = a.driverName; bVal = b.driverName; }
        if (sortConfig.key === 'gross') { aVal = a.grossPay; bVal = b.grossPay; }
        if (sortConfig.key === 'net') { aVal = a.netPay; bVal = b.netPay; }
        // Add other numeric fields as needed

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [paystubs, searchQuery, filterStatus, dateRange, driverFilter, driverId, sortConfig]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, dateRange, driverFilter, driverId, itemsPerPage, sortConfig]);

  const paginatedPaystubs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPaystubs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPaystubs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPaystubs.length / itemsPerPage);

  // --- KPI Calculations ---
  // Common
  const calculateTotals = (stubs: Paystub[]) => {
      const usdStart = { gross: 0, deductions: 0, net: 0, pending: 0, taxes: 0 };
      const cadStart = { gross: 0, deductions: 0, net: 0, pending: 0, taxes: 0 };

      return stubs.reduce((acc, curr) => {
          const currCode = curr.currency || 'CAD';
          const target = currCode === 'USD' ? acc.usd : acc.cad;
          
          target.gross += curr.grossPay;
          target.deductions += curr.deductions;
          target.net += curr.netPay;
          target.taxes += (curr.taxes || 0);
          if (curr.status !== 'Paid') {
              target.pending += curr.netPay;
          }
          return acc;
      }, { usd: { ...usdStart }, cad: { ...cadStart } });
  };

  const totals = calculateTotals(filteredPaystubs);
  
  // Helper to format dual values
  const getDualValue = (usdVal: number, cadVal: number) => {
      // Always show dual if currency filter logic is removed/hidden
      // if (currency !== "All") return null;
      return [
          { value: usdVal, prefix: '$', label: 'USD' },
          { value: cadVal, prefix: 'C$', label: 'CAD' }
      ];
  };

  // Default KPIs (Fleet View)
  const getCurrencySymbol = (code: string) => {
     // if (code === "All") return ""; // Custom rendering
      switch(code) {
          case 'USD': return '$';
          case 'CAD': return 'C$';
          case 'EUR': return '€';
          case 'GBP': return '£';
          default: return '$';
      }
  };

  const symbol = getCurrencySymbol("All");

  const [payoutFilter, setPayoutFilter] = useState('All Time');

  // Filter totals by date range
  const getFilteredTotals = (range: string) => {
      const now = new Date();
      let cutoff = new Date(0); // Default to epoch (All Time)

      if (range === 'Last Month') {
          cutoff = new Date();
          cutoff.setDate(now.getDate() - 30);
      } else if (range === 'Last 6 Months') {
          cutoff = new Date();
          cutoff.setMonth(now.getMonth() - 6);
      } else if (range === 'Last Year') {
          cutoff = new Date();
          cutoff.setFullYear(now.getFullYear() - 1);
      }

      // Filter all paystubs (not just currently searched ones) to get accurate KPI
      const relevantStubs = paystubs.filter(s => {
          const d = new Date(s.paidDate || s.date);
          return d >= cutoff;
      });

      const usdNet = relevantStubs.filter(s => (s.currency || 'CAD') === 'USD').reduce((sum, s) => sum + s.netPay, 0);
      const cadNet = relevantStubs.filter(s => (s.currency || 'CAD') === 'CAD').reduce((sum, s) => sum + s.netPay, 0);
      
      return { usd: usdNet, cad: cadNet };
  };

  const filteredKPIVals = getFilteredTotals(payoutFilter);
  // Default to sum of both currencies since filter is removed
  const currentFilteredNet = filteredKPIVals.usd + filteredKPIVals.cad;

  // Determine values based on selection - Default to All
  const currentTotalNet = totals.usd.net + totals.cad.net;
  const currentPending = totals.usd.pending + totals.cad.pending;
  const currentTotalGross = totals.usd.gross + totals.cad.gross;



  const defaultKPIs = {
      kpi1: { 
          label: "Latest Paid", 
          sub: "Period earnings", 
          value: currentFilteredNet, 
          color: "blue", 
          icon: DollarSign,
          badge: payoutFilter,
          filterOptions: ['Last Month', 'Last 6 Months', 'Last Year', 'All Time'], 
          onFilterChange: setPayoutFilter,
          chartType: "wave",
          prefix: symbol,
          multi: getDualValue(filteredKPIVals.usd, filteredKPIVals.cad)
      },
      kpi2: { 
          label: "Pending", 
          sub: "Awaiting approval", 
          value: currentPending, 
          color: "orange", 
          icon: Clock,
          badge: "Unpaid Stubs", 
          chartType: "progress",
          progressValue: currentTotalGross > 0 ? (currentPending/currentTotalGross)*100 : 0, 
          progressText: "Processed",
          prefix: symbol,
          multi: getDualValue(totals.usd.pending, totals.cad.pending)
      },
      kpi3: { 
          label: "Total Paid", 
          sub: "Lifetime Net Pay", 
          value: currentTotalNet, 
          color: "green", 
          icon: DollarSign, // Changed from BarChart3 to DollarSign as it's total money
          badge: "All Time", 
          chartType: "wave", // Using wave for total trend
          trend: "+12.5%",
          prefix: symbol,
          multi: getDualValue(totals.usd.net, totals.cad.net)
      }
  };

  // Driver View KPIs - replicating similar structure
  const driverKPIs = {
      kpi1: { 
          label: "Latest Paid", 
          sub: "Period earnings", 
          value: currentFilteredNet, // Use filtered for driver too for consistency? Or keep it latest stub? User was ambiguous, let's match Fleet view structure for consistency.
          color: "blue", 
          icon: DollarSign,
          badge: payoutFilter,
          filterOptions: ['Last Month', 'Last 6 Months', 'Last Year', 'All Time'],
          onFilterChange: setPayoutFilter,
          chartType: "wave",
          prefix: symbol,
          multi: getDualValue(filteredKPIVals.usd, filteredKPIVals.cad) 
      },
      kpi2: { 
           label: "Pending", 
           sub: "Awaiting approval", 
           value: currentPending, 
           color: "orange", 
           icon: Clock,
           badge: "Unpaid Stubs", 
           chartType: "progress",
           progressValue: currentTotalGross > 0 ? (currentPending/currentTotalGross)*100 : 0, 
           progressText: "Processed",
           prefix: symbol,
           multi: getDualValue(totals.usd.pending, totals.cad.pending)
      },
      kpi3: { 
          label: "Total Paid", 
          sub: "Lifetime Net Pay", 
          value: currentTotalNet, 
          color: "green", 
          icon: DollarSign,
          badge: "All Time",
          chartType: "wave", 
          prefix: symbol,
          multi: getDualValue(totals.usd.net, totals.cad.net)
      }
  };

  const kpis = driverId ? driverKPIs : defaultKPIs;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 transition-colors duration-200">
      
      {/* Dropdown Backdrop - only for driver filter, not KPI filters */}
      {activeDropdown && !activeDropdown.startsWith('kpi-filter-') && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setActiveDropdown(null)}
        />
      )}

      {/* Details Modal */}
      <PaystubDetailsModal
        stub={viewingStub}
        onClose={() => setViewingStub(null)}
        onEdit={() => {
            if (viewingStub) {
                setViewingStub(null);
                handleOpenEditModal(viewingStub);
            }
        }}
      />

       {/* Add/Edit Modal */}
       <Modal
        isOpen={isModalOpen && (isEditing || !viewingStub)}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={isEditing ? "Edit Paystub" : "Add New Paystub"}
      >
        <div className="space-y-4">
             {/* Driver Select */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Driver</label>
                <select 
                    name="driverId" 
                    value={formData.driverId} 
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    disabled={isEditing || !!driverId}
                >
                    <option value="">Select a driver...</option>
                    {MOCK_DRIVERS.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                    ))}
                </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <InputGroup
                    label="Start Date"
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                 />
                 <InputGroup
                    label="End Date"
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                 />
             </div>

             <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                 <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Earnings & Distance</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Distance Driven</label>
                        <div className="flex">
                            <input
                              type="number"
                              name="miles"
                              value={formData.miles}
                              onChange={handleInputChange}
                              placeholder="0"
                              className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                            />
                            <select
                                name="distanceUnit"
                                value={formData.distanceUnit}
                                onChange={handleInputChange}
                                className="bg-gray-100 border border-l-0 border-gray-300 text-gray-700 text-sm rounded-r-lg px-3 py-2.5 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="mi">mi</option>
                                <option value="km">km</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                         <div className="flex-1">
                            <InputGroup
                              label="Gross Pay"
                              type="number"
                              step="0.01"
                              name="grossPay"
                              placeholder="0.00"
                              value={formData.grossPay}
                              onChange={handleInputChange}
                              // icon={DollarSign}
                            />
                         </div>
                         <div className="w-24">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                            >
                                <option value="CAD">CAD</option>
                                <option value="USD">USD</option>
                            </select>
                         </div>
                    </div>
                 </div>
             </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                 <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Deductions & Taxes</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup
                      label="Taxes Withheld ($)"
                      type="number"
                      step="0.01"
                      name="taxes"
                      placeholder="0.00"
                      value={formData.taxes}
                      onChange={handleInputChange}
                    />
                    <InputGroup
                      label="Other Deductions ($)"
                      type="number"
                      step="0.01"
                      name="deductions"
                      placeholder="0.00"
                      value={formData.deductions}
                      onChange={handleInputChange}
                    />
                 </div>
                 <InputGroup
                    label="Deduction Description"
                    placeholder="e.g. Insurance, Lease, Garnishment..."
                    name="deductionDesc"
                    value={formData.deductionDesc}
                    onChange={handleInputChange}
                 />
            </div>

            <div className="p-4 rounded-xl border border-green-200 bg-green-50 space-y-4">
                 <h4 className="font-semibold text-green-900 border-b border-green-200 pb-2">Reimbursements & Net</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup
                      label="Reimbursements ($)"
                      type="number"
                      step="0.01"
                      name="reimbursement"
                      placeholder="0.00"
                      value={formData.reimbursement}
                      onChange={handleInputChange}
                    />
                    <div className="bg-white p-3 rounded-lg border border-green-200 text-center">
                        <span className="block text-xs font-bold text-green-600 uppercase">Estimated Net Pay</span>
                        <span className="block text-xl font-bold text-gray-900">
                            ${(
                                (parseFloat(formData.grossPay)||0) - 
                                (parseFloat(formData.deductions)||0) - 
                                (parseFloat(formData.taxes)||0) + 
                                (parseFloat(formData.reimbursement)||0)
                              ).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </div>
                 </div>
            </div>

             <div className="border-t border-gray-200 pt-4">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Upload Paystub File (Optional)</label>
                 <div 
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('paystub-file')?.click()}
                 >
                     <input type="file" id="paystub-file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                     <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                     <p className="text-sm text-gray-500">Click to upload PDF or Image</p>
                 </div>
             </div>
             
             {/* File Upload Display */}
             {uploadedFileName && (
                 <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                     <FileText className="w-4 h-4 text-indigo-600" />
                     <span className="text-sm text-indigo-700 flex-1 truncate">{uploadedFileName}</span>
                     <button 
                        onClick={() => setUploadedFileName("")}
                        className="text-indigo-400 hover:text-indigo-700"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                 </div>
             )}

             <div className="flex justify-end gap-3 pt-2">
                 <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                 >
                     Cancel
                 </button>
                 <button 
                    onClick={handleSubmit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                 >
                     {isEditing ? 'Update Paystub' : 'Create Paystub'}
                 </button>
             </div>
        </div>
      </Modal>
      <PaystubDetailsModal stub={viewingStub} onClose={() => setViewingStub(null)} />

      <div className="px-8 py-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Paystub Overview</h1>
            <p className="text-gray-500 max-w-3xl leading-relaxed">
              Manage driver earnings, deductions, and settlement records. Review pending payments and historical paystubs.
            </p>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium flex items-center transition-all focus:ring-4 focus:ring-blue-300"
          >
            <Plus size={20} className="mr-2" />
            UPLOAD PAYMENT
          </button>
        </div>

        {/* Indicators Cards */}
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Object.values(kpis).map((kpi: any, idx) => (
               <div key={idx} className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative group hover:shadow-md transition-all duration-300 flex flex-col ${activeDropdown === `kpi-filter-${idx}` ? 'z-50' : ''}`}>
                {/* Background Decor */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <kpi.icon size={100} className={`text-${kpi.color}-600`} />
                    </div>
                </div>
                
                {/* Header */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 bg-${kpi.color}-50 rounded-xl text-${kpi.color}-600 shadow-sm ring-1 ring-${kpi.color}-100`}>
                        <kpi.icon size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{kpi.label}</h3>
                        <p className="text-[11px] text-gray-400">{kpi.sub}</p>
                      </div>
                    </div>
                    {kpi.filterOptions ? (
                        <div className="relative inline-flex items-center kpi-dropdown-container">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(activeDropdown === `kpi-filter-${idx}` ? null : `kpi-filter-${idx}`);
                                }}
                                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-${kpi.color}-50 text-${kpi.color}-600 border border-${kpi.color}-100 hover:bg-${kpi.color}-100 transition-colors cursor-pointer`}
                            >
                                <span>{kpi.badge}</span>
                                <ChevronDown size={12} strokeWidth={2.5} className={`transition-transform duration-200 ${activeDropdown === `kpi-filter-${idx}` ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {activeDropdown === `kpi-filter-${idx}` && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1 z-[60] animate-in fade-in zoom-in-95 duration-200">
                                    {kpi.filterOptions.map((opt: string) => (
                                        <button
                                            key={opt}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                kpi.onFilterChange && kpi.onFilterChange(opt);
                                                setActiveDropdown(null);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${kpi.badge === opt ? `text-${kpi.color}-600 font-semibold bg-${kpi.color}-50` : 'text-gray-700'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-${kpi.color}-50 text-${kpi.color}-700 border border-${kpi.color}-100`}>
                            {kpi.badge}
                        </span>
                    )}
                  </div>

                  {/* Body Values */}
                  <div className="mb-2">
                    {kpi.multi ? (
                        <>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {kpi.multi[0].prefix}{kpi.multi[0].value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                                <span className="text-base font-semibold text-gray-400">{kpi.multi[0].label}</span>
                            </div>
                            <div className="flex items-center mt-1 space-x-2">
                                <span className="text-sm font-medium text-gray-500">
                                    {kpi.multi[1].prefix}{kpi.multi[1].value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">{kpi.multi[1].label}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-baseline space-x-2">
                            <span className="text-3xl font-bold text-gray-900 tracking-tight">
                                {kpi.prefix}{kpi.value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </span>
                        </div>
                    )}
                  </div>
                </div>

                {/* Footer Chart Area */}
                <div className="relative z-10 pt-3 border-t border-gray-100 mt-auto flex-shrink-0">
                    {kpi.chartType === 'wave' && (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-medium text-gray-400">Payout Trend</span>
                                <div className={`flex items-center text-${kpi.color}-600 text-[11px] font-bold bg-${kpi.color}-50 px-2 py-0.5 rounded-full`}>
                                    <TrendingUp size={12} className="mr-1" />
                                    {kpi.trend || '+12.5%'}
                                </div>
                            </div>

                            <div className={`h-14 w-full text-${kpi.color}-500`}>
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 50">
                                    <defs>
                                        <linearGradient id={`gradient-${idx}`} x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"></stop>
                                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02"></stop>
                                        </linearGradient>
                                    </defs>
                                    <path d="M0 42 C 30 42, 50 28, 80 32 S 120 15, 150 18 S 180 5, 200 3 V 50 H 0 Z" fill={`url(#gradient-${idx})`}></path>
                                    <path d="M0 42 C 30 42, 50 28, 80 32 S 120 15, 150 18 S 180 5, 200 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                                    <circle cx="200" cy="3" r="3.5" fill="white" stroke="currentColor" strokeWidth="2"></circle>
                                    <circle cx="80" cy="32" r="2" fill="currentColor" opacity="0.3"></circle>
                                    <circle cx="150" cy="18" r="2" fill="currentColor" opacity="0.3"></circle>
                                </svg>
                            </div>
                        </>
                    )}

                    {kpi.chartType === 'progress' && (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-medium text-gray-400">{kpi.progressText || 'Settlement Rate'}</span>
                                <span className={`text-[11px] font-bold text-${kpi.color}-600`}>{Math.round(kpi.progressValue || 0)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div 
                                    className={`bg-${kpi.color}-500 h-2 rounded-full transition-all duration-1000 ease-out`}
                                    style={{ width: `${kpi.progressValue || 0}%` }}
                                />
                            </div>
                             <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
                                <span>0%</span>
                                <span>100%</span>
                            </div>
                        </>
                    )}

                    {kpi.chartType === 'bars' && (
                         <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-medium text-gray-400">Last 5 Periods</span>
                                <div className={`flex items-center text-${kpi.color}-600 text-[11px] font-bold bg-${kpi.color}-50 px-2 py-0.5 rounded-full`}>
                                    {kpi.badgeText || 'Consistent'}
                                </div>
                            </div>
                            <div className="flex items-end justify-between h-12 gap-1.5">
                                <div className={`w-full bg-${kpi.color}-200 rounded-md hover:bg-${kpi.color}-300 transition-all duration-200 h-[40%]`}></div>
                                <div className={`w-full bg-${kpi.color}-300 rounded-md hover:bg-${kpi.color}-400 transition-all duration-200 h-[60%]`}></div>
                                <div className={`w-full bg-${kpi.color}-200 rounded-md hover:bg-${kpi.color}-300 transition-all duration-200 h-[50%]`}></div>
                                <div className={`w-full bg-${kpi.color}-400 rounded-md hover:bg-${kpi.color}-500 transition-all duration-200 h-[75%]`}></div>
                                <div className={`w-full bg-${kpi.color}-500 rounded-md hover:bg-${kpi.color}-600 transition-all duration-200 h-[90%]`}></div>
                            </div>
                        </>
                    )}
                </div>

              </div>
             ))}
          </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto no-scrollbar gap-1 px-4 pt-4">
              {["All Paystubs", "Paid", "Pending", "Drafts"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === tab
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Filters & Search Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      placeholder="From"
                    />
                  </div>
                  <span className="text-gray-400">-</span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input 
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      placeholder="To"
                    />
                  </div>
              </div>

              {/* Driver Dropdown - Only show if NO driverId prop */}
              {!driverId && (
                <div className="relative z-50">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'driver' ? null : 'driver')}
                    className={`flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm font-medium text-gray-500 hover:border-blue-600 focus:outline-none transition-all shadow-sm ${activeDropdown === 'driver' ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-gray-200'}`}
                  >
                    <User size={18} />
                    <span>Driver</span>
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-gray-100 rounded text-gray-700 min-w-[20px] text-center">
                      {driverFilter === 'All' ? 'All' : driverFilter}
                    </span>
                    <ChevronDown size={18} className="text-gray-400" />
                  </button>

                  {activeDropdown === 'driver' && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto">
                      {drivers.map(d => (
                        <button 
                          key={d} 
                          onClick={() => { setDriverFilter(d); setActiveDropdown(null); }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 ${driverFilter === d ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                        >
                          {d === 'All' ? 'All Drivers' : d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

                  <div className="relative">
                      <button 
                          onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-500 hover:border-blue-600 focus:outline-none transition-all shadow-sm"
                      >
                          <Columns size={18} />
                          <span>Columns</span>
                          <ChevronDown size={18} className="text-gray-400" />
                      </button>
                      {isColumnDropdownOpen && (
                          <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsColumnDropdownOpen(false)}></div>
                              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-20 max-h-60 overflow-y-auto">
                                  {Object.keys(columnVisibility).map(col => (
                                      <label key={col} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                                          <input 
                                              type="checkbox" 
                                              checked={columnVisibility[col]} 
                                              onChange={(e) => setColumnVisibility(prev => ({ ...prev, [col]: e.target.checked }))}
                                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 h-4 w-4"
                                          />
                                          <span className="text-sm text-gray-700 capitalize">{col === 'paidDate' ? 'Payment Date' : col}</span>
                                      </label>
                                  ))}
                              </div>
                          </>
                      )}
                  </div>
                  <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>
              
              <button 
                onClick={resetFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Reset filters
              </button>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors shadow-sm" 
                  placeholder="Search drivers or paystubs..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap hidden lg:block border-l border-gray-200 pl-4">
                <span className="font-semibold text-gray-900">{filteredPaystubs.length}</span> Records Found
              </div>
            </div>
          </div>

          {/* Table - Header Color Updated to Light Gray */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {!driverId && columnVisibility.driver && (
                      <th 
                          className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'driver', direction: sortConfig?.key === 'driver' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center gap-1">
                              Driver Name
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'driver' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.date && (
                      <th 
                          className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'date', direction: sortConfig?.key === 'date' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center gap-1">
                              Date
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'date' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.miles && (
                      <th 
                          className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'miles', direction: sortConfig?.key === 'miles' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-center gap-1">
                              Miles/KM Driven
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'miles' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.gross && (
                      <th 
                          className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'gross', direction: sortConfig?.key === 'gross' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-end gap-1">
                              Gross Pay
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'gross' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.deductions && (
                      <th 
                          className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'deductions', direction: sortConfig?.key === 'deductions' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-end gap-1">
                              Deductions
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'deductions' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.reimbursement && (
                      <th 
                          className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'reimbursement', direction: sortConfig?.key === 'reimbursement' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-end gap-1">
                              Reimbursement
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'reimbursement' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.taxes && (
                      <th 
                          className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'taxes', direction: sortConfig?.key === 'taxes' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-end gap-1">
                              Taxes
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'taxes' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.net && (
                      <th 
                          className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'net', direction: sortConfig?.key === 'net' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-end gap-1">
                              Net Pay
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'net' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.paidDate && (
                      <th 
                          className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'paidDate', direction: sortConfig?.key === 'paidDate' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center gap-1">
                              Payment Date
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'paidDate' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.status && (
                      <th 
                          className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group" 
                          scope="col"
                          onClick={() => setSortConfig({ key: 'status', direction: sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                      >
                          <div className="flex items-center justify-center gap-1">
                              Status
                              <ArrowUpDown className={`w-3 h-3 text-gray-400 ${sortConfig?.key === 'status' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                          </div>
                      </th>
                  )}
                  {columnVisibility.actions && <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider" scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPaystubs.map((stub) => (
                  <tr key={stub.id} className="hover:bg-gray-50 transition-colors">
                    {!driverId && columnVisibility.driver && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mr-3 ${stub.color}`}>
                            {stub.avatar}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{stub.driverName}</div>
                        </div>
                      </td>
                    )}
                    {columnVisibility.date && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stub.date}</td>}
                    {columnVisibility.miles && <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{stub.miles.toLocaleString()} {stub.distanceUnit}</td>}
                    {columnVisibility.gross && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">{formatCurrency(stub.grossPay, stub.currency || 'CAD')}</td>}
                    {columnVisibility.deductions && <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">-{formatCurrency(stub.deductions, stub.currency || 'CAD')}</td>}
                    {columnVisibility.reimbursement && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                      {stub.reimbursement > 0 ? `+${formatCurrency(stub.reimbursement, stub.currency || 'CAD')}` : '-'}
                        </td>
                    )}
                    {columnVisibility.taxes && <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600">-{formatCurrency(stub.taxes, stub.currency || 'CAD')}</td>}
                    {columnVisibility.net && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">{formatCurrency(stub.netPay, stub.currency || 'CAD')}</td>}
                    {columnVisibility.paidDate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stub.paidDate}</td>}
                    {columnVisibility.status && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={stub.status} />
                        </td>
                    )}
                    {columnVisibility.actions && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingStub(stub)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1" 
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(stub)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1" 
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-red-600 transition-colors p-1" 
                          title="Delete" 
                          onClick={() => {
                           if(window.confirm("Are you sure you want to delete this paystub?")) {
                             setPaystubs(paystubs.filter(p => p.id !== stub.id));
                           }
                        }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                        </td>
                    )}
                  </tr>
                ))}
                {filteredPaystubs.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                       No records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-900">{filteredPaystubs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredPaystubs.length)}</span> of <span className="font-medium text-gray-900">{filteredPaystubs.length}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              <div>
                <nav aria-label="Pagination" className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft size={18} />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum 
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {pageNum}
                        </button>
                      );
                  })}
                   {totalPages > 5 && <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>}
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight size={18} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>

      </div>



    </div>
  );
};
