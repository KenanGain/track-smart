import { useState } from "react";
import { Search, AlertTriangle, Shield, Info, Plus, Edit, Trash2, Eye, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VIOLATION_RISK_MATRIX } from "@/data/violations.data";
import type { Violation, ViolationCategory } from "@/types/violations.types";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// --- Helper Components ---

const RiskBadge = ({ category, className }: { category: number; className?: string }) => {
    const config = VIOLATION_RISK_MATRIX.riskCategories[category.toString()];
    if (!config) return <span className="text-slate-500">Unknown</span>;

    let styles = "bg-slate-100 text-slate-700 border-slate-200";
    if (category === 1) styles = "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10";
    if (category === 2) styles = "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10";
    if (category === 3) styles = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10";

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset whitespace-nowrap", styles, className)}>
            {category === 1 && <AlertTriangle className="w-3 h-3" />}
            {category === 3 && <Shield className="w-3 h-3" />}
            {config.label}
        </div>
    );
};

const SeverityBadge = ({ weight }: { weight: number }) => {
    let bgClass = "bg-slate-50 text-slate-700 border-slate-200";
    if (weight >= 8) bgClass = "bg-rose-50 text-rose-700 border-rose-200";
    else if (weight >= 5) bgClass = "bg-orange-50 text-orange-700 border-orange-200";
    else if (weight >= 3) bgClass = "bg-amber-50 text-amber-700 border-amber-200";

    return (
        <div className={cn("flex items-center justify-center w-12 h-10 rounded-lg border text-lg font-bold leading-none shadow-sm", bgClass)}>
            {weight}
        </div>
    );
};

// --- Main Component ---

export function ViolationsPage() {
    // State
    const [activeTab, setActiveTab] = useState<string>("all");
    const [riskFilters, setRiskFilters] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
    const [viewingViolation, setViewingViolation] = useState<Violation | null>(null);
    const [localCategories] = useState<ViolationCategory[]>(VIOLATION_RISK_MATRIX.violationCategories);

    // Form State
    const [formData, setFormData] = useState<Partial<Violation>>({});
    const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<string>("");
    
    // Advanced Form State for Regulatory Codes
    const [regMasterEnabled, setRegMasterEnabled] = useState(false);
    const [regForm, setRegForm] = useState<{
        usa: Array<{ id: string; authority: string; code: string; description: string }>;
        canada: Array<{ id: string; authority: string; code: string; description: string }>;
    }>({
        usa: [],
        canada: []
    });

    // --- Actions ---

    const toggleRiskFilter = (riskLevel: number) => {
        setRiskFilters(prev => 
            prev.includes(riskLevel) 
                ? prev.filter(r => r !== riskLevel)
                : [...prev, riskLevel]
        );
    };

    // Regulatory Form Helpers
    const addRegulation = (country: 'usa' | 'canada') => {
        setRegForm(prev => ({
            ...prev,
            [country]: [
                ...prev[country],
                { 
                    id: Math.random().toString(36).substr(2, 9), 
                    authority: country === 'usa' ? "FMCSA" : "Provincial HTA", 
                    code: "", 
                    description: "" 
                }
            ]
        }));
    };

    const removeRegulation = (country: 'usa' | 'canada', id: string) => {
        setRegForm(prev => ({
            ...prev,
            [country]: prev[country].filter(item => item.id !== id)
        }));
    };

    const updateRegulation = (country: 'usa' | 'canada', id: string, field: string, value: string) => {
        setRegForm(prev => ({
            ...prev,
            [country]: prev[country].map(item => 
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleView = (violation: Violation) => {
        setViewingViolation(violation);
        setIsViewDialogOpen(true);
    };

    const handleEdit = (violation: Violation, categoryId: string) => {
        setEditingViolation(violation);
        setFormData({ ...violation });
        setSelectedCategoryForAdd(categoryId);
        
        // Initialize regulatory inputs
        const hasRegs = !!violation.regulatoryCodes;
        setRegMasterEnabled(hasRegs);

        setRegForm({
            usa: violation.regulatoryCodes?.usa?.map(r => ({
                id: Math.random().toString(36).substr(2, 9),
                authority: r.authority,
                code: r.cfr.join(", "),
                description: r.description || ""
            })) || [],
            canada: violation.regulatoryCodes?.canada?.map(r => ({
                id: Math.random().toString(36).substr(2, 9),
                authority: r.authority,
                code: r.reference.join(", "),
                description: r.description || ""
            })) || []
        });

        // If enabled but no sub-entries, add defaults
        if (hasRegs && !violation.regulatoryCodes?.usa?.length && !violation.regulatoryCodes?.canada?.length) {
             // Optional: could add default empty rows here if desired
        }
        
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingViolation(null);
        setFormData({ severityWeight: 5, crashLikelihoodPercent: 50, driverRiskCategory: 2, description: "" });
        setSelectedCategoryForAdd(activeTab !== "all" ? activeTab : localCategories[0].id);
        
        setRegMasterEnabled(false);
        setRegForm({
            usa: [],
            canada: []
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        // Construct regulatory object from inputs
        const regulatoryCodes: Violation['regulatoryCodes'] = {};
        
        if (regMasterEnabled) {
            const usaRegs = regForm.usa
                .filter(r => r.code.trim())
                .map(r => ({
                    authority: r.authority,
                    cfr: r.code.split(',').map(s => s.trim()).filter(Boolean),
                    description: r.description
                }));

            const canadaRegs = regForm.canada
                .filter(r => r.code.trim())
                .map(r => ({
                    authority: r.authority,
                    reference: r.code.split(',').map(s => s.trim()).filter(Boolean),
                    description: r.description
                }));
            
            if (usaRegs.length > 0) regulatoryCodes.usa = usaRegs;
            if (canadaRegs.length > 0) regulatoryCodes.canada = canadaRegs;
        }

        const finalData = { ...formData, regulatoryCodes: Object.keys(regulatoryCodes).length > 0 ? regulatoryCodes : undefined };

        console.log("Saving violation:", finalData, "Category:", selectedCategoryForAdd);
        setIsDialogOpen(false);
    };

    // --- Filtering Logic ---

    const getVisibleViolations = () => {
        let violations: Array<Violation & { categoryName: string; categoryId: string }> = [];

        localCategories.forEach(cat => {
            if (activeTab === "all" || activeTab === cat.id) {
                cat.violations.forEach(v => {
                    violations.push({
                        ...v,
                        categoryName: cat.name,
                        categoryId: cat.id
                    });
                });
            }
        });

        return violations.filter(v => {
            const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  v.id.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesRisk = riskFilters.length === 0 || riskFilters.includes(v.driverRiskCategory);

            return matchesSearch && matchesRisk;
        });
    };

    const visibleViolations = getVisibleViolations();

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="px-8 py-6 max-w-[1600px] mx-auto w-full">
                
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                         <nav className="flex text-sm text-slate-500 mb-1 font-medium items-center gap-2">
                            <span>Settings</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900">Violations</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Violations Risk Matrix
                        </h1>
                        <p className="text-slate-600 max-w-3xl text-sm">
                            {VIOLATION_RISK_MATRIX.description}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 px-4 text-xs font-semibold uppercase tracking-wide">
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Add Violation
                        </Button>
                    </div>
                </div>

                {/* Risk Indicators (Filters) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {Object.entries(VIOLATION_RISK_MATRIX.riskCategories).map(([key, cat]) => {
                        const riskLevel = parseInt(key);
                        const isActive = riskFilters.includes(riskLevel);
                        const isInactive = riskFilters.length > 0 && !isActive;

                        let activeClass = "ring-1 ring-blue-600 bg-blue-50/50";
                        if (riskLevel === 1) activeClass = "ring-1 ring-rose-500 bg-rose-50/50";
                        if (riskLevel === 2) activeClass = "ring-1 ring-amber-500 bg-amber-50/50";
                        if (riskLevel === 3) activeClass = "ring-1 ring-emerald-500 bg-emerald-50/50";

                        return (
                            <button
                                key={key}
                                onClick={() => toggleRiskFilter(riskLevel)}
                                className={cn(
                                    "flex flex-col gap-2 p-3 rounded-lg border text-left transition-all duration-200 relative group",
                                    isActive ? activeClass : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm",
                                    isInactive && "opacity-60 grayscale-[0.5]"
                                )}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <RiskBadge category={riskLevel} />
                                    {isActive && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{cat.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Tabs & Search Bar */}
                <div className="flex flex-col space-y-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200">
                        {/* Tabs */}
                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar -mb-px">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={cn(
                                    "pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-1",
                                    activeTab === "all" 
                                        ? "border-blue-600 text-blue-600" 
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                )}
                            >
                                All Violations
                            </button>
                            {localCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={cn(
                                        "pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-1",
                                        activeTab === cat.id 
                                            ? "border-blue-600 text-blue-600" 
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4">
                         <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search violations..."
                                className="pl-8 h-8 bg-white border-slate-200 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                            {visibleViolations.length} Violations Found
                        </div>
                    </div>
                </div>

                {/* Violations List Table - Compact Mode */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-2 w-[45%]">Violation Type</th>
                                    {activeTab === "all" && (
                                        <th className="px-4 py-2 w-[20%]">Category</th>
                                    )}
                                    <th className="px-4 py-2 text-center w-[10%]">Severity</th>
                                    <th className="px-4 py-2 text-center w-[10%]">Crash Prob.</th>
                                    <th className="px-4 py-2 w-[15%]">Risk Cat</th>
                                    <th className="px-4 py-2 text-right w-[100px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleViolations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <p className="font-medium text-sm">No violations found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    visibleViolations.map((violation) => (
                                        <tr key={violation.id} className="group hover:bg-slate-50/80 transition-colors">
                                             <td className="px-4 py-2 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm truncate" title={violation.name}>{violation.name}</span>
                                                    {violation.description && (
                                                        <span className="text-[11px] text-slate-500 truncate max-w-md" title={violation.description}>
                                                            {violation.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {activeTab === "all" && (
                                                <td className="px-4 py-2 align-middle">
                                                    <span className="text-xs text-slate-600 truncate block max-w-[150px]" title={violation.categoryName}>
                                                        {violation.categoryName}
                                                    </span>
                                                </td>
                                            )}
                                           <td className="px-4 py-2 align-middle">
                                                <div className="flex justify-center">
                                                    <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", 
                                                        violation.severityWeight >= 8 ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                        violation.severityWeight >= 5 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    )}>
                                                        {violation.severityWeight}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 align-middle text-center">
                                                <span className={cn(
                                                    "text-sm font-bold tabular-nums",
                                                    violation.crashLikelihoodPercent >= 100 ? "text-rose-600" : 
                                                    violation.crashLikelihoodPercent >= 50 ? "text-orange-600" : "text-slate-700"
                                                )}>
                                                    {violation.crashLikelihoodPercent}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 align-middle">
                                                <RiskBadge category={violation.driverRiskCategory} />
                                            </td>
                                            <td className="px-4 py-2 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                     <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleView(violation)}
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleEdit(violation, violation.categoryId)}
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Styled Detail Dialog (Matches User Screenshot) */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                    {viewingViolation && (
                        <div className="flex flex-col">
                            {/* Header Section */}
                            <div className="p-8 pb-6 bg-white">
                                <div className="flex items-center gap-2 mb-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                    <Info className="w-4 h-4 text-blue-600" />
                                    Violation Details
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                                    {viewingViolation.name}
                                </h2>
                                <p className="text-slate-500 mt-2 text-base">
                                    {viewingViolation.description || "No description provided."}
                                </p>
                            </div>

                            {/* Metrics Cards */}
                            <div className="grid grid-cols-3 gap-4 px-8 mb-6">
                                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Severity</span>
                                    <SeverityBadge weight={viewingViolation.severityWeight} />
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Crash Prob.</span>
                                    <span className={cn("text-2xl font-bold", viewingViolation.crashLikelihoodPercent >= 50 ? "text-rose-600" : "text-slate-700")}>
                                        {viewingViolation.crashLikelihoodPercent}% <span className="text-sm text-slate-400 font-normal">~</span>
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Risk Cat</span>
                                    <RiskBadge category={viewingViolation.driverRiskCategory} className="px-3 py-1 text-xs" />
                                </div>
                            </div>

                            {/* Regulatory Section */}
                           <div className="px-4 pb-8">
                                    <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-1">Regulatory References</h4>
                                        
                                        <div className="space-y-8">
                                            {viewingViolation.regulatoryCodes?.usa?.map((reg, index) => (
                                                <div key={`usa-${index}`} className="flex gap-5 items-start px-2">
                                                     <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="text-sm font-bold text-slate-700">US</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-slate-900">USA ({reg.authority})</div>
                                                        <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">CFR {reg.cfr.join(", ")}</div>
                                                        <div className="text-sm text-slate-600 mt-1.5">{reg.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {viewingViolation.regulatoryCodes?.usa && viewingViolation.regulatoryCodes?.canada && (
                                                <div className="border-t border-slate-200 mx-2" />
                                            )}

                                            {viewingViolation.regulatoryCodes?.canada?.map((reg, index) => (
                                                <div key={`can-${index}`} className="flex gap-5 items-start px-2">
                                                     <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="text-sm font-bold text-slate-700">CA</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-slate-900">Canada ({reg.authority})</div>
                                                        <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider">{reg.reference.join(", ")}</div>
                                                        <div className="text-sm text-slate-600 mt-1.5">{reg.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {(!viewingViolation.regulatoryCodes?.usa?.length && !viewingViolation.regulatoryCodes?.canada?.length) && (
                                                <div className="text-center text-slate-400 text-sm py-2">No regulatory references available.</div>
                                            )}
                                        </div>
                                    </div>
                            </div>
                            
                            <div className="px-8 pb-6 flex justify-end">
                                <Button onClick={() => setIsViewDialogOpen(false)} variant="outline" className="min-w-[100px] border-slate-200 text-slate-600">Close</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit/Add Dialog - Enhanced Form */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingViolation ? "Edit Violation" : "New Violation Rule"}</DialogTitle>
                        <DialogDescription>
                            Configure violation parameters and regulatory mappings.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Basic Info */}
                        <div className="grid gap-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Primary Category</Label>
                                    <Select 
                                        value={selectedCategoryForAdd} 
                                        onValueChange={setSelectedCategoryForAdd}
                                    >
                                        <SelectTrigger disabled={!!editingViolation}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {localCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Risk Level</Label>
                                    <Select 
                                        value={formData.driverRiskCategory?.toString()} 
                                        onValueChange={(v) => setFormData({...formData, driverRiskCategory: parseInt(v)})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">High Risk (Category 1)</SelectItem>
                                            <SelectItem value="2">Moderate Risk (Category 2)</SelectItem>
                                            <SelectItem value="3">Lower Risk (Category 3)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Violation Name</Label>
                                <Input value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Reckless Driving" />
                            </div>

                             <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea value={formData.description || ""} onChange={(e) => setFormData({...formData, description: e.target.value})} className="h-16 resize-none" placeholder="Description of the violation behavior..." />
                            </div>
                        </div>

                        {/* Quantitative Data */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase text-slate-500">Severity Weight (1-10)</Label>
                                <div className="flex items-center gap-3">
                                    <Input type="number" min="1" max="10" className="w-20" value={formData.severityWeight || 0} onChange={(e) => setFormData({...formData, severityWeight: parseInt(e.target.value)})} />
                                    <SeverityBadge weight={formData.severityWeight || 0} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs uppercase text-slate-500">Crash Likelihood Increase</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="number" className="w-24" value={formData.crashLikelihoodPercent || 0} onChange={(e) => setFormData({...formData, crashLikelihoodPercent: parseInt(e.target.value)})} />
                                    <span className="text-sm font-bold text-slate-500">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Regulatory Form */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden transition-all duration-200">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => setRegMasterEnabled(!regMasterEnabled)}
                            >
                                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                                    <Globe className="w-4 h-4 text-slate-500" />
                                    Regulatory Definitions
                                </h3>
                                <div className="flex items-center gap-3">
                                    <span className={cn("text-xs font-medium", regMasterEnabled ? "text-blue-600" : "text-slate-400")}>
                                        {regMasterEnabled ? "Enabled" : "Disabled"}
                                    </span>
                                    <div className={cn("w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out", regMasterEnabled ? "bg-blue-600" : "bg-slate-300")}>
                                        <div className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out", regMasterEnabled ? "translate-x-4" : "translate-x-0")} />
                                    </div>
                                </div>
                            </div>
                            
                            {regMasterEnabled && (
                                <div className="p-4 space-y-6 bg-white animate-in slide-in-from-top-2 duration-200">
                                    
                                    {/* USA Section */}
                                    <div className="flex gap-4">
                                        <div className="pt-1">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-xs font-bold shadow-sm">US</div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-blue-900 font-bold">United States Regulation</Label>
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => addRegulation('usa')}>
                                                    <Plus className="w-3 h-3 mr-1" /> Add Regulation
                                                </Button>
                                            </div>

                                            <div className="space-y-4">
                                                {regForm.usa.map((item) => (
                                                    <div key={item.id} className="grid gap-3 p-3 rounded-md border border-slate-100 bg-slate-50/50 hover:border-blue-100 transition-colors group relative">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => removeRegulation('usa', item.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>

                                                        <div className="grid grid-cols-2 gap-3 pr-6">
                                                            <div className="grid gap-1.5">
                                                                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Authority</Label>
                                                                <Select value={item.authority} onValueChange={v => updateRegulation('usa', item.id, 'authority', v)}>
                                                                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="FMCSA">FMCSA</SelectItem>
                                                                        <SelectItem value="DOT">DOT</SelectItem>
                                                                        <SelectItem value="State Law">State Law</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid gap-1.5">
                                                                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Codes (Title 49 CFR)</Label>
                                                                <Input className="h-8 text-xs bg-white" placeholder="e.g. 392.2, 395.8" value={item.code} onChange={e => updateRegulation('usa', item.id, 'code', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Description</Label>
                                                            <Input className="h-8 text-xs bg-white" placeholder="Short description of the regulation" value={item.description} onChange={e => updateRegulation('usa', item.id, 'description', e.target.value)} />
                                                        </div>
                                                    </div>
                                                ))}
                                                {regForm.usa.length === 0 && (
                                                    <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-xs">
                                                        No USA regulations added
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100" />

                                    {/* Canada Section */}
                                    <div className="flex gap-4">
                                        <div className="pt-1">
                                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-700 border border-red-100 flex items-center justify-center text-xs font-bold shadow-sm">CA</div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-red-900 font-bold">Canada Regulation</Label>
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50" onClick={() => addRegulation('canada')}>
                                                    <Plus className="w-3 h-3 mr-1" /> Add Regulation
                                                </Button>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {regForm.canada.map((item) => (
                                                    <div key={item.id} className="grid gap-3 p-3 rounded-md border border-slate-100 bg-slate-50/50 hover:border-red-100 transition-colors group relative">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => removeRegulation('canada', item.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>

                                                        <div className="grid grid-cols-2 gap-3 pr-6">
                                                            <div className="grid gap-1.5">
                                                                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Authority</Label>
                                                                <Select value={item.authority} onValueChange={v => updateRegulation('canada', item.id, 'authority', v)}>
                                                                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Provincial HTA">Provincial HTA</SelectItem>
                                                                        <SelectItem value="NSC">NSC</SelectItem>
                                                                        <SelectItem value="TDG">TDG</SelectItem>
                                                                        <SelectItem value="Criminal Code">Criminal Code</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid gap-1.5">
                                                                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Reference Codes</Label>
                                                                <Input className="h-8 text-xs bg-white" placeholder="e.g. HTA s.130" value={item.code} onChange={e => updateRegulation('canada', item.id, 'code', e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-1.5">
                                                            <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Description</Label>
                                                            <Input className="h-8 text-xs bg-white" placeholder="Short description of the regulation" value={item.description} onChange={e => updateRegulation('canada', item.id, 'description', e.target.value)} />
                                                        </div>
                                                    </div>
                                                ))}
                                                {regForm.canada.length === 0 && (
                                                    <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-xs">
                                                        No Canada regulations added
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {editingViolation ? "Save Changes" : "Create Violation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
