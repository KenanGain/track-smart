import React, { useState, useEffect } from 'react';
import {
  User, Phone, MapPin, Briefcase,
  AlertTriangle, Edit, Edit3, Trash2, Mail, History, Award,
  UploadCloud, Camera, ChevronRight, ChevronDown, LayoutDashboard, ShieldCheck, FileText, GraduationCap, Route, Ticket, Car, DollarSign, AlertOctagon, FileKey, Hash, Clock, Plus,
  CalendarX, FileWarning, Download, Eye, X, Construction, Map, Printer, ArrowRight, FileCheck, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
// Removed: import { Badge } from '../../components/ui/Badge';
import { StatusBadge, ViewField, InputGroup, Modal, maskSSN, formatDate, calculateAge, Toggle, AddressFormFields } from './DriverComponents';
import { PaystubsPage } from '../finance/PaystubsPage';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { US_STATES, CA_PROVINCES } from '@/data/geo-data';
import { MOCK_VIOLATION_RECORDS } from '@/pages/violations/violations-list.data';
import { INCIDENTS } from '@/pages/incidents/incidents.data';
import { inspectionsData } from '@/pages/inspections/inspectionsData';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import { MOCK_TICKETS } from '@/pages/tickets/tickets.data';

// --- Individual Section Edit Modals ---

export const EditPersonalModal = ({ isOpen, onClose, data, onSave }: any) => {
  const [form, setForm] = useState(data);
  useEffect(() => { if(isOpen) setForm(data) }, [isOpen, data]);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Personal Identification" onSave={() => onSave(form)}>
      <div className="grid grid-cols-2 gap-4">
        <InputGroup label="First Name" name="firstName" value={form.firstName} onChange={handleChange} required />
        <InputGroup label="Middle Name" name="middleName" value={form.middleName} onChange={handleChange} />
        <InputGroup label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} required className="col-span-2" />
        <InputGroup label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleChange} required />
        <InputGroup label="Gender" name="gender" options={['Male', 'Female', 'Other', 'Prefer not to say']} value={form.gender} onChange={handleChange} />
        <InputGroup label="SSN/SIN" name="ssn" value={form.ssn} onChange={handleChange} />
        <InputGroup label="Citizenship" name="citizenship" options={['USA', 'Canada']} value={form.citizenship} onChange={handleChange} required />
        <InputGroup label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <InputGroup label="Email" name="email" value={form.email} onChange={handleChange} className="col-span-2" />
        <InputGroup label="Date Hired" name="dateHired" type="date" value={form.dateHired} onChange={handleChange} />
        <InputGroup label="Date Added" name="dateAdded" type="date" value={form.dateAdded} onChange={handleChange} />
      </div>
    </Modal>
  );
};

export const EditAddressModal = ({ isOpen, onClose, data, onSave }: any) => {
  const [form, setForm] = useState(data);
  useEffect(() => { if(isOpen) setForm(data) }, [isOpen, data]);

  const handleChange = (field: string, value: any) => setForm({ ...form, [field]: value });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Current Residence" onSave={() => onSave(form)}>
      <AddressFormFields data={form} onChange={handleChange} />
    </Modal>
  );
};

export const EditContactsModal = ({ isOpen, onClose, contacts, onSave }: any) => {
  const [list, setList] = useState(contacts);
  useEffect(() => { if(isOpen) setList(contacts) }, [isOpen, contacts]);

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...list];
    updated[index][field] = val;
    setList(updated);
  };
  const add = () => setList([...list, { name: '', relation: '', phone: '', email: '' }]);
  const remove = (index: number) => setList(list.filter((_: any, i: number) => i !== index));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Emergency Contacts" onSave={() => onSave(list)}>
      <div className="mb-2 flex justify-end"><button onClick={add} className="text-xs text-blue-600 font-bold hover:underline">+ Add Contact</button></div>
      {list.map((item: any, idx: number) => (
        <div key={idx} className="bg-slate-50 p-3 rounded-lg mb-3 relative border border-slate-100">
           <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
           <div className="grid grid-cols-2 gap-2">
             <InputGroup label="Name" value={item.name} onChange={(e: any) => updateItem(idx, 'name', e.target.value)} />
             <InputGroup label="Relation" value={item.relation} onChange={(e: any) => updateItem(idx, 'relation', e.target.value)} />
             <InputGroup label="Phone" value={item.phone} onChange={(e: any) => updateItem(idx, 'phone', e.target.value)} />
             <InputGroup label="Email" value={item.email} onChange={(e: any) => updateItem(idx, 'email', e.target.value)} />
           </div>
        </div>
      ))}
    </Modal>
  );
};

export const EditResidencesModal = ({ isOpen, onClose, residences, onSave }: any) => {
  const [list, setList] = useState(residences || []);
  useEffect(() => { if(isOpen) setList(residences || []) }, [isOpen, residences]);

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...list];
    updated[index][field] = val;
    setList(updated);
  };
  const add = () => setList([...list, { address: '', city: '', state: '', zip: '', country: 'USA', startDate: '', endDate: '' }]);
  const remove = (index: number) => setList(list.filter((_: any, i: number) => i !== index));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Previous Residences" onSave={() => onSave(list)}>
      <div className="mb-2 flex justify-end"><button onClick={add} className="text-xs text-blue-600 font-bold hover:underline">+ Add Residence</button></div>
      {list.map((item: any, idx: number) => (
        <div key={idx} className="bg-slate-50 p-3 rounded-lg mb-3 relative border border-slate-100">
           <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
           <div className="mb-2 bg-white p-2 rounded border border-slate-200">
               <AddressFormFields 
                   data={item} 
                   onChange={(field, value) => updateItem(idx, field, value)} 
               />
           </div>
           <div className="grid grid-cols-2 gap-2">
             <InputGroup label="Start" type="date" value={item.startDate} onChange={(e: any) => updateItem(idx, 'startDate', e.target.value)} />
             <InputGroup label="End" type="date" value={item.endDate} onChange={(e: any) => updateItem(idx, 'endDate', e.target.value)} />
           </div>
        </div>
      ))}
    </Modal>
  );
};

export const EditLicensesModal = ({ isOpen, onClose, licenses, onSave }: any) => {
  const [list, setList] = useState(licenses || []);
  useEffect(() => { if(isOpen) setList(licenses || []) }, [isOpen, licenses]);

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...list];
    updated[index][field] = val;
    setList(updated);
  };
  const add = () => setList([...list, { 
      type: 'CDL', licenseNumber: '', province: '', class: '', expiryDate: '', status: 'Valid',
      uploadType: 'images', frontImage: null, rearImage: null, photo: null, pdfDoc: null
  }]);
  const remove = (index: number) => setList(list.filter((_: any, i: number) => i !== index));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Driver License" onSave={() => onSave(list)}>
      <div className="mb-2 flex justify-end"><button onClick={add} className="text-xs text-blue-600 font-bold hover:underline">+ Add License</button></div>
      {list.map((item: any, idx: number) => {
        const isPrimary = idx === 0;
        return (
        <div key={idx} className={`p-3 rounded-lg mb-3 relative border transition-all ${isPrimary ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
           {!isPrimary && <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
           
           {isPrimary && (
               <div className="mb-3 flex items-center gap-2">
                   <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 inline-block">
                       PRIMARY LICENSE
                   </div>
                   <span className="text-[10px] text-slate-400 font-medium">Cannot be deleted</span>
               </div>
           )}

           <div className="grid grid-cols-2 gap-2 mb-3">
             <InputGroup label="Type" options={['CDL', 'Driver License']} value={item.type} onChange={(e: any) => updateItem(idx, 'type', e.target.value)} />
             <InputGroup label="Number" value={item.licenseNumber} onChange={(e: any) => updateItem(idx, 'licenseNumber', e.target.value)} />
             <InputGroup label="State/Prov" value={item.province} onChange={(e: any) => updateItem(idx, 'province', e.target.value)} />
             <InputGroup label="Class" value={item.class} onChange={(e: any) => updateItem(idx, 'class', e.target.value)} />
             <InputGroup label="Expiry" type="date" value={item.expiryDate} onChange={(e: any) => updateItem(idx, 'expiryDate', e.target.value)} />
             <InputGroup label="Status" options={['Valid', 'Expired', 'Suspended']} value={item.status} onChange={(e: any) => updateItem(idx, 'status', e.target.value)} />
           </div>

           {/* Upload Section - Matched to DriverForm */}
           <div className="col-span-2 border-t border-slate-200 mt-2 pt-2">
               <div className="flex justify-between items-center mb-3">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upload License Document</label>
                   <Toggle 
                       label={'Include PDF'}
                       checked={item.uploadType === 'pdf'}
                       onChange={(checked) => updateItem(idx, 'uploadType', checked ? 'pdf' : 'images')}
                   />
               </div>
               
               {/* Image Uploads - Always visible */}
               <div className="grid grid-cols-3 gap-2 mb-3">
                 <div className="bg-white border border-dashed border-slate-300 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                   {item.frontImage ? (
                       <div className="text-green-600 flex flex-col items-center justify-center">
                           <UploadCloud className="w-4 h-4 mb-1" />
                           <span className="text-[10px] font-bold">Uploaded</span>
                       </div>
                   ) : (
                       <>
                           <p className="text-[10px] font-bold text-slate-500 mb-1">Front</p>
                           <Camera className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                           <input type="file" className="w-full text-[10px] text-transparent file:mr-0 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e: any) => updateItem(idx, 'frontImage', e.target.files[0])} />
                       </>
                   )}
                 </div>
                 <div className="bg-white border border-dashed border-slate-300 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                   {item.rearImage ? (
                       <div className="text-green-600 flex flex-col items-center justify-center">
                           <UploadCloud className="w-4 h-4 mb-1" />
                           <span className="text-[10px] font-bold">Uploaded</span>
                       </div>
                   ) : (
                       <>
                           <p className="text-[10px] font-bold text-slate-500 mb-1">Rear</p>
                           <Camera className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                           <input type="file" className="w-full text-[10px] text-transparent file:mr-0 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e: any) => updateItem(idx, 'rearImage', e.target.files[0])} />
                       </>
                   )}
                 </div>
                 <div className="bg-white border border-dashed border-slate-300 rounded-lg p-2 text-center hover:border-blue-400 transition-colors">
                   {item.photo ? (
                       <div className="text-green-600 flex flex-col items-center justify-center">
                           <UploadCloud className="w-4 h-4 mb-1" />
                           <span className="text-[10px] font-bold">Uploaded</span>
                       </div>
                   ) : (
                       <>
                           <p className="text-[10px] font-bold text-slate-500 mb-1">Photo</p>
                           <User className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                           <input type="file" className="w-full text-[10px] text-transparent file:mr-0 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e: any) => updateItem(idx, 'photo', e.target.files[0])} />
                       </>
                   )}
                 </div>
               </div>

               {/* PDF Upload - Conditional */}
               {item.uploadType === 'pdf' && (
                   <div className="bg-white border border-dashed border-slate-300 rounded-lg p-3 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                     <UploadCloud className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                     <p className="text-[10px] font-medium text-slate-600 mb-1">Upload License PDF</p>
                     <input type="file" className="text-[10px] w-full text-transparent file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e: any) => updateItem(idx, 'pdfDoc', e.target.files[0])} />
                   </div>
               )}
           </div>
        </div>
      ); })}
    </Modal>
  );
};


export const EditTravelDocumentsModal = ({ isOpen, onClose, documents, onSave }: any) => {
  const [list, setList] = useState(documents || []);
  useEffect(() => { if(isOpen) setList(documents || []) }, [isOpen, documents]);

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...list];
    updated[index][field] = val;
    setList(updated);
  };
  const add = () => setList([...list, { 
      type: 'Passport', number: '', country: 'USA', expiryDate: '', 
      uploadType: 'images', images: [], pdfDoc: null
  }]);
  const remove = (index: number) => setList(list.filter((_: any, i: number) => i !== index));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Travel Documents" onSave={() => onSave(list)}>
      <div className="mb-2 flex justify-end"><button onClick={add} className="text-xs text-blue-600 font-bold hover:underline">+ Add Document</button></div>
      {list.map((item: any, idx: number) => (
        <div key={idx} className="bg-slate-50 p-3 rounded-lg mb-3 relative border border-slate-100">
           <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
           <div className="grid grid-cols-2 gap-2 mb-3">
             <InputGroup label="Type" options={['Passport', 'Visa', 'FAST Card', 'TWIC Card', 'Other']} value={item.type} onChange={(e: any) => updateItem(idx, 'type', e.target.value)} />
             <InputGroup label="Number" value={item.number} onChange={(e: any) => updateItem(idx, 'number', e.target.value)} />
             <InputGroup label="Issuing Country" options={['USA', 'Canada', 'Mexico']} value={item.country} onChange={(e: any) => updateItem(idx, 'country', e.target.value)} />
             <InputGroup label="Expiry Date" type="date" value={item.expiryDate} onChange={(e: any) => updateItem(idx, 'expiryDate', e.target.value)} />
           </div>

           {/* Upload Section - Matched to DriverForm */}
           <div className="col-span-2 border-t border-slate-200 mt-2 pt-2">
               <div className="flex justify-between items-center mb-3">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upload Documents</label>
                   <Toggle 
                       label={'Include PDF'}
                       checked={item.uploadType === 'pdf'}
                       onChange={(checked) => updateItem(idx, 'uploadType', checked ? 'pdf' : 'images')}
                   />
               </div>

                {/* Always visible Image Upload (simplified for Travel Docs if needed, or just multiple) */}
                <div className="bg-white border border-dashed border-slate-300 rounded-lg p-3 text-center mb-3 hover:border-blue-400 transition-colors">
                    <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-500 mb-1">Document Images</p>
                    <input type="file" multiple className="w-full text-[10px] text-transparent file:mr-0 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e: any) => updateItem(idx, 'images', e.target.files)} />
                </div>

               {item.uploadType === 'pdf' && (
                   <div className="bg-white border border-dashed border-slate-300 rounded-lg p-3 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                     <UploadCloud className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                     <p className="text-[10px] font-medium text-slate-600 mb-1">Upload Document PDF</p>
                     <input type="file" className="text-[10px] w-full text-transparent file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e: any) => updateItem(idx, 'pdfDoc', e.target.files[0])} />
                   </div>
               )}
           </div>
        </div>
      ))}
    </Modal>
  );
};

export const EditEmploymentModal = ({ isOpen, onClose, history, onSave }: any) => {
  const [list, setList] = useState(history || []);
  useEffect(() => { if(isOpen) setList(history || []) }, [isOpen, history]);

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...list];
    updated[index][field] = val;
    setList(updated);
  };

  const updateContact = (index: number, field: string, val: any) => {
    const updated = [...list];
    const contact = { ...(updated[index].employerContact || {}), [field]: val };
    updated[index].employerContact = contact;
    setList(updated);
  };

  const add = () => setList([...list, { employerName: '', address: { address: '', unit: '', city: '', state: '', zip: '', country: 'USA' }, startDate: '', endDate: '', operatingZone: '', terminationStatus: 'Voluntary', employerContact: {} }]);
  const remove = (index: number) => setList(list.filter((_: any, i: number) => i !== index));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Employment History" onSave={() => onSave(list)}>
      <div className="mb-2 flex justify-end"><button onClick={add} className="text-xs text-blue-600 font-bold hover:underline">+ Add Employer</button></div>
      {list.map((item: any, idx: number) => (
        <div key={idx} className="bg-slate-50 p-3 rounded-lg mb-3 relative border border-slate-100">
           <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
           
           <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Employment Details {idx + 1}</h4>
           <div className="grid grid-cols-2 gap-2 mb-4">
             <InputGroup label="Employer" value={item.employerName} onChange={(e: any) => updateItem(idx, 'employerName', e.target.value)} className="col-span-2" />
             <div className="col-span-2 bg-white p-2 rounded border border-slate-200">
                 <AddressFormFields 
                    data={typeof item.address === 'object' ? item.address : { address: item.address, unit: '', city: '', state: '', zip: '', country: 'USA' }}
                    onChange={(field, value) => {
                        const currentAddr = typeof item.address === 'object' ? item.address : { address: item.address };
                        updateItem(idx, 'address', { ...currentAddr, [field]: value });
                    }}
                 />
             </div>
             <InputGroup label="Start" type="date" value={item.startDate} onChange={(e: any) => updateItem(idx, 'startDate', e.target.value)} />
             <InputGroup label="End" type="date" value={item.endDate} onChange={(e: any) => updateItem(idx, 'endDate', e.target.value)} />
             <InputGroup label="Zone" value={item.operatingZone} onChange={(e: any) => updateItem(idx, 'operatingZone', e.target.value)} />
             <InputGroup label="Status" value={item.terminationStatus} onChange={(e: any) => updateItem(idx, 'terminationStatus', e.target.value)} />
           </div>

           <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider pt-2 border-t border-slate-200">Contact Information</h4>
           <div className="grid grid-cols-2 gap-2 mb-4">
             <InputGroup label="Contact Name" value={item.employerContact?.name || ''} onChange={(e: any) => updateContact(idx, 'name', e.target.value)} />
             <InputGroup label="Phone" value={item.employerContact?.phone || ''} onChange={(e: any) => updateContact(idx, 'phone', e.target.value)} />
             <InputGroup label="Email" value={item.employerContact?.email || ''} onChange={(e: any) => updateContact(idx, 'email', e.target.value)} />
             <InputGroup label="Fax" value={item.employerContact?.fax || ''} onChange={(e: any) => updateContact(idx, 'fax', e.target.value)} />
           </div>

           <div className="border-t border-slate-200 pt-3 mt-2">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-500" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Verification of Experience</h4>
                    </div>
                    <Toggle 
                        label={'Reference Document Available'}
                        checked={item.hasReferenceDoc || false}
                        onChange={(checked) => updateItem(idx, 'hasReferenceDoc', checked)}
                    />
                </div>
                
                {item.hasReferenceDoc && (
                    <div className="bg-white border border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-blue-400 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                         {item.referenceDocUpload ? (
                            <div className="text-green-600 flex flex-col items-center justify-center">
                                <UploadCloud className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold">Document Ready to Upload</span>
                                <span className="text-[9px] text-slate-400">{item.referenceDocUpload.name}</span>
                                <button onClick={() => updateItem(idx, 'referenceDocUpload', null)} className="text-[9px] text-red-500 underline mt-1">Remove</button>
                            </div>
                         ) : item.referenceDocId ? (
                             <div className="text-blue-600 flex flex-col items-center justify-center">
                                <FileCheck className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold">Document Linked</span>
                                <span className="text-[9px] text-slate-400">ID: {item.referenceDocId}</span>
                                <label className="cursor-pointer text-[9px] text-blue-500 underline mt-1">
                                    Replace
                                    <input type="file" className="hidden" onChange={(e: any) => {
                                        if (e.target.files?.[0]) updateItem(idx, 'referenceDocUpload', e.target.files[0]);
                                    }} />
                                </label>
                             </div>
                         ) : (
                            <>
                                <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                                <p className="text-[10px] font-bold text-slate-500 mb-1">Upload Reference Document</p>
                                <input type="file" className="w-full text-[10px] text-transparent file:mr-0 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                                    onChange={(e: any) => {
                                        if (e.target.files?.[0]) updateItem(idx, 'referenceDocUpload', e.target.files[0]);
                                    }} 
                                />
                            </>
                         )}
                    </div>
                )}
           </div>
        </div>
      ))}
    </Modal>
  );
};

// --- Profile Tab Component ---
const ProfileTab = ({ data, onEditPersonal, onEditAddress, onEditContacts, onEditResidences, onEditLicenses, onEditTravelDocs, onEditEmployment }: any) => {

  // Section card header helper
  const SectionCard = ({ icon: Icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600', title, onEdit, children }: any) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Edit">
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ROW 1: Personal Identification + Current Residence */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Personal Identification */}
        <SectionCard icon={User} title="Personal Identification" onEdit={onEditPersonal}>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <ViewField label="First Name" value={data.firstName} />
              <ViewField label="Middle Name" value={data.middleName} />
              <ViewField label="Last Name" value={data.lastName} />
              <ViewField label="Date of Birth" value={formatDate(data.dob)} subValue={calculateAge(data.dob) ? `${calculateAge(data.dob)} yrs` : undefined} />
              <ViewField label="Gender" value={data.gender} />
              <ViewField label="SSN / SIN" value={maskSSN(data.ssn)} />
              <ViewField label="Phone" value={data.phone} icon={Phone} />
              <ViewField label="Email" value={data.email} icon={Mail} highlight />
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</p>
                <StatusBadge status={data.status} />
              </div>
              <ViewField label="Date Hired" value={formatDate(data.hiredDate || data.dateHired)} />
              <ViewField label="System Added" value={formatDate(data.dateAdded)} />
            </div>
          </div>
        </SectionCard>

        {/* Current Residence */}
        <SectionCard icon={MapPin} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="Current Residence" onEdit={onEditAddress}>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <ViewField label="Country" value={data.country} fullWidth />
              <ViewField label="Street Address" value={data.address} fullWidth />
              <ViewField label="Unit / Apt" value={data.unit || '—'} />
              <ViewField label="City" value={data.city} />
              <ViewField label="State / Province" value={data.state} />
              <ViewField label="Zip / Postal" value={data.zip} />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ROW 2: Emergency Contacts + Previous Residences (Table Views) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Emergency Contacts */}
        <SectionCard icon={AlertTriangle} iconBg="bg-rose-50" iconColor="text-rose-500" title="Emergency Contacts" onEdit={onEditContacts}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Relation</th>
                  <th className="px-5 py-2.5">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.emergencyContacts?.map((contact: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 text-sm">{contact.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase">
                        {contact.relation}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                        {contact.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" />{contact.phone}</span>}
                        {contact.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" />{contact.email}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data.emergencyContacts || data.emergencyContacts.length === 0) && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-400 text-xs italic">No emergency contacts listed.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Previous Residences */}
        <SectionCard icon={History} iconBg="bg-indigo-50" iconColor="text-indigo-600" title="Previous Residences" onEdit={onEditResidences}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-2.5">Address</th>
                  <th className="px-5 py-2.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.previousResidences?.map((res: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800 text-sm">{res.address}{res.unit ? ` #${res.unit}` : ''}</div>
                      <div className="text-xs text-slate-500">{res.city}, {res.state} {res.zip} &middot; {res.country || 'USA'}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md font-medium">
                        <CalendarX className="w-3 h-3 text-slate-400" />
                        {res.startDate ? formatDate(res.startDate) : '—'}
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        {res.endDate ? formatDate(res.endDate) : 'Present'}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data.previousResidences || data.previousResidences.length === 0) && (
                  <tr><td colSpan={2} className="px-5 py-6 text-center text-slate-400 text-xs italic">No previous residence history.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* ROW 3: Driver Licenses */}
      <SectionCard icon={Award} iconBg="bg-blue-50" iconColor="text-blue-600" title="Driver Licenses" onEdit={onEditLicenses}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-5 py-2.5">Type</th>
                <th className="px-5 py-2.5">Number</th>
                <th className="px-5 py-2.5">State</th>
                <th className="px-5 py-2.5">Class</th>
                <th className="px-5 py-2.5">Expires</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.licenses?.map((lic: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{lic.type}</span>
                      {lic.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">Primary</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-slate-600 uppercase">{lic.licenseNumber}</td>
                  <td className="px-5 py-3.5 text-slate-600">{lic.province}</td>
                  <td className="px-5 py-3.5 text-slate-600">{lic.class}</td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(lic.expiryDate)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={lic.status} /></td>
                </tr>
              ))}
              {(!data.licenses || data.licenses.length === 0) && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400 text-xs italic">No licenses recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ROW 4: Travel Documents */}
      <SectionCard icon={Briefcase} iconBg="bg-sky-50" iconColor="text-sky-600" title="Travel Documents" onEdit={onEditTravelDocs}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-5 py-2.5">Type</th>
                <th className="px-5 py-2.5">Number</th>
                <th className="px-5 py-2.5">Country</th>
                <th className="px-5 py-2.5">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.travelDocuments?.map((doc: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{doc.type}</td>
                  <td className="px-5 py-3.5 font-mono text-sm text-slate-600">{doc.number}</td>
                  <td className="px-5 py-3.5 text-slate-600 uppercase">{doc.country}</td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(doc.expiryDate)}</td>
                </tr>
              ))}
              {(!data.travelDocuments || data.travelDocuments.length === 0) && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400 text-xs italic">No travel documents recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ROW 5: Employment History */}
      <SectionCard icon={Briefcase} iconBg="bg-amber-50" iconColor="text-amber-600" title="Employment History" onEdit={onEditEmployment}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-5 py-2.5">Employer</th>
                <th className="px-5 py-2.5">Timeline</th>
                <th className="px-5 py-2.5">Zone</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.employmentHistory?.map((job: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">{job.employerName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {typeof job.address === 'object'
                        ? `${job.address.city || ''}, ${job.address.state || ''}`
                        : job.address}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="text-xs text-slate-600 font-mono">
                      {formatDate(job.startDate)} — {formatDate(job.endDate)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm">{job.operatingZone}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                      job.terminationStatus === 'Voluntary' ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    )}>
                      {job.terminationStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {job.hasReferenceDoc && job.referenceDocId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        <FileCheck className="w-3 h-3" /> Verified
                      </span>
                    ) : job.hasReferenceDoc ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        <FileWarning className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data.employmentHistory || data.employmentHistory.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-xs italic">No employment history recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import { calculateComplianceStatus, calculateDriverComplianceStats, getMaxReminderDays, isMonitoringEnabled } from '@/utils/compliance-utils';


// ... (existing helper components)

const Card = ({ title, icon, rightAction, children, className }: { title: string, icon: any, rightAction?: React.ReactNode, children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full", className)}>
    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                {React.createElement(icon, { size: 18 })}
            </div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
        </div>
        {rightAction && <div>{rightAction}</div>}
    </div>
    <div className="p-6 flex-1">
        {children}
    </div>
  </div>
);

// Local Badge definition matching AssetDetailView for consistency
const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: string; className?: string }) => {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-800 border-transparent',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Drafted: 'bg-blue-50 text-blue-700 border-blue-200',
    Deactivated: 'bg-slate-100 text-slate-500 border-slate-200',
    Maintenance: 'bg-rose-50 text-rose-700 border-rose-200',
    OutOfService: 'bg-amber-50 text-amber-700 border-amber-200',
    Owned: 'bg-slate-100 text-slate-600 border-slate-200',
    Leased: 'bg-amber-50 text-amber-700 border-amber-200',
    Financed: 'bg-sky-50 text-sky-700 border-sky-200',
    Rented: 'bg-purple-50 text-purple-700 border-purple-200',
    success: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20',
    warning: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20',
    danger: 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20',
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20',
    neutral: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/10',
    pending: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20'
  };
  return (
    <div className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-tight', variants[variant] || variants.default, className)}>
      {['Active', 'Drafted', 'Maintenance', 'Deactivated', 'OutOfService'].includes(variant) && (
        <span className={cn("mr-1.5 h-1 w-1 rounded-full",
          variant === 'Active' ? 'bg-emerald-500' :
          variant === 'Maintenance' ? 'bg-rose-500' :
          variant === 'OutOfService' ? 'bg-amber-500' :
          variant === 'Drafted' ? 'bg-blue-500' : 'bg-slate-400')} />
      )}
      {children}
    </div>
  );
};

export const DriverProfileView = ({ onBack, initialDriverData, onEditProfile, onUpdate }: any) => {
  const [activeTab, setActiveTab] = useState('Overview'); // Default to Overview
  const [driverData, setDriverData] = useState(initialDriverData);
  const { keyNumbers, documents, tagSections, getDocumentTypeById } = useAppData();

  // Sync state if initialData changes
  useEffect(() => { setDriverData(initialDriverData); }, [initialDriverData]);

  // Helper to update both local state and notify parent
  const updateDriverData = (newData: any) => {
    setDriverData(newData);
    if (onUpdate) onUpdate(newData);
  };

  // Modal States
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isResidencesModalOpen, setIsResidencesModalOpen] = useState(false);
  const [isLicensesModalOpen, setIsLicensesModalOpen] = useState(false);
  const [isTravelDocsModalOpen, setIsTravelDocsModalOpen] = useState(false);
  const [isEmploymentModalOpen, setIsEmploymentModalOpen] = useState(false);
  const [viewingAccident, setViewingAccident] = useState<any>(null);
  const [editingAccident, setEditingAccident] = useState<any>(null);
  const [viewingViolation, setViewingViolation] = useState<any>(null);
  const [editingViolation, setEditingViolation] = useState<any>(null);
  const [expandedInspection, setExpandedInspection] = useState<string | null>(null);
  const [viewingInspection, setViewingInspection] = useState<any>(null);

  // Key Number Modal State
  const [isKeyNumberModalOpen, setIsKeyNumberModalOpen] = useState(false);
  const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
  const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit'>('edit');

  // Accidents Tab State
  const [accQ, setAccQ] = useState('');
  const [accPage, setAccPage] = useState(1);
  const [accRpp, setAccRpp] = useState(10);
  const [accCols, setAccCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'incident', label: 'Incident', visible: true },
    { id: 'type', label: 'Type / Cause', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'severity', label: 'Severity', visible: true },
    { id: 'preventability', label: 'Preventability', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'cost', label: 'Cost', visible: true },
  ]);
  useEffect(() => { setAccPage(1); }, [accQ, accRpp]);

  // Inspections Tab State
  const [insQ, setInsQ] = useState('');
  const [insPage, setInsPage] = useState(1);
  const [insRpp, setInsRpp] = useState(10);
  const [insCols, setInsCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'report', label: 'Report #', visible: true },
    { id: 'level', label: 'Level', visible: true },
    { id: 'state', label: 'State', visible: true },
    { id: 'vehicle', label: 'Vehicle', visible: true },
    { id: 'violations', label: 'Violations', visible: true },
    { id: 'oos', label: 'OOS', visible: true },
    { id: 'result', label: 'Result', visible: true },
  ]);
  useEffect(() => { setInsPage(1); }, [insQ, insRpp]);

  // Violations Tab State
  const [violQ, setViolQ] = useState('');
  const [violPage, setViolPage] = useState(1);
  const [violRpp, setViolRpp] = useState(10);
  const [violCols, setViolCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'code', label: 'Code', visible: true },
    { id: 'description', label: 'Description', visible: true },
    { id: 'state', label: 'State', visible: true },
    { id: 'asset', label: 'Asset', visible: true },
    { id: 'result', label: 'Result', visible: true },
    { id: 'oos', label: 'OOS', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'fine', label: 'Fine', visible: true },
  ]);
  useEffect(() => { setViolPage(1); }, [violQ, violRpp]);

  // Tickets Tab State
  const [tickQ, setTickQ] = useState('');
  const [tickPage, setTickPage] = useState(1);
  const [tickRpp, setTickRpp] = useState(10);
  const [tickCols, setTickCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'offense', label: 'Offense #', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'asset', label: 'Asset', visible: true },
    { id: 'fine', label: 'Fine', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'docs', label: 'Docs', visible: true },
  ]);
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const [editingTicket2, setEditingTicket2] = useState<any>(null);
  useEffect(() => { setTickPage(1); }, [tickQ, tickRpp]);

  // Document State

  // Handlers
  const handleSavePersonal = (newPersonal: any) => { updateDriverData({ ...driverData, ...newPersonal }); setIsPersonalModalOpen(false); };
  const handleSaveAddress = (newAddress: any) => { updateDriverData({ ...driverData, ...newAddress }); setIsAddressModalOpen(false); };
  const handleSaveContacts = (newContacts: any) => { updateDriverData({ ...driverData, emergencyContacts: newContacts }); setIsContactsModalOpen(false); };
  const handleSaveResidences = (newResidences: any) => { updateDriverData({ ...driverData, previousResidences: newResidences }); setIsResidencesModalOpen(false); };
  const handleSaveLicenses = (newLicenses: any) => {
    // Logic to sync License Uploads to Documents
    const updatedDocuments = [...(driverData.documents || [])];


    newLicenses.forEach((lic: any) => {
        // Check if this license has an upload (either images or PDF)
        const hasUpload = lic.frontImage || lic.rearImage || lic.pdfDoc || lic.photo;
        
        // Determine Document Type ID based on License Type
        const isCDL = lic.type === 'CDL';
        const licenseDocTypeId = isCDL ? 'DT-CDL' : 'DT-DL';
        const licenseDocName = isCDL ? 'Commercial Driver License (CDL)' : 'Driver License (Standard)';

        if (hasUpload && lic.status === 'Valid') {
            // Check if a document entry already exists for this specific license type
            const existingDocIndex = updatedDocuments.findIndex(d => d.typeId === licenseDocTypeId);
            
            const docEntry = {
                id: existingDocIndex >= 0 ? updatedDocuments[existingDocIndex].id : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                typeId: licenseDocTypeId,
                name: licenseDocName, // Use dynamic name
                dateUploaded: new Date().toLocaleDateString(),
                status: 'Active', // or Valid
                expiryDate: lic.expiryDate,
                hasUpload: true,
                // We could store a reference to the license ID if we wanted tight coupling
                // licenseId: lic.id 
            };

            if (existingDocIndex >= 0) {
                updatedDocuments[existingDocIndex] = { ...updatedDocuments[existingDocIndex], ...docEntry };
            } else {
                updatedDocuments.push(docEntry);
            }
        }
    });

    // Sync license values -> keyNumbers so Compliance tab stays in sync
    const updatedKeyNumbers = [...(driverData.keyNumbers || [])];
    newLicenses.forEach((lic: any) => {
        const knId = lic.type === 'CDL' ? 'kn-cdl' : 'kn-dl';
        const existingKnIdx = updatedKeyNumbers.findIndex((k: any) => k.configId === knId);
        const knEntry = {
            configId: knId,
            value: lic.licenseNumber || '',
            expiryDate: lic.expiryDate || '',
            issueDate: lic.issueDate || '',
            issuingState: lic.province || '',
        };
        if (existingKnIdx >= 0) {
            updatedKeyNumbers[existingKnIdx] = { ...updatedKeyNumbers[existingKnIdx], ...knEntry };
        } else if (lic.licenseNumber) {
            updatedKeyNumbers.push(knEntry);
        }
    });

    updateDriverData({
        ...driverData,
        licenses: newLicenses,
        documents: updatedDocuments,
        keyNumbers: updatedKeyNumbers
    });
    setIsLicensesModalOpen(false);
  };
  const handleSaveTravelDocs = (newDocs: any) => {
    // Logic to sync Travel Doc Uploads to Documents
    const updatedDocuments = [...(driverData.documents || [])];
    
    // Map Travel Doc Types to System Document Type IDs
    const typeMap: Record<string, string> = {
        'Passport': '10',
        'FAST Card': '11',
        'Visa': '12',
        'TWIC Card': '13'
    };

    newDocs.forEach((doc: any) => {
        const docTypeId = typeMap[doc.type];
        // Only sync if it's a known system type and has uploads or data
        // For travel docs, we might sync even without uploads if the record exists, 
        // to show status, but typically documents tracks files. 
        // Let's assume we sync if there are files or if it's a valid record.
        const hasUpload = (doc.images && doc.images.length > 0) || doc.pdfDoc;
        
        if (docTypeId) {
            const existingDocIndex = updatedDocuments.findIndex(d => d.typeId === docTypeId);
            
            // If it exists, we update it. If it doesn't, we create it ONLY if there's an upload OR strictly required? 
            // The user wants "mapped out fine". If I have a Passport record, the Passport Document requirement should be met.
            // So if `doc.type` matches, I should update the document status.
            
            const status = (doc.expiryDate && new Date(doc.expiryDate) < new Date()) ? 'Expired' : 'Active';

            const docEntry = {
                id: existingDocIndex >= 0 ? updatedDocuments[existingDocIndex].id : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                typeId: docTypeId,
                name: doc.type,
                dateUploaded: hasUpload ? new Date().toLocaleDateString() : (existingDocIndex >= 0 ? updatedDocuments[existingDocIndex].dateUploaded : '—'),
                status: status,
                expiryDate: doc.expiryDate,
                hasUpload: hasUpload || (existingDocIndex >= 0 ? updatedDocuments[existingDocIndex].hasUpload : false),
                uploadedFiles: doc.images ? [...doc.images] : [], // simplistic file passing
                // Note: The main document list consumes this.
            };

            if (existingDocIndex >= 0) {
                updatedDocuments[existingDocIndex] = { ...updatedDocuments[existingDocIndex], ...docEntry };
            } else if (hasUpload || doc.number) { 
                // Create if we have data (number or upload)
                updatedDocuments.push(docEntry);
            }
        }
    });

    // Sync travel doc values -> keyNumbers so Compliance tab stays in sync
    const updatedKeyNumbers = [...(driverData.keyNumbers || [])];
    const travelToKnMap: Record<string, string> = {
        'Passport': 'kn-passport',
        'FAST Card': 'kn-fast',
        'Visa': 'kn-visa',
        'TWIC Card': 'kn-twic'
    };

    newDocs.forEach((doc: any) => {
        const knId = travelToKnMap[doc.type];
        if (!knId) return;
        const existingKnIdx = updatedKeyNumbers.findIndex((k: any) => k.configId === knId);
        const knEntry = {
            configId: knId,
            value: doc.number || '',
            expiryDate: doc.expiryDate || '',
            issuingCountry: doc.country || '',
        };
        if (existingKnIdx >= 0) {
            updatedKeyNumbers[existingKnIdx] = { ...updatedKeyNumbers[existingKnIdx], ...knEntry };
        } else if (doc.number) {
            updatedKeyNumbers.push(knEntry);
        }
    });

    updateDriverData({ ...driverData, travelDocuments: newDocs, documents: updatedDocuments, keyNumbers: updatedKeyNumbers });
    setIsTravelDocsModalOpen(false);
  };
  const handleSaveEmployment = (newHistory: any) => { 
      const updatedDocuments = [...(driverData.documents || [])];
      const refDocTypeId = '14'; // Employment Reference

      const processedHistory = newHistory.map((item: any) => {
          // Handle Upload
          if (item.hasReferenceDoc && item.referenceDocUpload) {
              const newDocId = `doc_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const docEntry = {
                  id: newDocId,
                  typeId: refDocTypeId,
                  name: `Reference - ${item.employerName}`,
                  dateUploaded: new Date().toLocaleDateString(),
                  status: 'Active',
                  expiryDate: '',
                  hasUpload: true,
                  uploadedFiles: [item.referenceDocUpload],
                  relatedTo: 'driver', 
                  description: `Employment Verification for ${item.employerName}`
              };
              updatedDocuments.push(docEntry);
              
              // Return item with link and without the raw file object (to avoid serialization issues if any)
              const { referenceDocUpload, ...rest } = item;
              return { 
                  ...rest, 
                  referenceDocId: newDocId
              };
          }
          
          // Handle Removal of Reference Link if toggle is OFF
          if (!item.hasReferenceDoc && item.referenceDocId) {
               return { ...item, referenceDocId: undefined };
          }

          return item;
      });

      updateDriverData({ 
          ...driverData, 
          employmentHistory: processedHistory, 
          documents: updatedDocuments 
      });
      setIsEmploymentModalOpen(false); 
  };

    // Key Number Logic
    const handleEditKeyNumber = (kn: KeyNumberConfig, currentValue: string, currentExpiry?: string) => {
        setEditingKeyNumber({
            configId: kn.id,
            value: currentValue,
            expiryDate: currentExpiry || '',
            issueDate: '', 
            tags: [],
            documents: [],
            numberRequired: kn.numberRequired ?? true,
            hasExpiry: kn.hasExpiry,
            documentRequired: kn.documentRequired
        });
        setKeyNumberModalMode('edit');
        setIsKeyNumberModalOpen(true);
    };

    const handleSaveKeyNumber = (data: any) => {
        const newData = { ...driverData };

        // --- Bidirectional Sync: Key Number -> Source Data ---

        // Driver License Sync (CDL or Standard)
        if (data.configId === 'kn-dl' || data.configId === 'kn-cdl') {
            const isCDL = data.configId === 'kn-cdl';
            const targetType = isCDL ? 'CDL' : 'Driver License';
            const licenses = [...(newData.licenses || [])];
            let licenseIndex = licenses.findIndex((l: any) => l.type === targetType);

            if (licenseIndex === -1 && !isCDL) {
                licenseIndex = licenses.findIndex((l: any) => l.type === 'Driver License (Standard)' || l.type === 'Driver License');
            }

            if (licenseIndex !== -1) {
                licenses[licenseIndex] = {
                    ...licenses[licenseIndex],
                    type: targetType,
                    licenseNumber: data.value,
                    expiryDate: data.expiryDate,
                    issueDate: data.issueDate,
                    province: data.issuingState,
                };
            } else {
                licenses.push({
                    id: `lic_${Date.now()}`,
                    type: targetType,
                    licenseNumber: data.value,
                    expiryDate: data.expiryDate,
                    issueDate: data.issueDate,
                    province: data.issuingState,
                    class: isCDL ? 'Class A' : 'Class G',
                    status: 'Valid',
                    isPrimary: licenses.length === 0
                });
            }
            newData.licenses = licenses;
        }

        // Travel Document Sync (Passport, FAST, Visa, TWIC)
        const knToTravelType: Record<string, string> = {
            'kn-passport': 'Passport',
            'kn-fast': 'FAST Card',
            'kn-visa': 'Visa',
            'kn-twic': 'TWIC Card'
        };
        if (knToTravelType[data.configId]) {
            const docType = knToTravelType[data.configId];
            const travelDocs = [...(newData.travelDocuments || [])];
            const existingIdx = travelDocs.findIndex((td: any) => td.type === docType);

            const updatedDoc = {
                type: docType,
                number: data.value || '',
                expiryDate: data.expiryDate || '',
                country: data.issuingCountry || data.issuingState || '',
                uploadType: 'images'
            };

            if (existingIdx !== -1) {
                travelDocs[existingIdx] = { ...travelDocs[existingIdx], ...updatedDoc };
            } else if (data.value) {
                travelDocs.push({ id: `TD-${Date.now()}`, ...updatedDoc });
            }
            newData.travelDocuments = travelDocs;

            // Also sync to documents list
            const travelDocTypeMap: Record<string, string> = {
                'Passport': '10', 'FAST Card': '11', 'Visa': '12', 'TWIC Card': '13'
            };
            const sysDocTypeId = travelDocTypeMap[docType];
            if (sysDocTypeId) {
                const docs = [...(newData.documents || [])];
                const existingDocIdx = docs.findIndex((d: any) => d.typeId === sysDocTypeId);
                const status = (data.expiryDate && new Date(data.expiryDate) < new Date()) ? 'Expired' : 'Active';
                const docEntry = {
                    id: existingDocIdx >= 0 ? docs[existingDocIdx].id : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    typeId: sysDocTypeId,
                    name: docType,
                    dateUploaded: existingDocIdx >= 0 ? docs[existingDocIdx].dateUploaded : '—',
                    status,
                    expiryDate: data.expiryDate || '',
                    hasUpload: existingDocIdx >= 0 ? docs[existingDocIdx].hasUpload : false,
                };
                if (existingDocIdx >= 0) {
                    docs[existingDocIdx] = { ...docs[existingDocIdx], ...docEntry };
                } else if (data.value) {
                    docs.push(docEntry);
                }
                newData.documents = docs;
            }
        }

        // --- Save to keyNumbers array ---
        const existingIndex = newData.keyNumbers?.findIndex((k: any) => k.configId === data.configId);
        if (!newData.keyNumbers) newData.keyNumbers = [];

        if (existingIndex !== undefined && existingIndex >= 0) {
            newData.keyNumbers[existingIndex] = { ...newData.keyNumbers[existingIndex], ...data };
        } else {
            newData.keyNumbers.push(data);
        }

        setDriverData(newData);
        setIsKeyNumberModalOpen(false);
        setEditingKeyNumber(null);
    };

    // State for Compliance Filter
  const [activeComplianceFilter, setActiveComplianceFilter] = useState<string | null>(null);
  const [keyNumberGroupsCollapsed, setKeyNumberGroupsCollapsed] = useState<Record<string, boolean>>({});
  const [docFilter, setDocFilter] = useState('all');
  
  // Document Modals State
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [docIssuingCountry, setDocIssuingCountry] = useState('');
  const [docIssuingState, setDocIssuingState] = useState('');
  const [deletingDocument, setDeletingDocument] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleSaveDocument = () => {
      // Mock save logic - store uploaded file metadata
      if (editingDocument && uploadedFiles.length > 0) {
          const newDocs = uploadedFiles.map((f, i) => ({
              id: `upload_${Date.now()}_${i}`,
              typeId: editingDocument.typeId,
              name: f.name,
              dateUploaded: new Date().toLocaleDateString(),
              expiryDate: editingDocument.expiryDate || '—',
              status: 'Active'
          }));
          setDriverData((prev: any) => ({
              ...prev,
              documents: [...(prev.documents || []), ...newDocs]
          }));
      }
      setUploadedFiles([]);
      setEditingDocument(null);
  };

  const handleDeleteDocument = () => {
      if (deletingDocument) {
          setDriverData((prev: any) => ({
              ...prev,
              documents: (prev.documents || []).filter((d: any) => d.id !== deletingDocument.id)
          }));
          setDeletingDocument(null);
      }
  };

  const toggleKeyNumberGroup = (key: string) => setKeyNumberGroupsCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const getStatusTone = (status: string) => {
    if (status === 'Active' || status === 'Valid' || status === 'Uploaded') return 'success';
    if (status === 'Missing' || status === 'Expired') return 'danger';
    if (status === 'Expiring Soon' || status === 'Incomplete') return 'warning';
    return 'neutral';
  };

  const filterComplianceItems = (items: any[]) => {
    if (!activeComplianceFilter) return items;
    if (activeComplianceFilter === 'missing-number') return items.filter((i: any) => i.number === 'Not entered' || i.status === 'Missing');
    if (activeComplianceFilter === 'missing-expiry') return items.filter((i: any) => i.expiryDate === 'Not set');
    if (activeComplianceFilter === 'missing-doc') return items.filter((i: any) => i.docStatus === 'Missing');
    if (activeComplianceFilter === 'expiring') return items.filter((i: any) => i.status === 'Expiring Soon');
    if (activeComplianceFilter === 'expired') return items.filter((i: any) => i.status === 'Expired');
    return items;
  };

  const filterDocumentItems = (items: any[]) => {
    if (docFilter === 'all') return items;
    if (docFilter === 'required_missing') return items.filter((d: any) => d.requirementLevel === 'required' && !d.hasUpload);
    if (docFilter === 'expiring_soon') return items.filter((d: any) => d.status === 'Expiring Soon');
    if (docFilter === 'expired') return items.filter((d: any) => d.status === 'Expired');
    return items;
  };

  // Group Key Numbers by Category (with Filter Logic)
  const complianceGroups = React.useMemo(() => {
    if (!keyNumbers) return [];

    // Filter relevant key numbers for drivers
    const driverKeyNumbers = keyNumbers.filter(
        (kn: KeyNumberConfig) => kn.entityType === 'Driver' && kn.status === 'Active'
    );

    // Group by numberTypeName (Category)
    // We can use a map
    const grouped: any = {};

    driverKeyNumbers.forEach((kn: KeyNumberConfig) => {
        // ... (existing grouping logic) ...
        const category = kn.category || 'General';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(kn);
    });

    return Object.entries(grouped).map(([category, items]: [string, any]) => ({
        key: category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: category.toUpperCase(),
        items: items.map((kn: KeyNumberConfig) => {
            // Find value in driverData
            let driverKn = driverData.keyNumbers?.find((k: any) => k.configId === kn.id);

            // Special handling for Driver License (CDL or Standard)
            if (kn.id === 'kn-dl' || kn.id === 'kn-cdl') {
                const targetType = kn.id === 'kn-cdl' ? 'CDL' : 'Driver License';
                let license = driverData.licenses?.find((l: any) => l.type === targetType);

                if (!license && targetType === 'Driver License') {
                     license = driverData.licenses?.find((l: any) => l.type === 'Driver License (Standard)' || l.type === 'Driver License');
                }

                if (license) {
                    driverKn = {
                        configId: kn.id,
                        value: license.licenseNumber,
                        expiryDate: license.expiryDate,
                        issueDate: license.issueDate,
                        issuingState: license.province,
                        status: license.status
                    };
                }
            }

            // Special handling for Travel Documents (Passport, FAST, Visa, TWIC)
            const travelDocMap: Record<string, string> = {
                'kn-passport': 'Passport',
                'kn-fast': 'FAST Card',
                'kn-visa': 'Visa',
                'kn-twic': 'TWIC Card'
            };
            if (travelDocMap[kn.id]) {
                const travelDoc = driverData.travelDocuments?.find(
                    (td: any) => td.type === travelDocMap[kn.id]
                );
                if (travelDoc) {
                    driverKn = {
                        configId: kn.id,
                        value: travelDoc.number,
                        expiryDate: travelDoc.expiryDate,
                        issuingCountry: travelDoc.country,
                        status: (travelDoc.expiryDate && new Date(travelDoc.expiryDate) < new Date()) ? 'Expired' : 'Active'
                    };
                }
            }
            
            const value = driverKn?.value || '';
            const expiryDate = driverKn?.expiryDate || null;
            const hasValue = !!value && value !== '';

            const enabled = isMonitoringEnabled(kn);
            const maxDays = getMaxReminderDays(kn);
            const status = calculateComplianceStatus(expiryDate, enabled, maxDays, hasValue, kn.hasExpiry, kn.numberRequired ?? true);

            return {
                id: kn.id,
                name: kn.numberTypeName,
                number: hasValue ? value : 'Not entered',
                expiryDate: expiryDate ? formatDate(expiryDate) : (kn.hasExpiry ? 'Not set' : '-'),
                status,
                config: kn,
                rawExpiry: expiryDate
            };
        }).filter((item: any) => {
             if (!activeComplianceFilter) return true;
             if (activeComplianceFilter === 'missing-number') return item.number === 'Not entered';
             if (activeComplianceFilter === 'missing-expiry') return (item.expiryDate === 'Not set' || item.expiryDate === '-') && item.status !== 'Active' && item.config.hasExpiry;
             if (activeComplianceFilter === 'expiring') return item.status === 'Expiring Soon';
             if (activeComplianceFilter === 'expired') return item.status === 'Expired';
             return true;
        })
    })).filter((group: any) => group.items.length > 0);
  }, [keyNumbers, driverData?.keyNumbers, driverData?.licenses, driverData?.travelDocuments, activeComplianceFilter]);

  // Calculate Compliance Stats
  const complianceStats = React.useMemo(() => {
      if (!driverData) return { missingNumber: 0, missingExpiry: 0, missingDoc: 0, expiring: 0, expired: 0 };
      // Use shared utility for consistent calculation
      // Note: driverData (local state) might differ from context while editing, 
      // but we want stats to reflect current view state.
      return calculateDriverComplianceStats(driverData, keyNumbers, documents);
  }, [keyNumbers, driverData?.keyNumbers, driverData?.documents, documents]);
    
  // Calculate Work Experience Countries
  const workCountries = React.useMemo(() => {
      const histories = driverData.employmentHistory || [];
      const countries = new Set<string>();
      histories.forEach((h: any) => {
          if (typeof h.address === 'object' && h.address.country) {
              countries.add(h.address.country);
          } else {
              countries.add('USA'); // Default for string addresses or missing country
          }
      });
      return Array.from(countries).join(', ');
  }, [driverData.employmentHistory]);


    const tabs = [
        { id: 'Overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'Profile', label: 'Profile', icon: User },
        { id: 'Compliance', label: 'Compliance Monitoring', icon: ShieldCheck },
        { id: 'Documents', label: 'Documents', icon: FileText },
        { id: 'Training', label: 'Training', icon: GraduationCap },
        { id: 'Certificates', label: 'Certificates', icon: Award },
        { id: 'Trips', label: 'Trips', icon: Route },
        { id: 'Tickets', label: 'Tickets', icon: Ticket },
        { id: 'Accidents', label: 'Accidents', icon: Car },
        { id: 'Inspections', label: 'Inspections', icon: FileCheck },
        { id: 'Violations', label: 'Violations', icon: AlertTriangle },
        { id: 'Paystubs', label: 'Paystubs', icon: DollarSign },
        { id: 'HoursOfService', label: 'Hours of Service', icon: Clock },
        { id: 'MileageReport', label: 'Mileage Report', icon: Map }
    ];

  // Document Logic
  const driverDocuments = React.useMemo(() => {
      const driverDocTypes = documents.filter((doc: any) => doc.relatedTo === 'driver');
      
      // 1. Get all actual uploads from driverData.documents
      const actualUploads = (driverData.documents || []).map((userDoc: any) => {
          const docType = getDocumentTypeById(userDoc.typeId) || driverDocTypes.find((dt: any) => dt.id === userDoc.typeId);
          
          // Calculate status based on expiry
          const status = calculateComplianceStatus(
            userDoc.expiryDate, 
            docType?.monitoring?.enabled ?? false, 
            30, // Default 30 days warning
            true, // Has upload
            docType?.expiryRequired ?? false, 
            docType?.requirementLevel === 'required'
          );

          return {
              id: userDoc.id || `doc_${Math.random()}`,
              documentType: docType?.name || 'Unknown Document',
              typeId: userDoc.typeId,
              documentName: userDoc.name || docType?.name || 'Document',
              folderPath: docType?.destination?.folderName || 'Driver',
              dateUploaded: userDoc.dateUploaded || '—',
              status: userDoc.status || status,
              expiryDate: userDoc.expiryDate || '—',
              hasUpload: true,
              requirementLevel: docType?.requirementLevel || 'optional',
              linkedExpense: null,
              linkedKeyNumber: null,
              docTypeData: docType
          };
      });

      // 2. Identify document types without uploads (required + optional)
      const missingRequirements = driverDocTypes.filter((dt: any) => {
          // Skip 'not_required' types — they don't need to appear
          if (dt.requirementLevel === 'not_required') return false;
          
          const hasUpload = actualUploads.some((d: any) => d.typeId === dt.id);
          if (hasUpload) return false;

          return true;
      }).map((dt: any) => {
          return {
              id: dt.id,
              documentType: dt.name,
              typeId: dt.id,
              documentName: '—',
              folderPath: dt.destination?.folderName || 'Driver',
              dateUploaded: '—',
              status: dt.requirementLevel === 'required' ? 'Missing' : 'Not Uploaded',
              expiryDate: '—',
              hasUpload: false,
              requirementLevel: dt.requirementLevel,
              linkedExpense: null,
              linkedKeyNumber: null,
              docTypeData: dt
          };
      });

      // Combine: Actual Uploads + Missing Requirements
      const allDocs = [...actualUploads, ...missingRequirements];

      // Assign Categories
      return allDocs.map(doc => {
          let category = 'Other';
          const typeId = String(doc.typeId);
          
          if (['DT-DL', 'DT-CDL', '9'].includes(typeId) || doc.documentType?.includes('License')) category = 'Licenses';
          else if (['10', '11', '12', '13'].includes(typeId) || ['Passport', 'Visa', 'FAST', 'TWIC'].some(t => doc.documentType?.includes(t))) category = 'Travel Documents';
          else if (typeId === '14' || doc.documentType?.includes('Reference')) category = 'Employment';
          else if (typeId === 'DT-PAYSTUB') category = 'Finance';
          else if (['offense_ticket', 'payment_receipt', 'notice_of_trial'].includes(typeId)) category = 'Legal';
          else if (['1', '2', '3', '4', '5'].includes(typeId)) category = 'Company'; // Carrier docs usually not here but just in case
          else category = 'Compliance'; // Medical, Training, etc.

          return { ...doc, category };
      });

  }, [documents, keyNumbers, driverData?.documents, driverData?.keyNumbers]);

  // Document filter counts
  const docCounts = React.useMemo(() => ({
    requiredMissing: driverDocuments.filter((d: any) => d.status === 'Missing').length,
    expiringSoon: driverDocuments.filter((d: any) => d.status === 'Expiring Soon').length,
    expired: driverDocuments.filter((d: any) => d.status === 'Expired').length
  }), [driverDocuments]);

  return (
    <div className="bg-slate-50 min-h-screen pb-12 font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        {/* Breadcrumb Bar */}
        <header className="h-11 px-8 flex items-center border-b border-slate-100 bg-slate-50/60">
          <nav className="flex items-center text-xs font-medium text-slate-500">
            <span className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" onClick={onBack}>Drivers List</span>
            <ChevronRight size={12} className="mx-1.5 text-slate-300" />
            <span className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" onClick={onBack}>Personnel</span>
            <ChevronRight size={12} className="mx-1.5 text-slate-300" />
            <span className="text-slate-700 font-semibold">{driverData.firstName} {driverData.lastName}</span>
          </nav>
        </header>

        {/* Profile Header */}
        <div className="w-full px-8 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              {/* Avatar with Online Indicator */}
              <div className="relative flex-shrink-0">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-[3px] border-white shadow-md flex items-center justify-center text-xl font-bold text-slate-600 overflow-hidden ring-1 ring-slate-200/60">
                  {driverData.photo
                    ? <img src={driverData.photo} alt={`${driverData.firstName} ${driverData.lastName}`} className="w-full h-full object-cover" />
                    : `${driverData.firstName?.[0] || ''}${driverData.lastName?.[0] || ''}`
                  }
                </div>
                <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${driverData.status === 'Active' ? 'bg-emerald-500' : driverData.status === 'On Leave' ? 'bg-amber-400' : 'bg-slate-400'}`} title={driverData.status} />
              </div>

              {/* Name & Meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{driverData.firstName} {driverData.lastName}</h1>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200 uppercase tracking-wider whitespace-nowrap">
                    {driverData.driverType || 'Long Haul Driver'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 text-[11px]">{driverData.id}</span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1">
                    <CalendarX className="w-3 h-3 text-slate-400" />
                    Hired {formatDate(driverData.hiredDate || driverData.dateHired)}
                  </span>
                  <span className="text-slate-300">|</span>
                  <StatusBadge status={driverData.status} />
                  {workCountries && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Globe className="w-3 h-3 text-slate-400" />
                        {workCountries}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
              <button className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => onEditProfile(driverData)}
                className="px-3.5 py-2 bg-blue-600 border border-blue-700 rounded-lg text-white font-semibold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Underline Style */}
        <div className="w-full px-8">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 pb-3 pt-1 text-sm font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
        
        <div className="w-full p-8">
            {activeTab === 'Compliance' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* COMPLIANCE STAT INDICATORS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <button 
                            onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'missing-number' ? null : 'missing-number')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeComplianceFilter === 'missing-number' ? 'ring-1 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-red-50 text-red-600"><Hash className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Number</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{complianceStats.missingNumber}</div>
                        </button>
                        <button 
                            onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'missing-expiry' ? null : 'missing-expiry')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeComplianceFilter === 'missing-expiry' ? 'ring-1 ring-orange-500 border-l-orange-500' : 'border-l-orange-500 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-orange-50 text-orange-600"><CalendarX className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Expiry</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{complianceStats.missingExpiry}</div>
                        </button>
                        <button 
                            onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'missing-doc' ? null : 'missing-doc')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeComplianceFilter === 'missing-doc' ? 'ring-1 ring-orange-500 border-l-orange-500' : 'border-l-orange-500 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-orange-50 text-orange-600"><FileWarning className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Doc</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{complianceStats.missingDoc}</div>
                        </button>
                        <button 
                            onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'expiring' ? null : 'expiring')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeComplianceFilter === 'expiring' ? 'ring-1 ring-yellow-500 border-l-yellow-500' : 'border-l-yellow-500 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-yellow-50 text-yellow-600"><Clock className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Expiring<br />Soon</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{complianceStats.expiring}</div>
                        </button>
                        <button 
                            onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'expired' ? null : 'expired')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeComplianceFilter === 'expired' ? 'ring-1 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-red-50 text-red-600"><AlertTriangle className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Expired</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{complianceStats.expired}</div>
                        </button>
                    </div>
                    <div className="flex justify-end">
                        {activeComplianceFilter && (
                            <button onClick={() => setActiveComplianceFilter(null)} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                <X className="w-3 h-3" /> Clear Filter
                            </button>
                        )}
                    </div>

                    {/* KEY NUMBERS CARD */}
                    <Card 
                        title="Key Numbers" 
                        icon={FileKey}
                        rightAction={
                            <button 
                                onClick={() => {
                                    setEditingKeyNumber(null);
                                    setKeyNumberModalMode('add');
                                    setIsKeyNumberModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Add Number
                            </button>
                        }
                    >
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-sm table-fixed">
                                <thead className="bg-white border-b border-slate-200 text-slate-400 text-xs uppercase font-bold tracking-wider sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 w-1/4">Number Type</th>
                                        <th className="px-6 py-3 w-1/4">Value</th>
                                        <th className="px-6 py-3 w-1/4">Status</th>
                                        <th className="px-6 py-3 w-1/4">Expiry</th>
                                        <th className="px-6 py-3 w-24 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {complianceGroups.map((group: any) => {
                                        const isCollapsed = keyNumberGroupsCollapsed[group.key] ?? false;
                                        const visibleItems = filterComplianceItems(group.items);
                                        if (activeComplianceFilter && visibleItems.length === 0) return null;

                                        return (
                                            <React.Fragment key={group.key}>
                                                <tr className="bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100" onClick={() => toggleKeyNumberGroup(group.key)}>
                                                    <td colSpan={5} className="px-6 py-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-xs uppercase text-slate-500 tracking-wider pl-2">{group.label}</span>
                                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                        </div>
                                                    </td>
                                                </tr>
                                                {!isCollapsed && visibleItems.map((item: any) => {
                                                    // Find linked document type
                                                    const linkedDocType = documents.find((d: any) => d.id === item.config?.requiredDocumentTypeId);
                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50">
                                                            <td className="px-6 py-4">
                                                                <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                                                                {linkedDocType && (
                                                                    <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5 font-normal">
                                                                        <FileText className="w-3 h-3" />
                                                                        Linked to: {linkedDocType.name}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-400 italic">{item.number === 'Not entered' ? 'Not entered' : <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800 font-bold not-italic">{item.number}</code>}</td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant={getStatusTone(item.status)}>{item.status}</Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-500 italic">{item.expiryDate}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button 
                                                                    onClick={() => handleEditKeyNumber(item.config, item.number !== 'Not entered' ? item.number : '', item.rawExpiry)}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                    {complianceGroups.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                            {activeComplianceFilter ? 'No items match the selected filter.' : 'No Key Numbers configured for Drivers.'}
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'Overview' && (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Construction className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Under Development</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-2">
                        The Driver Overview dashboard is currently being built. Please check back later for updates.
                    </p>
                </div>
            )}

            {activeTab === 'Profile' && (
              <ProfileTab 
                data={driverData} 
                onEditPersonal={() => setIsPersonalModalOpen(true)}
                onEditAddress={() => setIsAddressModalOpen(true)}
                onEditContacts={() => setIsContactsModalOpen(true)}
                onEditResidences={() => setIsResidencesModalOpen(true)}
                onEditLicenses={() => setIsLicensesModalOpen(true)}
                onEditTravelDocs={() => setIsTravelDocsModalOpen(true)}
                onEditEmployment={() => setIsEmploymentModalOpen(true)}
              />
            )}

            {activeTab === 'Documents' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* DOCUMENT FILTER INDICATORS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <button 
                            onClick={() => setDocFilter(docFilter === 'required_missing' ? 'all' : 'required_missing')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${docFilter === 'required_missing' ? 'ring-1 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-red-50 text-red-600"><FileText className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Required</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{docCounts.requiredMissing}</div>
                        </button>
                        <button 
                            onClick={() => setDocFilter(docFilter === 'expiring_soon' ? 'all' : 'expiring_soon')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${docFilter === 'expiring_soon' ? 'ring-1 ring-yellow-500 border-l-yellow-500' : 'border-l-yellow-500 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-yellow-50 text-yellow-600"><Clock className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Expiring<br />Soon</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{docCounts.expiringSoon}</div>
                        </button>
                        <button 
                            onClick={() => setDocFilter(docFilter === 'expired' ? 'all' : 'expired')} 
                            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${docFilter === 'expired' ? 'ring-1 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-red-50 text-red-600"><AlertTriangle className="w-3.5 h-3.5" /></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Expired</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{docCounts.expired}</div>
                        </button>
                    </div>

                    {docFilter !== 'all' && (
                        <div className="flex justify-end">
                            <button onClick={() => setDocFilter('all')} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                <X className="w-3 h-3" /> Clear Filter
                            </button>
                        </div>
                    )}

                    <Card title="Documents" icon={FileText}>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-sm table-fixed">
                                <thead className="bg-white border-b border-slate-200 text-slate-400 text-xs uppercase font-bold tracking-wider sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 w-1/3">Document Type</th>
                                        <th className="px-6 py-3 w-1/4">Status</th>
                                        <th className="px-6 py-3 w-1/4">Expiry</th>
                                        <th className="px-6 py-3 w-24 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                        const filteredDocs = filterDocumentItems(driverDocuments);
                                        const groupMap: Record<string, any[]> = {};
                                        filteredDocs.forEach((doc: any) => {
                                            const cat = doc.category || 'Other';
                                            if (!groupMap[cat]) groupMap[cat] = [];
                                            groupMap[cat].push(doc);
                                        });

                                        const sortOrder = ['Licenses', 'Travel Documents', 'Employment', 'Compliance', 'Finance', 'Legal', 'Company', 'Other'];
                                        const sortedGroups = sortOrder.map(key => ({ 
                                            key, 
                                            label: key,
                                            icon: key === 'Licenses' ? Car : 
                                                  key === 'Travel Documents' ? Map : 
                                                  key === 'Employment' ? Briefcase : 
                                                  key === 'Finance' ? DollarSign : 
                                                  key === 'Legal' ? AlertTriangle : 
                                                  key === 'Compliance' ? ShieldCheck : FileText,
                                            items: groupMap[key] || [] 
                                        })).filter(g => g.items.length > 0);

                                        if (sortedGroups.length === 0) {
                                            return (
                                                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No documents found matching the criteria.</td></tr>
                                            );
                                        }

                                        return sortedGroups.map((group) => (
                                            <React.Fragment key={group.key}>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <td colSpan={4} className="px-6 py-2">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            <group.icon className="w-3.5 h-3.5" />
                                                            {group.label}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {group.items.map((doc: any) => (
                                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50 group">
                                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${doc.hasUpload ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                    <FileText className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-slate-700">{doc.documentType}</div>
                                                                    
                                                                    <div className="flex flex-col gap-0.5">
                                                                        {doc.linkedKeyNumber && (
                                                                            <span className="text-[10px] text-blue-600 flex items-center gap-1 font-medium bg-blue-50 px-1 py-0.5 rounded w-fit">
                                                                                <FileKey className="w-3 h-3" /> Linked: {doc.linkedKeyNumber}
                                                                            </span>
                                                                        )}
                                                                        {doc.typeId === 'DT-PAYSTUB' && (
                                                                            <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-medium bg-indigo-50 px-1 py-0.5 rounded w-fit">
                                                                                <DollarSign className="w-3 h-3" /> Paystub
                                                                            </span>
                                                                        )}
                                                                        {doc.linkedExpense && (
                                                                            <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium bg-emerald-50 px-1 py-0.5 rounded w-fit">
                                                                                <DollarSign className="w-3 h-3" /> Expense: {doc.linkedExpense}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant={getStatusTone(doc.status)} className="shadow-none">{doc.status}</Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                                                            {doc.expiryDate !== '—' ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <CalendarX className={`w-3.5 h-3.5 ${doc.status === 'Expired' ? 'text-red-500' : 'text-slate-400'}`} />
                                                                    <span className={doc.status === 'Expired' ? 'text-red-600 font-bold' : ''}>{doc.expiryDate}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 italic">No Expiry</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {doc.hasUpload ? (
                                                                    <button 
                                                                        onClick={() => setViewingDocument(doc)}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Document"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingDocument(doc);
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Upload Document"
                                                                    >
                                                                        <UploadCloud className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                
                                                                {!doc.docTypeData?.isSystem && (
                                                                    <button 
                                                                        onClick={() => setDeletingDocument(doc)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
            
            {activeTab === 'Paystubs' && (
                <div className="animate-in fade-in">
                    <PaystubsPage 
                        driverId={driverData.id} 
                        onPaystubChange={() => {
                            const fresh = MOCK_DRIVERS.find(d => d.id === driverData.id);
                            if (fresh) setDriverData({...fresh});
                        }}
                    />
                </div>
            )}

            {/* ACCIDENTS TAB */}
            {activeTab === 'Accidents' && (() => {
              const driverIncidents = INCIDENTS.filter((inc: any) => inc.driver?.driverId === driverData.id);
              const totalCost = driverIncidents.reduce((sum: number, inc: any) => sum + (inc.costs?.totalAccidentCosts || 0), 0);
              const preventableCount = driverIncidents.filter((inc: any) => inc.preventability?.value === 'preventable').length;
              const tbdCount = driverIncidents.filter((inc: any) => inc.preventability?.value === 'tbd').length;

              const accColVis = (id: string) => accCols.find(c => c.id === id)?.visible;
              const accFiltered = driverIncidents.filter((inc: any) => {
                if (!accQ) return true;
                const s = accQ.toLowerCase();
                return inc.incidentId?.toLowerCase().includes(s) || inc.cause?.incidentType?.toLowerCase().includes(s) || inc.location?.city?.toLowerCase().includes(s);
              });
              const accPaged = accFiltered.slice((accPage - 1) * accRpp, accPage * accRpp);

              return (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Accidents</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">{driverIncidents.length}</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-emerald-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Costs</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCost)}</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Preventable<br />Accidents</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">{preventableCount}</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-500 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Pending<br />(TBD)</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">{tbdCount}</div>
                    </div>
                  </div>

                  {/* Table Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <DataListToolbar searchValue={accQ} onSearchChange={setAccQ} searchPlaceholder="Search incidents..." columns={accCols} onToggleColumn={(id) => setAccCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={accFiltered.length} currentPage={accPage} rowsPerPage={accRpp} onPageChange={setAccPage} onRowsPerPageChange={setAccRpp} />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            {accColVis('date') && <th className="px-5 py-3">Date</th>}
                            {accColVis('incident') && <th className="px-5 py-3">Incident</th>}
                            {accColVis('type') && <th className="px-5 py-3">Type / Cause</th>}
                            {accColVis('location') && <th className="px-5 py-3">Location</th>}
                            {accColVis('severity') && <th className="px-5 py-3 text-center">Severity</th>}
                            {accColVis('preventability') && <th className="px-5 py-3 text-center">Preventability</th>}
                            {accColVis('status') && <th className="px-5 py-3 text-center">Status</th>}
                            {accColVis('cost') && <th className="px-5 py-3 text-right">Cost</th>}
                            <th className="px-5 py-3 text-center w-[90px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accPaged.length > 0 ? accPaged.map((inc: any) => (
                               <tr key={inc.incidentId} className="group hover:bg-blue-50/40 transition-all duration-150 cursor-pointer" onClick={() => setViewingAccident(inc)}>
                                 {accColVis('date') && (<td className="px-5 py-3.5 whitespace-nowrap">
                                   <div className="font-semibold text-slate-900 text-sm">{new Date(inc.occurredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                   <div className="text-[11px] text-slate-400 mt-0.5">{new Date(inc.occurredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                                 </td>)}
                                 {accColVis('incident') && (<td className="px-5 py-3.5">
                                   <code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{inc.incidentId}</code>
                                   {inc.insuranceClaimNumber && (<div className="text-[10px] text-slate-400 mt-1 font-medium">Claim: {inc.insuranceClaimNumber}</div>)}
                                 </td>)}
                                 {accColVis('type') && (<td className="px-5 py-3.5">
                                   <div className="font-semibold text-slate-800 text-sm">{inc.cause?.incidentType || '—'}</div>
                                   <div className="text-[11px] text-slate-400 mt-0.5">{inc.cause?.primaryCause}</div>
                                 </td>)}
                                 {accColVis('location') && (<td className="px-5 py-3.5">
                                   <div className="flex items-start gap-1.5">
                                     <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                                     <div>
                                       <div className="text-sm font-medium text-slate-700">{inc.location?.city}, {inc.location?.stateOrProvince}</div>
                                       <div className="text-[10px] text-slate-400">{inc.location?.country}</div>
                                     </div>
                                   </div>
                                 </td>)}
                                 {accColVis('severity') && (<td className="px-5 py-3.5 text-center">
                                   <div className="flex flex-col items-center gap-1">
                                     {inc.severity?.fatalities > 0 && <Badge variant="danger">Fatal ({inc.severity.fatalities})</Badge>}
                                     {inc.severity?.injuriesNonFatal > 0 && <Badge variant="warning">Injuries ({inc.severity.injuriesNonFatal})</Badge>}
                                     {inc.severity?.towAway && <Badge variant="neutral">Tow Away</Badge>}
                                     {!inc.severity?.fatalities && !inc.severity?.injuriesNonFatal && !inc.severity?.towAway && <span className="text-[11px] text-slate-400">Minor</span>}
                                   </div>
                                 </td>)}
                                 {accColVis('preventability') && (<td className="px-5 py-3.5 text-center">
                                   <Badge variant={inc.preventability?.value === 'preventable' ? 'danger' : inc.preventability?.value === 'non_preventable' ? 'success' : 'pending'}>
                                     {inc.preventability?.value === 'preventable' ? 'Preventable' : inc.preventability?.value === 'non_preventable' ? 'Non-Preventable' : 'TBD'}
                                   </Badge>
                                 </td>)}
                                 {accColVis('status') && (<td className="px-5 py-3.5 text-center">
                                   <Badge variant={inc.status?.value === 'active' ? 'warning' : 'success'}>{inc.status?.label || inc.status?.value}</Badge>
                                 </td>)}
                                 {accColVis('cost') && (<td className="px-5 py-3.5 text-right">
                                   <span className="font-bold text-slate-900">{inc.costs?.totalAccidentCosts > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: inc.costs?.currency || 'USD' }).format(inc.costs.totalAccidentCosts) : '—'}</span>
                                 </td>)}
                                 <td className="px-5 py-3.5 text-center">
                                   <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={(e) => { e.stopPropagation(); setViewingAccident(inc); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                                     <button onClick={(e) => { e.stopPropagation(); setEditingAccident(inc); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                                   </div>
                                 </td>
                               </tr>
                          )) : (
                              <tr>
                                <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                                  <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-4 bg-slate-50 rounded-2xl"><Car size={32} className="opacity-30" /></div>
                                    <div>
                                      <span className="text-sm font-semibold text-slate-500 block">No accidents recorded</span>
                                      <span className="text-xs text-slate-400 mt-1 block">Driver accidents records and management will appear here.</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar totalItems={accFiltered.length} currentPage={accPage} rowsPerPage={accRpp} onPageChange={setAccPage} onRowsPerPageChange={setAccRpp} />
                  </div>
              </div>
              );
            })()}

            {/* ACCIDENT DETAIL POPUP */}
            {viewingAccident && (() => {
              const inc = viewingAccident;
              const fmtDT = (d: string) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
              const fmtCur = (v: number) => v != null ? `$${v.toLocaleString()}` : '—';
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingAccident(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-medium">Driver Profile / Accidents</p>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-lg font-bold text-slate-900">Crash Report</h2>
                          <code className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{inc.incidentId}</code>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Details of the event, vehicle, and driver information.</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setViewingAccident(null); setEditingAccident(inc); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => setViewingAccident(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Location Map Placeholder */}
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 h-[80px] flex items-center justify-center">
                        <div className="text-center text-slate-400 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <p className="text-xs font-medium">{inc.location?.full}</p>
                        </div>
                      </div>
                      {/* Event Details */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Event Details</h4>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Timestamp</p><p className="text-sm font-medium text-slate-900">{fmtDT(inc.occurredAt)}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Accident Type</p><p className="text-sm font-medium text-slate-900">{inc.cause?.incidentType || '—'}</p></div>
                          <div className="col-span-2"><p className="text-[11px] text-slate-400 mb-0.5">Address</p><p className="text-sm font-medium text-slate-900">{inc.location?.full || '—'}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Primary Cause</p><p className="text-sm font-medium text-slate-900">{inc.cause?.primaryCause || '—'}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Location Type</p><p className="text-sm font-medium text-slate-900">{inc.location?.locationType || '—'}</p></div>
                          <div>
                            <p className="text-[11px] text-slate-400 mb-1">Preventability</p>
                            <Badge variant={inc.preventability?.value === 'preventable' ? 'danger' : inc.preventability?.value === 'non_preventable' ? 'success' : 'pending'}>
                              {inc.preventability?.value === 'preventable' ? 'Preventable' : inc.preventability?.value === 'non_preventable' ? 'Non-Preventable' : 'TBD'}
                            </Badge>
                          </div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">FMCSA Reportable</p><p className="text-sm font-medium text-slate-900">{inc.classification?.fmcsaReportable ? 'Yes' : 'No'}</p></div>
                        </div>
                      </div>
                      {/* Vehicles + Driver side by side */}
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Vehicles</h4>
                          {(inc.vehicles || []).map((veh: any, vi: number) => (
                            <div key={vi} className="space-y-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{inc.vehicles.length > 1 ? `Vehicle ${vi + 1}` : 'Vehicle'}</span>
                                {veh.assetId && <code className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{veh.assetId}</code>}
                              </div>
                              <div className="space-y-1.5">
                                <div><p className="text-[11px] text-slate-400">Make / Model</p><p className="text-sm font-medium text-slate-800">{veh.make} {veh.model} ({veh.year})</p></div>
                                <div><p className="text-[11px] text-slate-400">Type</p><p className="text-sm font-medium text-slate-800">{veh.vehicleType}</p></div>
                                <div><p className="text-[11px] text-slate-400">VIN</p><p className="text-xs font-mono text-slate-600">{veh.vin}</p></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Driver at Time of Incident</h4>
                          <div className="space-y-1.5">
                            <div><p className="text-[11px] text-slate-400">Name</p><p className="text-sm font-medium text-slate-800">{inc.driver?.name}</p></div>
                            <div><p className="text-[11px] text-slate-400">Type</p><p className="text-sm font-medium text-slate-800">{inc.driver?.driverType}</p></div>
                            <div><p className="text-[11px] text-slate-400">Experience</p><p className="text-sm font-medium text-slate-800">{inc.driver?.drivingExperience}</p></div>
                            <div><p className="text-[11px] text-slate-400">Hrs Driving / On Duty</p><p className="text-sm font-medium text-slate-800">{inc.driver?.hrsDriving}h / {inc.driver?.hrsOnDuty}h</p></div>
                          </div>
                        </div>
                      </div>
                      {/* Severity & Costs */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Severity & Costs</h4>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {[
                            { label: 'Fatalities', value: inc.severity?.fatalities, bad: inc.severity?.fatalities > 0 },
                            { label: 'Injuries', value: inc.severity?.injuriesNonFatal, bad: inc.severity?.injuriesNonFatal > 0 },
                            { label: 'Tow Away', value: inc.severity?.towAway ? 'Yes' : 'No', bad: inc.severity?.towAway },
                            { label: 'HAZMAT', value: inc.severity?.hazmatReleased ? 'Yes' : 'No', bad: inc.severity?.hazmatReleased },
                          ].map((s, i) => (
                            <div key={i} className={cn('rounded-lg border p-2.5 text-center', s.bad ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                              <p className="text-base font-bold">{s.value}</p>
                              <p className="text-[10px] font-medium">{s.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                          <div><p className="text-[11px] text-slate-400">Company Costs</p><p className="text-sm font-semibold text-slate-900">{fmtCur(inc.costs?.companyCostsFromDollarOne)}</p></div>
                          <div><p className="text-[11px] text-slate-400">Insurance Paid</p><p className="text-sm font-semibold text-slate-900">{fmtCur(inc.costs?.insuranceCostsPaid)}</p></div>
                          <div><p className="text-[11px] text-slate-400">Insurance Reserves</p><p className="text-sm font-semibold text-slate-900">{fmtCur(inc.costs?.insuranceReserves)}</p></div>
                          <div><p className="text-[11px] text-slate-400">Total Costs</p><p className="text-sm font-bold text-blue-700">{fmtCur(inc.costs?.totalAccidentCosts)}</p></div>
                        </div>
                      </div>
                      {/* Road & Conditions */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Road & Conditions</h4>
                        <div className="grid grid-cols-3 gap-x-5 gap-y-2">
                          <div><p className="text-[11px] text-slate-400">Road Type</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.roadType}</p></div>
                          <div><p className="text-[11px] text-slate-400">Weather</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.weatherConditions}</p></div>
                          <div><p className="text-[11px] text-slate-400">Road Surface</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.roadConditions}</p></div>
                          <div><p className="text-[11px] text-slate-400">Speed Limit</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.postedSpeedLimitKmh} km/h</p></div>
                          <div><p className="text-[11px] text-slate-400">Terrain</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.terrain}</p></div>
                          <div><p className="text-[11px] text-slate-400">Light</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.light}</p></div>
                        </div>
                      </div>
                      {/* Follow Up */}
                      {(inc.followUp?.action || inc.followUp?.comments) && (
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Follow Up</h4>
                          <div className="space-y-2">
                            {inc.followUp?.action && <div><p className="text-[11px] text-slate-400">Action</p><p className="text-sm font-medium text-slate-800">{inc.followUp.action}</p></div>}
                            {inc.followUp?.comments && <div><p className="text-[11px] text-slate-400">Comments</p><p className="text-sm font-medium text-slate-800">{inc.followUp.comments}</p></div>}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setViewingAccident(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                      <button onClick={() => { setViewingAccident(null); setEditingAccident(inc); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Edit Accident</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ACCIDENT EDIT POPUP */}
            {editingAccident && (() => {
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingAccident(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Edit Accident</h2>
                          <p className="text-[11px] text-slate-400 font-medium">{editingAccident.incidentId}</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingAccident(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                    {/* Scrollable form body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Event Details Section */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Event Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date & Time of Loss</label>
                            <input type="datetime-local" defaultValue={editingAccident.occurredAt?.slice(0, 16)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Accident Type</label>
                            <select defaultValue={editingAccident.cause?.incidentType} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all">
                              {['Rear-end collision', 'Intersection collision', 'Single vehicle runoff', 'Sideswipe - same direction', 'Sideswipe - opposite direction', 'Backing into structure', 'Load shift / spill', 'Tire blowout / rollover', 'Tire blowout', 'Head-on Collision', 'Pedestrian', 'Animal Strike', 'Equipment Fire'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Primary Cause</label>
                            <select defaultValue={editingAccident.cause?.primaryCause} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all">
                              {['Unsafe Behaviour', 'Mechanical Failure', 'Third Party', 'Weather', 'Fatigue', 'Load Securement', 'Road Conditions', 'Unknown'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Insurance Claim #</label>
                            <input type="text" defaultValue={editingAccident.insuranceClaimNumber} placeholder="e.g. CLM-9943201" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                        </div>
                      </div>
                      {/* Location Section */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Location</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Street Address</label>
                            <input type="text" defaultValue={editingAccident.location?.streetAddress} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
                            <input type="text" defaultValue={editingAccident.location?.city} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">State / Province</label>
                            <input type="text" defaultValue={editingAccident.location?.stateOrProvince} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Country</label>
                            <input type="text" defaultValue={editingAccident.location?.country} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Zip / Postal</label>
                            <input type="text" defaultValue={editingAccident.location?.zip} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                        </div>
                      </div>
                      {/* Severity */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Severity</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Fatalities</label>
                            <input type="number" min="0" defaultValue={editingAccident.severity?.fatalities} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Injuries (Non-Fatal)</label>
                            <input type="number" min="0" defaultValue={editingAccident.severity?.injuriesNonFatal} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Vehicles Towed</label>
                            <input type="number" min="0" defaultValue={editingAccident.severity?.vehiclesTowed} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Preventability</label>
                            <select defaultValue={editingAccident.preventability?.value} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all">
                              <option value="tbd">TBD</option>
                              <option value="preventable">Preventable</option>
                              <option value="non_preventable">Non-Preventable</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      {/* Costs */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Costs</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Company Costs ($)</label>
                            <input type="number" min="0" defaultValue={editingAccident.costs?.companyCostsFromDollarOne} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Insurance Paid ($)</label>
                            <input type="number" min="0" defaultValue={editingAccident.costs?.insuranceCostsPaid} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Insurance Reserves ($)</label>
                            <input type="number" min="0" defaultValue={editingAccident.costs?.insuranceReserves} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Total Cost ($)</label>
                            <input type="number" min="0" defaultValue={editingAccident.costs?.totalAccidentCosts} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 text-slate-500 transition-all" disabled />
                          </div>
                        </div>
                      </div>
                      {/* Follow Up */}
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Follow Up</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Action Taken</label>
                            <textarea defaultValue={editingAccident.followUp?.action} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Comments</label>
                            <textarea defaultValue={editingAccident.followUp?.comments} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setEditingAccident(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                      <button onClick={() => setEditingAccident(null)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Save Changes</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* INSPECTIONS TAB */}

            {activeTab === 'Inspections' && (() => {

              const driverInspections = inspectionsData.filter((ins: any) => ins.driverId === driverData.id);

              const totalViolations = driverInspections.reduce((sum: number, ins: any) => sum + (ins.violations?.length || 0), 0);

              const oosCount = driverInspections.filter((ins: any) => ins.hasOOS).length;

              const cleanCount = driverInspections.filter((ins: any) => ins.isClean).length;

              const insColVis = (id: string) => insCols.find(c => c.id === id)?.visible;

              const insFiltered = driverInspections.filter((ins: any) => {

                if (!insQ) return true;

                const s = insQ.toLowerCase();

                return ins.id?.toLowerCase().includes(s) || ins.vehiclePlate?.toLowerCase().includes(s) || ins.state?.toLowerCase().includes(s);

              });

              const insPaged = insFiltered.slice((insPage - 1) * insRpp, insPage * insRpp);



              return (

              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* KPI Cards */}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><FileCheck className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Inspections</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{driverInspections.length}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Violations</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{totalViolations}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-500 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0"><AlertOctagon className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Out of<br />Service</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{oosCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-emerald-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Clean<br />Inspections</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{cleanCount}</div>

                    </div>

                  </div>



                  {/* Table Card */}

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                    <DataListToolbar searchValue={insQ} onSearchChange={setInsQ} searchPlaceholder="Search inspections..." columns={insCols} onToggleColumn={(id) => setInsCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={insFiltered.length} currentPage={insPage} rowsPerPage={insRpp} onPageChange={setInsPage} onRowsPerPageChange={setInsRpp} />

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="bg-slate-50/80 border-b border-slate-200">

                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">

                            {insColVis('date') && <th className="px-5 py-3">Date</th>}

                            {insColVis('report') && <th className="px-5 py-3">Report #</th>}

                            {insColVis('level') && <th className="px-5 py-3">Level</th>}

                            {insColVis('state') && <th className="px-5 py-3">State</th>}

                            {insColVis('vehicle') && <th className="px-5 py-3">Vehicle</th>}

                            {insColVis('violations') && <th className="px-5 py-3 text-center">Violations</th>}

                            {insColVis('oos') && <th className="px-5 py-3 text-center">OOS</th>}

                            {insColVis('result') && <th className="px-5 py-3 text-center">Result</th>}
                            <th className="px-5 py-3 text-center w-[80px]">Actions</th>
                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {insPaged.length > 0 ? insPaged.map((ins: any) => (
                            <React.Fragment key={ins.id}>
                            <tr className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setExpandedInspection(expandedInspection === ins.id ? null : ins.id)}>

                              {insColVis('date') && (<td className="px-5 py-3.5"><div className="font-semibold text-slate-900">{new Date(ins.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>)}

                              {insColVis('report') && (<td className="px-5 py-3.5"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{ins.id}</code></td>)}

                              {insColVis('level') && (<td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{ins.level}</span></td>)}

                              {insColVis('state') && (<td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{ins.state}</span></td>)}

                              {insColVis('vehicle') && (<td className="px-5 py-3.5"><div className="font-medium text-slate-800">{ins.vehiclePlate}</div><div className="text-xs text-slate-400">{ins.vehicleType}</div></td>)}

                              {insColVis('violations') && (<td className="px-5 py-3.5 text-center"><span className={cn('text-sm font-bold', ins.violations?.length > 0 ? 'text-red-600' : 'text-slate-400')}>{ins.violations?.length || 0}</span></td>)}

                              {insColVis('oos') && (<td className="px-5 py-3.5 text-center">{ins.hasOOS ? (<span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-100">YES</span>) : (<span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-[10px] font-bold border border-slate-100">NO</span>)}</td>)}

                              {insColVis('result') && (<td className="px-5 py-3.5 text-center">{ins.isClean ? (<span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">CLEAN</span>) : (<span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">VIOLATIONS</span>)}</td>)}
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); setViewingInspection(ins); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100" title="View Details"><Eye className="w-4 h-4" /></button>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedInspection === ins.id ? 'rotate-180' : ''}`} />
                                </div>
                              </td>
                            </tr>
                            {expandedInspection === ins.id && (
                              <tr>
                                <td colSpan={9} className="px-0 py-0 bg-slate-50/70">
                                  <div className="px-6 py-4 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Violations ({ins.violations?.length || 0})</h4>
                                      <div className="flex items-center gap-2">
                                        {ins.hasOOS && <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">OOS</span>}
                                        <span className="text-[10px] text-slate-400 font-medium">{ins.level} | {ins.state}</span>
                                      </div>
                                    </div>
                                    {ins.violations?.length > 0 ? (
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-white/80 border-b border-slate-200">
                                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                            <th className="px-4 py-2">Code</th>
                                            <th className="px-4 py-2">Description</th>
                                            <th className="px-4 py-2">Category</th>
                                            <th className="px-4 py-2 text-center">Severity</th>
                                            <th className="px-4 py-2 text-center">Points</th>
                                            <th className="px-4 py-2 text-center">OOS</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {ins.violations.map((viol: any, vi: number) => (
                                            <tr key={vi} className="bg-white hover:bg-blue-50/30 transition-colors">
                                              <td className="px-4 py-2"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">{viol.code}</code></td>
                                              <td className="px-4 py-2 max-w-[250px]"><div className="text-sm font-medium text-slate-800 truncate">{viol.description}</div></td>
                                              <td className="px-4 py-2"><span className="text-xs text-slate-500">{viol.category}</span></td>
                                              <td className="px-4 py-2 text-center"><span className="text-sm font-bold text-slate-700">{viol.severity}</span></td>
                                              <td className="px-4 py-2 text-center"><span className="text-sm font-bold text-slate-700">{viol.points}</span></td>
                                              <td className="px-4 py-2 text-center">{viol.oos ? <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">YES</span> : <span className="text-[10px] text-slate-400">NO</span>}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="text-center py-4 text-sm text-emerald-600 font-medium bg-white rounded-lg border border-slate-200">Clean Inspection - No violations found</div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          )) : (

                            <tr>

                              <td colSpan={9} className="px-6 py-16 text-center text-slate-400">

                                <div className="flex flex-col items-center justify-center gap-3">

                                  <div className="p-4 bg-slate-50 rounded-2xl"><FileCheck size={32} className="opacity-30" /></div>

                                  <div>

                                    <span className="text-sm font-semibold text-slate-500 block">No inspections recorded</span>

                                    <span className="text-xs text-slate-400 mt-1 block">Driver inspection records will appear here.</span>

                                  </div>

                                </div>

                              </td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                    <PaginationBar totalItems={insFiltered.length} currentPage={insPage} rowsPerPage={insRpp} onPageChange={setInsPage} onRowsPerPageChange={setInsRpp} />

                  </div>

              </div>

              );

            })()}



            {/* VIOLATIONS TAB */}

            {activeTab === 'Violations' && (() => {

              const driverViolations = MOCK_VIOLATION_RECORDS.filter((v: any) => v.driverId === driverData.id);

              const oosCount = driverViolations.filter((v: any) => v.isOos).length;

              const openCount = driverViolations.filter((v: any) => v.status === 'Open').length;

              const totalFines = driverViolations.reduce((sum: number, v: any) => sum + (v.fineAmount || 0), 0);

              const violColVis = (id: string) => violCols.find(c => c.id === id)?.visible;

              const violFiltered = driverViolations.filter((v: any) => {

                if (!violQ) return true;

                const s = violQ.toLowerCase();

                return v.violationCode?.toLowerCase().includes(s) || v.violationType?.toLowerCase().includes(s) || v.locationState?.toLowerCase().includes(s);

              });

              const violPaged = violFiltered.slice((violPage - 1) * violRpp, violPage * violRpp);



              return (

              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* KPI Cards */}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Violations</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{driverViolations.length}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertOctagon className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">OOS<br />Orders</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{oosCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-500 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Open<br />Cases</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{openCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-emerald-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><DollarSign className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Fines</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">${totalFines.toLocaleString()}</div>

                    </div>

                  </div>



                  {/* Table Card */}

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                    <DataListToolbar searchValue={violQ} onSearchChange={setViolQ} searchPlaceholder="Search violations..." columns={violCols} onToggleColumn={(id) => setViolCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={violFiltered.length} currentPage={violPage} rowsPerPage={violRpp} onPageChange={setViolPage} onRowsPerPageChange={setViolRpp} />

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="bg-slate-50/80 border-b border-slate-200">

                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">

                            {violColVis('date') && <th className="px-5 py-3">Date</th>}

                            {violColVis('code') && <th className="px-5 py-3">Code</th>}

                            {violColVis('description') && <th className="px-5 py-3">Description</th>}

                            {violColVis('state') && <th className="px-5 py-3">State</th>}

                            {violColVis('asset') && <th className="px-5 py-3">Asset</th>}

                            {violColVis('result') && <th className="px-5 py-3 text-center">Result</th>}

                            {violColVis('oos') && <th className="px-5 py-3 text-center">OOS</th>}

                            {violColVis('status') && <th className="px-5 py-3 text-center">Status</th>}

                            {violColVis('fine') && <th className="px-5 py-3 text-right">Fine</th>}
                            <th className="px-5 py-3 text-center w-[80px]">Actions</th>
                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {violPaged.length > 0 ? violPaged.map((v: any) => (

                            <tr key={v.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setViewingViolation(v)}>

                              {violColVis('date') && (<td className="px-5 py-3.5"><div className="font-semibold text-slate-900">{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div><div className="text-[11px] text-slate-400 mt-0.5">{v.time}</div></td>)}

                              {violColVis('code') && (<td className="px-5 py-3.5"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{v.violationCode}</code></td>)}

                              {violColVis('description') && (<td className="px-5 py-3.5 max-w-[200px]"><div className="font-medium text-slate-800 text-sm truncate">{v.violationType}</div><div className="text-[11px] text-slate-400 truncate">{v.violationGroup}</div></td>)}

                              {violColVis('state') && (<td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{v.locationState}</span></td>)}

                              {violColVis('asset') && (<td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{v.assetName || 'â€”'}</span></td>)}

                              {violColVis('result') && (<td className="px-5 py-3.5 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${v.result === 'OOS Order' ? 'bg-red-50 text-red-700 border-red-100' : v.result === 'Citation Issued' ? 'bg-amber-50 text-amber-700 border-amber-100' : v.result === 'Warning' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{v.result}</span></td>)}

                              {violColVis('oos') && (<td className="px-5 py-3.5 text-center">{v.isOos ? (<span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-100">YES</span>) : (<span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-[10px] font-bold border border-slate-100">NO</span>)}</td>)}

                              {violColVis('status') && (<td className="px-5 py-3.5 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${v.status === 'Open' ? 'bg-amber-50 text-amber-700 border-amber-100' : v.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{v.status}</span></td>)}

                              {violColVis('fine') && (<td className="px-5 py-3.5 text-right"><span className="font-bold text-slate-900">{v.fineAmount > 0 ? `$${v.fineAmount.toLocaleString()}` : 'â€”'}</span></td>)}
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); setViewingViolation(v); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingViolation(v); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>

                          )) : (

                            <tr>

                              <td colSpan={10} className="px-6 py-16 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-3">
                                  <div className="p-4 bg-slate-50 rounded-2xl"><AlertTriangle size={32} className="opacity-30" /></div>

                                  <div>

                                    <span className="text-sm font-semibold text-slate-500 block">No violations recorded</span>

                                    <span className="text-xs text-slate-400 mt-1 block">Driver violation records will appear here.</span>

                                  </div>

                                </div>

                              </td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                    <PaginationBar totalItems={violFiltered.length} currentPage={violPage} rowsPerPage={violRpp} onPageChange={setViolPage} onRowsPerPageChange={setViolRpp} />

                  </div>

              </div>

              );

            })()}

            {/* VIOLATION VIEW POPUP */}
            {viewingViolation && (() => {
              const v = viewingViolation;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingViolation(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-medium">Driver Profile / Violations</p>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-lg font-bold text-slate-900">Violation Detail</h2>
                          <code className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{v.id}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setViewingViolation(null); setEditingViolation(v); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"><Edit className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => setViewingViolation(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Violation Information</h4>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Date</p><p className="text-sm font-medium text-slate-900">{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Time</p><p className="text-sm font-medium text-slate-900">{v.time || '—'}</p></div>
                          <div className="col-span-2"><p className="text-[11px] text-slate-400 mb-0.5">Description</p><p className="text-sm font-medium text-slate-900">{v.violationType}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Code</p><code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{v.violationCode}</code></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Group</p><p className="text-sm font-medium text-slate-900">{v.violationGroup}</p></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Location</h4>
                          <div className="space-y-2">
                            <div><p className="text-[11px] text-slate-400">State</p><p className="text-sm font-medium text-slate-800">{v.locationState}</p></div>
                            <div><p className="text-[11px] text-slate-400">City</p><p className="text-sm font-medium text-slate-800">{v.locationCity || '—'}</p></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Asset</h4>
                          <div className="space-y-2">
                            <div><p className="text-[11px] text-slate-400">Unit</p><p className="text-sm font-medium text-slate-800">{v.assetName || '—'}</p></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Result & Status</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"><p className="text-sm font-bold text-slate-700">{v.result}</p><p className="text-[10px] font-medium text-slate-400">Result</p></div>
                          <div className={`rounded-lg border p-2.5 text-center ${v.isOos ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><p className="text-sm font-bold">{v.isOos ? 'YES' : 'NO'}</p><p className="text-[10px] font-medium">OOS</p></div>
                          <div className={`rounded-lg border p-2.5 text-center ${v.status === 'Open' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><p className="text-sm font-bold">{v.status}</p><p className="text-[10px] font-medium">Status</p></div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"><p className="text-sm font-bold text-slate-700">{v.fineAmount > 0 ? `$${v.fineAmount.toLocaleString()}` : '—'}</p><p className="text-[10px] font-medium text-slate-400">Fine</p></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Risk Assessment</h4>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                          <div><p className="text-[11px] text-slate-400">Crash Likelihood</p><p className="text-sm font-semibold text-slate-900">{v.crashLikelihood}%</p></div>
                          <div><p className="text-[11px] text-slate-400">Risk Category</p><p className="text-sm font-semibold text-slate-900">{v.driverRiskCategory === 1 ? 'High' : v.driverRiskCategory === 2 ? 'Moderate' : 'Lower'}</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setViewingViolation(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                      <button onClick={() => { setViewingViolation(null); setEditingViolation(v); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Edit Violation</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VIOLATION EDIT POPUP */}
            {editingViolation && (() => {
              const v = editingViolation;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingViolation(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Edit className="w-4 h-4 text-blue-600" /></div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Edit Violation</h2>
                          <p className="text-[11px] text-slate-400 font-medium">{v.id}</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingViolation(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Violation Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label><input type="date" defaultValue={v.date} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Time</label><input type="time" defaultValue={v.time} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label><input type="text" defaultValue={v.violationType} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Violation Code</label><input type="text" defaultValue={v.violationCode} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">State</label><input type="text" defaultValue={v.locationState} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Result & Fine</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Result</label><select defaultValue={v.result} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"><option value="Citation Issued">Citation Issued</option><option value="Warning">Warning</option><option value="OOS Order">OOS Order</option><option value="Clean Inspection">Clean Inspection</option></select></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label><select defaultValue={v.status} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"><option value="Open">Open</option><option value="Closed">Closed</option><option value="Under Review">Under Review</option></select></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Fine Amount ($)</label><input type="number" min="0" defaultValue={v.fineAmount} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked={v.isOos} className="rounded border-slate-300" /><span className="text-sm font-medium text-slate-700">Out of Service</span></label></div>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setEditingViolation(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                      <button onClick={() => setEditingViolation(null)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Save Changes</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* INSPECTION VIEW POPUP */}
            {viewingInspection && (() => {
              const ins = viewingInspection;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingInspection(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-medium">Driver Profile / Inspections</p>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-lg font-bold text-slate-900">Inspection Report</h2>
                          <code className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{ins.id}</code>
                        </div>
                      </div>
                      <button onClick={() => setViewingInspection(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Inspection Details</h4>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Date</p><p className="text-sm font-medium text-slate-900">{new Date(ins.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Level</p><p className="text-sm font-medium text-slate-900">{ins.level}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">State</p><p className="text-sm font-medium text-slate-900">{ins.state}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Vehicle</p><p className="text-sm font-medium text-slate-900">{ins.vehiclePlate} ({ins.vehicleType})</p></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">OOS Summary</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className={`rounded-lg border p-2.5 text-center ${ins.oosSummary?.driver === 'FAILED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><p className="text-sm font-bold">{ins.oosSummary?.driver || 'PASSED'}</p><p className="text-[10px] font-medium">Driver</p></div>
                          <div className={`rounded-lg border p-2.5 text-center ${ins.oosSummary?.vehicle === 'FAILED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><p className="text-sm font-bold">{ins.oosSummary?.vehicle || 'PASSED'}</p><p className="text-[10px] font-medium">Vehicle</p></div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"><p className="text-sm font-bold text-slate-700">{ins.oosSummary?.total || 0}</p><p className="text-[10px] font-medium text-slate-400">Total OOS</p></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Violations ({ins.violations?.length || 0})</h4>
                        {ins.violations?.length > 0 ? (
                          <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                  <th className="px-4 py-2.5">Code</th>
                                  <th className="px-4 py-2.5">Description</th>
                                  <th className="px-4 py-2.5">Category</th>
                                  <th className="px-4 py-2.5 text-center">Sev</th>
                                  <th className="px-4 py-2.5 text-center">Pts</th>
                                  <th className="px-4 py-2.5 text-center">OOS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {ins.violations.map((viol: any, vi: number) => (
                                  <tr key={vi} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-2.5"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">{viol.code}</code></td>
                                    <td className="px-4 py-2.5 max-w-[220px]"><div className="text-sm text-slate-800 truncate">{viol.description}</div><div className="text-[10px] text-slate-400">{viol.subDescription || ''}</div></td>
                                    <td className="px-4 py-2.5"><span className="text-xs text-slate-500">{viol.category}</span></td>
                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700">{viol.severity}</span></td>
                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700">{viol.points}</span></td>
                                    <td className="px-4 py-2.5 text-center">{viol.oos ? <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">YES</span> : <span className="text-[10px] text-slate-400">NO</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-emerald-600 font-medium bg-emerald-50/50 rounded-lg border border-emerald-100">Clean Inspection - No violations recorded</div>
                        )}
                      </div>
                      {ins.units?.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Units Inspected</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {ins.units.map((unit: any, ui: number) => (
                              <div key={ui} className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-1">
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-500 uppercase">{unit.type}</span><code className="text-[10px] font-mono bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{unit.license}</code></div>
                                <div><p className="text-[11px] text-slate-400">Make</p><p className="text-sm font-medium text-slate-800">{unit.make}</p></div>
                                <div><p className="text-[11px] text-slate-400">VIN</p><p className="text-[10px] font-mono text-slate-500">{unit.vin}</p></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setViewingInspection(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tickets Tab */}
            {activeTab === 'Tickets' && (() => {
              const driverTickets = MOCK_TICKETS.filter(t => t.driverId === driverData.id);
              const q = tickQ.toLowerCase();
              const filtered = driverTickets.filter(t =>
                t.offenseNumber.toLowerCase().includes(q) ||
                t.violationType.toLowerCase().includes(q) ||
                t.location.toLowerCase().includes(q) ||
                t.assetId.toLowerCase().includes(q) ||
                t.status.toLowerCase().includes(q)
              );

              const paged = filtered.slice((tickPage - 1) * tickRpp, tickPage * tickRpp);

              const outstandingFines = driverTickets.filter(t => t.status === 'Due').reduce((s, t) => s + t.fineAmount, 0);
              const openOffenses = driverTickets.filter(t => t.status === 'Due').length;
              const inCourt = driverTickets.filter(t => t.status === 'In Court').length;
              const paidCount = driverTickets.filter(t => t.status === 'Paid').length;

              const getStatusBadge = (status: string) => {
                const styles: Record<string, string> = { 'Due': 'bg-yellow-100 text-yellow-800', 'In Court': 'bg-blue-100 text-blue-800', 'Paid': 'bg-green-100 text-green-800', 'Closed': 'bg-slate-100 text-slate-800' };
                return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
              };
              const getTypeBadge = (type: string) => {
                const styles: Record<string, string> = { 'Speeding': 'bg-red-50 text-red-700 border-red-100', 'Overweight': 'bg-orange-50 text-orange-700 border-orange-100', 'Logbook violation': 'bg-purple-50 text-purple-700 border-purple-100', 'Equipment defect': 'bg-slate-100 text-slate-700 border-slate-200', 'Insurance lapse': 'bg-pink-50 text-pink-700 border-pink-100', 'Red Light': 'bg-red-50 text-red-700 border-red-100', 'Parking': 'bg-slate-100 text-slate-700 border-slate-200' };
                return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{type}</span>;
              };

              return (
                <div className="space-y-4 animate-in fade-in">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center text-red-600"><DollarSign className="w-5 h-5" /></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Fines</p><p className="text-xl font-bold text-slate-900">${outstandingFines.toLocaleString()}</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Offenses</p><p className="text-xl font-bold text-slate-900">{openOffenses}</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><FileText className="w-5 h-5" /></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Court</p><p className="text-xl font-bold text-slate-900">{inCourt}</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><ShieldCheck className="w-5 h-5" /></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid</p><p className="text-xl font-bold text-slate-900">{paidCount}</p></div>
                    </div>
                  </div>

                  {/* Table Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <DataListToolbar searchValue={tickQ} onSearchChange={setTickQ} searchPlaceholder="Search tickets..." columns={tickCols} onToggleColumn={(id) => setTickCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={filtered.length} currentPage={tickPage} rowsPerPage={tickRpp} onPageChange={setTickPage} onRowsPerPageChange={setTickRpp} />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-slate-50 border-y border-slate-200">
                          {tickCols.find(c=>c.id==='date')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>}
                          {tickCols.find(c=>c.id==='offense')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Offense #</th>}
                          {tickCols.find(c=>c.id==='type')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>}
                          {tickCols.find(c=>c.id==='location')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location</th>}
                          {tickCols.find(c=>c.id==='asset')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Asset</th>}
                          {tickCols.find(c=>c.id==='fine')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fine</th>}
                          {tickCols.find(c=>c.id==='status')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>}
                          {tickCols.find(c=>c.id==='docs')?.visible && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Docs</th>}
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {paged.length > 0 ? paged.map(tk => (
                            <tr key={tk.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setViewingTicket(tk)}>
                              {tickCols.find(c=>c.id==='date')?.visible && <td className="px-4 py-3"><div className="text-sm font-medium text-slate-900">{tk.date}</div><div className="text-[11px] text-slate-400">{tk.time}</div></td>}
                              {tickCols.find(c=>c.id==='offense')?.visible && <td className="px-4 py-3 text-sm font-semibold text-blue-600">{tk.offenseNumber}</td>}
                              {tickCols.find(c=>c.id==='type')?.visible && <td className="px-4 py-3">{getTypeBadge(tk.violationType)}</td>}
                              {tickCols.find(c=>c.id==='location')?.visible && <td className="px-4 py-3"><div className="text-sm text-slate-900">{tk.location}</div><div className="text-[11px] text-slate-400 truncate max-w-[180px]">{tk.description}</div></td>}
                              {tickCols.find(c=>c.id==='asset')?.visible && <td className="px-4 py-3 text-sm font-medium text-slate-700">{tk.assetId}</td>}
                              {tickCols.find(c=>c.id==='fine')?.visible && <td className="px-4 py-3 text-sm font-bold text-slate-900">{tk.currency === 'CAD' ? 'CA$' : '$'}{tk.fineAmount.toFixed(2)}</td>}
                              {tickCols.find(c=>c.id==='status')?.visible && <td className="px-4 py-3">{getStatusBadge(tk.status)}</td>}
                              {tickCols.find(c=>c.id==='docs')?.visible && <td className="px-4 py-3"><div className="flex items-center gap-2">
                                <span title="Ticket"><FileText className={`w-3.5 h-3.5 ${tk.hasTicketFile ? 'text-green-600' : 'text-slate-200'}`} /></span>
                                <span title="Receipt"><FileText className={`w-3.5 h-3.5 ${tk.hasReceiptFile ? 'text-green-600' : 'text-slate-200'}`} /></span>
                                <span title="Notice"><FileText className={`w-3.5 h-3.5 ${tk.hasNoticeFile ? 'text-green-600' : 'text-slate-200'}`} /></span>
                              </div></td>}
                              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setViewingTicket(tk)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => setEditingTicket2(tk)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"><Edit className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">No tickets found for this driver.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar totalItems={filtered.length} currentPage={tickPage} rowsPerPage={tickRpp} onPageChange={setTickPage} onRowsPerPageChange={setTickRpp} />
                  </div>
                </div>
              );
            })()}

            {/* Ticket View Popup */}
            {viewingTicket && (() => {
              const tk = viewingTicket;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewingTicket(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Ticket className="w-5 h-5 text-blue-600" /></div>
                        <div><h3 className="text-base font-bold text-slate-900">Ticket Details</h3><p className="text-xs text-slate-500">{tk.offenseNumber}</p></div>
                      </div>
                      <button onClick={() => setViewingTicket(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Offense #</p><p className="text-sm font-semibold text-slate-900 mt-0.5">{tk.offenseNumber}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Date & Time</p><p className="text-sm font-semibold text-slate-900 mt-0.5">{tk.date} at {tk.time}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Violation Type</p><p className="text-sm font-semibold text-slate-900 mt-0.5">{tk.violationType}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Status</p><div className="mt-0.5">{(() => { const styles: Record<string, string> = { 'Due': 'bg-yellow-100 text-yellow-800', 'In Court': 'bg-blue-100 text-blue-800', 'Paid': 'bg-green-100 text-green-800', 'Closed': 'bg-slate-100 text-slate-800' }; return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[tk.status] || 'bg-slate-100 text-slate-700'}`}>{tk.status}</span>; })()}</div></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Fine Amount</p><p className="text-sm font-bold text-slate-900 mt-0.5">{tk.currency === 'CAD' ? 'CA$' : '$'}{tk.fineAmount.toFixed(2)}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Asset</p><p className="text-sm font-semibold text-slate-900 mt-0.5">{tk.assetId}</p></div>
                        <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Location</p><p className="text-sm font-semibold text-slate-900 mt-0.5">{tk.location}</p></div>
                        <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Description</p><p className="text-sm text-slate-700 mt-0.5">{tk.description}</p></div>
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Documents</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5"><FileText className={`w-4 h-4 ${tk.hasTicketFile ? 'text-green-600' : 'text-slate-300'}`} /><span className="text-xs text-slate-600">Ticket</span></div>
                          <div className="flex items-center gap-1.5"><FileText className={`w-4 h-4 ${tk.hasReceiptFile ? 'text-green-600' : 'text-slate-300'}`} /><span className="text-xs text-slate-600">Receipt</span></div>
                          <div className="flex items-center gap-1.5"><FileText className={`w-4 h-4 ${tk.hasNoticeFile ? 'text-green-600' : 'text-slate-300'}`} /><span className="text-xs text-slate-600">Notice</span></div>
                        </div>
                      </div>
                      {tk.assignedToThirdParty && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-medium text-amber-800">Assigned to Third Party</span>
                        </div>
                      )}
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => { setViewingTicket(null); setEditingTicket2(tk); }} className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">Edit</button>
                      <button onClick={() => setViewingTicket(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ticket Edit Popup */}
            {editingTicket2 && (() => {
              const tk = editingTicket2;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingTicket2(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Edit className="w-5 h-5 text-amber-600" /></div>
                        <div><h3 className="text-base font-bold text-slate-900">Edit Ticket</h3><p className="text-xs text-slate-500">{tk.offenseNumber}</p></div>
                      </div>
                      <button onClick={() => setEditingTicket2(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Offense #</label><input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.offenseNumber} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.date} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Violation Type</label>
                          <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.violationType}>
                            <option>Speeding</option><option>Overweight</option><option>Logbook violation</option><option>Equipment defect</option><option>Insurance lapse</option><option>Red Light</option><option>Parking</option>
                          </select>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                          <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.status}>
                            <option>Due</option><option>In Court</option><option>Paid</option><option>Closed</option>
                          </select>
                        </div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fine Amount</label><input type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.fineAmount} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency</label>
                          <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.currency}><option>USD</option><option>CAD</option></select>
                        </div>
                        <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location</label><input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.location} /></div>
                        <div className="col-span-2"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label><textarea className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 resize-none" rows={2} defaultValue={tk.description} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset</label><input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" defaultValue={tk.assetId} /></div>
                        <div className="flex items-center gap-2 self-end pb-2"><input type="checkbox" defaultChecked={tk.assignedToThirdParty} className="rounded border-slate-300" /><label className="text-xs text-slate-600">Assigned to Third Party</label></div>
                      </div>
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setEditingTicket2(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                      <button onClick={() => setEditingTicket2(null)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Save Changes</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {['Training', 'Certificates', 'Trips', 'HoursOfService', 'MileageReport'].includes(activeTab) && (() => {
                const tabConfig = tabs.find(t => t.id === activeTab);
                const TabIcon = tabConfig?.icon || FileText;
                return (
                    <div className="animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                                <TabIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">{tabConfig?.label}</h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto">
                                Driver {tabConfig?.label?.toLowerCase()} records and management will appear here.
                            </p>
                        </div>
                    </div>
                );
            })()}
        </div>
      
        <KeyNumberModal 
            isOpen={isKeyNumberModalOpen}
            onClose={() => setIsKeyNumberModalOpen(false)}
            editData={editingKeyNumber}
            mode={keyNumberModalMode}
            onSave={handleSaveKeyNumber}
            entityType="Driver"
            availableKeyNumbers={keyNumbers.filter(k => k.entityType === 'Driver')}
            tagSections={tagSections}
            getDocumentTypeById={getDocumentTypeById}
        />
        
        {/* Section Edit Modals */}
        <EditPersonalModal isOpen={isPersonalModalOpen} onClose={() => setIsPersonalModalOpen(false)} data={driverData} onSave={handleSavePersonal} />
        <EditAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} data={driverData} onSave={handleSaveAddress} />
        <EditContactsModal isOpen={isContactsModalOpen} onClose={() => setIsContactsModalOpen(false)} contacts={driverData.emergencyContacts || []} onSave={handleSaveContacts} />
        <EditResidencesModal isOpen={isResidencesModalOpen} onClose={() => setIsResidencesModalOpen(false)} residences={driverData.previousResidences || []} onSave={handleSaveResidences} />
        <EditLicensesModal isOpen={isLicensesModalOpen} onClose={() => setIsLicensesModalOpen(false)} licenses={driverData.licenses || []} onSave={handleSaveLicenses} />
        <EditTravelDocumentsModal isOpen={isTravelDocsModalOpen} onClose={() => setIsTravelDocsModalOpen(false)} documents={driverData.travelDocuments || []} onSave={handleSaveTravelDocs} />
        <EditEmploymentModal isOpen={isEmploymentModalOpen} onClose={() => setIsEmploymentModalOpen(false)} history={driverData.employmentHistory || []} onSave={handleSaveEmployment} />
        {/* Document Edit Modal */}
        {editingDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{editingDocument.hasUpload ? 'Edit Document' : 'Upload Document'}</h2>
                            <p className="text-sm text-slate-500">{editingDocument.documentType}</p>
                        </div>
                        <button onClick={() => setEditingDocument(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
                                    <input type="text" defaultValue={editingDocument.documentType} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-slate-50 text-slate-500" disabled />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                                    <input type="date" defaultValue={editingDocument.expiryDate !== 'Not set' && editingDocument.expiryDate !== '—' ? editingDocument.expiryDate : ''} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                                </div>
                        </div>
                        {/* Issuing Country & State */}
                        {(editingDocument.docTypeData?.issueCountryRequired || editingDocument.docTypeData?.issueStateRequired) && (
                            <div className="grid grid-cols-2 gap-4">
                                {editingDocument.docTypeData?.issueCountryRequired && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Issuing Country <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                            value={docIssuingCountry}
                                            onChange={(e) => {
                                                setDocIssuingCountry(e.target.value);
                                                setDocIssuingState('');
                                            }}
                                        >
                                            <option value="">Select country...</option>
                                            <option value="United States">United States</option>
                                            <option value="Canada">Canada</option>
                                        </select>
                                    </div>
                                )}
                                {editingDocument.docTypeData?.issueStateRequired && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Issuing State / Province <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                            value={docIssuingState}
                                            onChange={(e) => setDocIssuingState(e.target.value)}
                                        >
                                            <option value="">Select state / province...</option>
                                            {(docIssuingCountry === 'Canada' ? CA_PROVINCES : US_STATES).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                        <div 
                            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                            onClick={() => document.getElementById('doc-file-input')?.click()}
                        >
                            <input 
                                id="doc-file-input" 
                                type="file" 
                                multiple 
                                className="hidden" 
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC up to 10MB — Select multiple files</p>
                        </div>
                        {/* Uploaded Files List */}
                        {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files to upload ({uploadedFiles.length})</p>
                                {uploadedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                                                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button onClick={() => setEditingDocument(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                        <button onClick={handleSaveDocument} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all hover:translate-y-px">Save Changes</button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deletingDocument && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Document?</h3>
                        <p className="text-sm text-slate-500">
                            Are you sure you want to delete <strong>{deletingDocument.documentType}</strong>? This action cannot be undone.
                        </p>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button 
                            onClick={() => setDeletingDocument(null)} 
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDeleteDocument} 
                            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-all"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* View Document Modal */}
        {viewingDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                        <div><h2 className="text-lg font-bold text-slate-900">View Document</h2><p className="text-sm text-slate-500">{viewingDocument.documentName}</p></div>
                        <button onClick={() => setViewingDocument(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="flex-1 bg-slate-100 p-6 flex items-center justify-center min-h-[500px]">
                        <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md border border-slate-200">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{viewingDocument.documentName}</h3>
                            <p className="text-sm text-slate-500 mb-6">Document Type: {viewingDocument.documentType}</p>
                            <div className="flex justify-center gap-3">
                                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};


