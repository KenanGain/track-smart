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

  // Key Number Modal State
  const [isKeyNumberModalOpen, setIsKeyNumberModalOpen] = useState(false);
  const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
  const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit'>('edit');

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
        { id: 'Safety', label: 'Safety', icon: AlertOctagon },
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

            {/* PLACEHOLDER TABS */}
            {['Training', 'Certificates', 'Trips', 'Tickets', 'Accidents', 'Safety', 'HoursOfService', 'MileageReport'].includes(activeTab) && (() => {
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
            {activeTab === 'Violations' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Driver Violations</h3>
                      <p className="text-xs font-medium text-slate-500">Track and manage violations associated with this driver.</p>
                    </div>
                  </div>

                  <Card className="overflow-hidden border-slate-200 shadow-sm" icon={AlertTriangle} title="Driver Violations">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-xs font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Violation Type</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Fine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {MOCK_VIOLATION_RECORDS.filter((v: any) => v.driverId === driverData.id || v.driverName === `${driverData.firstName} ${driverData.lastName}`).length > 0 ? MOCK_VIOLATION_RECORDS.filter((v: any) => v.driverId === driverData.id || v.driverName === `${driverData.firstName} ${driverData.lastName}`).map((violation: any) => (
                               <tr key={violation.id} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-slate-900">
                                   {new Date(violation.date).toLocaleDateString()}
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="font-medium text-slate-900 line-clamp-2">{violation.violationType}</div>
                                     <div className="text-xs text-slate-500 mt-1">{violation.violationGroup}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">{violation.violationCode}</code>
                                 </td>
                                 <td className="px-6 py-4 text-center flex items-center justify-center">
                                      <Badge variant={violation.status === 'Closed' ? 'success' : violation.status === 'Open' ? 'warning' : 'neutral'}>
                                          {violation.status}
                                      </Badge>
                                      {violation.isOos && <Badge variant="danger" className="ml-2 w-auto">OOS</Badge>}
                                 </td>
                                 <td className="px-6 py-4 text-right font-bold text-slate-900">
                                     {violation.fineAmount > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: violation.currency || 'USD' }).format(violation.fineAmount) : '—'}
                                 </td>
                               </tr>
                          )) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-slate-50 rounded-full"><AlertTriangle size={24} className="opacity-30" /></div>
                                    <span className="text-sm font-medium">No violations recorded for this driver</span>
                                  </div>
                                </td>
                              </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
              </div>
            )}
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
