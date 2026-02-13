import { useState } from 'react';
import { 
    AlertCircle, 
    Search, 
    Filter, 
    FileText, 
    Edit2, 
    Eye, 
    Plus,
    Scale,
    CheckCircle,
    DollarSign,
    FileCheck
} from 'lucide-react';

import { MOCK_TICKETS, TICKET_STATS, type TicketStatus, type ViolationType, type TicketRecord } from './tickets.data';

import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';

export const TicketsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Statuses');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTicket, setEditingTicket] = useState<TicketRecord | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<TicketRecord>>({});

    const handleEdit = (ticket: TicketRecord) => {
        setEditingTicket(ticket);
        setFormData({ ...ticket });
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingTicket(null);
        setFormData({
            status: 'Due',
            currency: 'CAD',
            hasTicketFile: false,
            hasReceiptFile: false,
            hasNoticeFile: false,
            assignedToThirdParty: false
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        // Logic to save ticket would go here
        setIsDialogOpen(false);
    };

    const getStatusBadge = (status: TicketStatus) => {
        const styles = {
            'Due': 'bg-yellow-100 text-yellow-800',
            'In Court': 'bg-blue-100 text-blue-800',
            'Paid': 'bg-green-100 text-green-800',
            'Closed': 'bg-slate-100 text-slate-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const getViolationBadge = (type: ViolationType) => {
        const styles: Record<string, string> = {
            'Speeding': 'bg-red-50 text-red-700 border-red-100',
            'Overweight': 'bg-orange-50 text-orange-700 border-orange-100',
            'Logbook violation': 'bg-purple-50 text-purple-700 border-purple-100',
            'Equipment defect': 'bg-slate-100 text-slate-700 border-slate-200',
            'Insurance lapse': 'bg-pink-50 text-pink-700 border-pink-100',
            'Red Light': 'bg-red-50 text-red-700 border-red-100',
            'Parking': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {type}
            </span>
        );
    };

    const filteredTickets = MOCK_TICKETS.filter(ticket => {
        const matchesSearch = 
            ticket.offenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.assetId.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All Statuses' || ticket.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <h1 className="text-2xl font-bold text-slate-900">Tickets & Offenses</h1>
                        </div>
                        <p className="text-slate-500 text-sm">Track traffic violations, fines, legal status, and supporting documents across the fleet.</p>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Offense
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* card 1: Outstanding Fines */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding Fines</p>
                            <p className="text-2xl font-bold text-slate-900">${TICKET_STATS.outstandingFines.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* card 2: Open Offenses */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Open Offenses</p>
                            <p className="text-2xl font-bold text-slate-900">{TICKET_STATS.openOffenses}</p>
                        </div>
                    </div>

                    {/* card 3: In Court */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Scale className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">In Court</p>
                            <p className="text-2xl font-bold text-slate-900">{TICKET_STATS.inCourt}</p>
                        </div>
                    </div>

                    {/* card 4: Paid This Month */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid This Month</p>
                            <p className="text-2xl font-bold text-slate-900">{TICKET_STATS.paidThisMonth}</p>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search offense #, driver, asset..." 
                            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select 
                            className="h-10 pl-2 pr-8 rounded-lg border-0 bg-transparent text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer hover:bg-slate-50 transition-colors"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option>All Statuses</option>
                            <option>Due</option>
                            <option>In Court</option>
                            <option>Paid</option>
                            <option>Closed</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Offense #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asset</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Violation Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fine</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Docs</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer">{ticket.offenseNumber}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900">{ticket.date}</span>
                                                <span className="text-xs text-slate-500">{ticket.time}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900">{ticket.location.split(',')[0]}</span>
                                                <span className="text-xs text-slate-500 truncate max-w-[150px]" title={ticket.description}>
                                                    {ticket.location.split(',')[1] || ''}
                                                    {ticket.description}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{ticket.assetId}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{ticket.driverName}</td>
                                        <td className="px-6 py-4">
                                            {getViolationBadge(ticket.violationType)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                            {ticket.currency === 'CAD' ? 'CA$' : '$'}{ticket.fineAmount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(ticket.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                 <span title="Offense Ticket">
                                                     <FileText className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform ${ticket.hasTicketFile ? 'text-green-600' : 'text-slate-200'}`} />
                                                 </span>
                                                 <span title="Payment Receipt">
                                                     <FileCheck className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform ${ticket.hasReceiptFile ? 'text-green-600' : 'text-slate-200'}`} />
                                                 </span>
                                                 <span title="Notice of Trial">
                                                     <Scale className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform ${ticket.hasNoticeFile ? 'text-gray-600' : 'text-slate-200'}`} />
                                                 </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(ticket)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTickets.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="w-8 h-8 text-slate-300" />
                                                <p>No tickets found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            {editingTicket ? 'Edit Offense' : 'New Offense'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-6 pt-2 space-y-6">
                        {/* Date & Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date & Time</Label>
                                <div className="relative">
                                    <Input 
                                        type="datetime-local" 
                                        defaultValue="2023-10-24T14:30" 
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select 
                                    value={formData.status || 'Due'} 
                                    onValueChange={(v) => setFormData({...formData, status: v as TicketStatus})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Due">Due</SelectItem>
                                        <SelectItem value="In Court">In Court</SelectItem>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                        <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <Label>Street / Specific Location</Label>
                            <Input placeholder="e.g. Hwy 401 Westbound near Keele St" defaultValue={formData.description} />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                             <div className="space-y-2">
                                <Label>City</Label>
                                <Input defaultValue={formData.location?.split(',')[0]} />
                            </div>
                             <div className="space-y-2">
                                <Label>State / Prov.</Label>
                                <Input defaultValue={formData.location?.split(',')[1]?.trim()?.split(' ')[0]} />
                            </div>
                             <div className="space-y-2">
                                <Label>Country</Label>
                                <Select 
                                    value="Canada" 
                                    onValueChange={() => {}}
                                >
                                     <SelectTrigger><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="Canada">Canada</SelectItem>
                                         <SelectItem value="USA">USA</SelectItem>
                                     </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Assignee */}
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Asset</Label>
                                <Input defaultValue={formData.assetId} placeholder="e.g. TRK-042" />
                            </div>
                             <div className="space-y-2">
                                <Label>Driver Name</Label>
                                <Input defaultValue={formData.driverName} placeholder="e.g. John Smith" />
                            </div>
                        </div>

                         {/* Violation Details */}
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Violation Type</Label>
                                <Select 
                                    value={formData.violationType || 'Speeding'}
                                    onValueChange={(v) => setFormData({...formData, violationType: v as ViolationType})}
                                >
                                     <SelectTrigger><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="Speeding">Speeding</SelectItem>
                                        <SelectItem value="Overweight">Overweight</SelectItem>
                                        <SelectItem value="Logbook violation">Logbook violation</SelectItem>
                                        <SelectItem value="Equipment defect">Equipment defect</SelectItem>
                                        <SelectItem value="Insurance lapse">Insurance lapse</SelectItem>
                                        <SelectItem value="Red Light">Red Light</SelectItem>
                                        <SelectItem value="Parking">Parking</SelectItem>
                                     </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label>Fine Amount</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="number" 
                                        value={formData.fineAmount || ''} 
                                        onChange={(e) => setFormData({...formData, fineAmount: parseFloat(e.target.value)})}
                                        className="flex-1" 
                                    />
                                     <Select 
                                        value={formData.currency || 'CAD'}
                                        onValueChange={(v) => setFormData({...formData, currency: v as 'USD' | 'CAD'})}
                                     >
                                         <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value="CAD">CAD</SelectItem>
                                             <SelectItem value="USD">USD</SelectItem>
                                         </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                            
                            {/* Documents Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">DOCUMENTS</h3>
                                
                                {/* Ticket */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-medium text-slate-700">Offense Ticket</Label>
                                        <Toggle checked={formData.hasTicketFile} onCheckedChange={(c) => setFormData({...formData, hasTicketFile: c})} />
                                    </div>
                                    {formData.hasTicketFile && (
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="secondary" className="h-7 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100 shadow-none">Choose File</Button>
                                            <span className="text-xs text-slate-400 italic">No file chosen</span>
                                        </div>
                                    )}
                                </div>

                                {/* Receipt */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-medium text-slate-700">Payment Receipt</Label>
                                        <Toggle checked={formData.hasReceiptFile} onCheckedChange={(c) => setFormData({...formData, hasReceiptFile: c})} />
                                    </div>
                                    {formData.hasReceiptFile && (
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="secondary" className="h-7 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100 shadow-none">Choose File</Button>
                                            <span className="text-xs text-slate-400 italic">No file chosen</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notice */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-medium text-slate-700">Notice of Trial</Label>
                                        <Toggle checked={formData.hasNoticeFile} onCheckedChange={(c) => setFormData({...formData, hasNoticeFile: c})} />
                                    </div>
                                    {formData.hasNoticeFile && (
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="secondary" className="h-7 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100 shadow-none">Choose File</Button>
                                            <span className="text-xs text-slate-400 italic">No file chosen</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assignment Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">ASSIGNMENT</h3>
                                <div className="flex items-center justify-between">
                                    <Label className="font-medium text-slate-700">Assign to Third Party</Label>
                                    <Toggle checked={formData.assignedToThirdParty} onCheckedChange={(c) => setFormData({...formData, assignedToThirdParty: c})} />
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <div className="p-6 pt-2 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
