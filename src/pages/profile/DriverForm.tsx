import React, { useState } from 'react';
import { 
  User, Phone, MapPin, Briefcase, 
  AlertTriangle, Save, UploadCloud, Camera, Trash2, History, Edit, Mail
} from 'lucide-react';
import { InputGroup, Toggle, AddressFormFields } from './DriverComponents';
import { EditContactsModal, EditEmploymentModal, EditResidencesModal } from './DriverProfileView';

// --- Form Initial State ---
const initialFormState = {
  general: {
    driverType: "Company Driver",
    firstName: "", middleName: "", lastName: "", employeeNumber: "", gender: "Prefer not to say",
    dateOfBirth: "", citizenshipCountryCode: "", terminalOfficeId: "", fastId: "",
    mobileAppAccess: "No", aceId: "", cdrpNumber: "",
    dateHired: "", dateAdded: "", ssn: ""
  },
  address: {
    address: "", unit: "", city: "", state: "", zip: "", country: "USA"
  },
  driverLicense: { 
    number: "", type: "Driver License", issuingCountryCode: "USA", issuingRegion: "", 
    class: "", issueDate: "", expiryDate: "", endorsements: [], restrictions: [],
    uploadType: 'images', frontImage: null, rearImage: null, photo: null, pdfDoc: null
  },
  travelDocuments: [] as any[],
  additionalLicenses: [] as any[],
  notifications: {
    primaryEmail: { email: "", aciOnFile: false, aceOnFile: false, receiveDriversCopy: false, parsUpdates: false, papsUpdates: false },
    secondaryEmail: { email: "", aciOnFile: false, aceOnFile: false, receiveDriversCopy: false, parsUpdates: false, papsUpdates: false }
  },
  phones: { primary: "", secondary: "" },
  emergencyContacts: [] as any[],
  previousResidences: [] as any[],
  employmentHistory: [] as any[],
  documents: []
};

// --- Helper to map Domain Data to Form State ---
const mapDomainToForm = (domainData: any) => {
  if (!domainData) return initialFormState;
  
  // Check if already in form structure (has 'general' key)
  if (domainData.general) return domainData;

  const primaryLicense = domainData.licenses?.find((l: any) => l.isPrimary) || domainData.licenses?.[0] || {};
  const otherLicenses = domainData.licenses?.filter((l: any) => l !== primaryLicense) || [];

  return {
    general: {
      driverType: domainData.driverType || "Company Driver",
      firstName: domainData.firstName || "",
      middleName: domainData.middleName || "",
      lastName: domainData.lastName || "",
      employeeNumber: domainData.employeeNumber || "", 
      gender: domainData.gender || "Prefer not to say",
      dateOfBirth: domainData.dob || "",
      citizenshipCountryCode: domainData.citizenship || "USA",
      ssn: domainData.ssn || "",
      dateHired: domainData.dateHired || "",
      dateAdded: domainData.dateAdded || "",
      fastId: "", 
      terminalOfficeId: "", 
      mobileAppAccess: "No",
      aceId: "",
      cdrpNumber: ""
    },
    address: {
      address: domainData.address || "",
      unit: domainData.unit || "",
      city: domainData.city || "",
      state: domainData.state || "",
      zip: domainData.zip || "",
      country: domainData.country || "USA"
    },
    driverLicense: { 
      number: primaryLicense.licenseNumber || primaryLicense.number || "", 
      type: primaryLicense.type || "Driver License", 
      issuingCountryCode: primaryLicense.country || "USA", 
      issuingRegion: primaryLicense.province || "", 
      class: primaryLicense.class || "", 
      issueDate: primaryLicense.issueDate || "", 
      expiryDate: primaryLicense.expiryDate || "", 
      endorsements: primaryLicense.endorsements || [], 
      restrictions: primaryLicense.restrictions || [],
      uploadType: primaryLicense.uploadType || 'images'
    },
    travelDocuments: domainData.travelDocuments || [],
    additionalLicenses: otherLicenses.map((l: any) => ({
        type: l.type || 'CDL',
        number: l.licenseNumber || '',
        issuingCountryCode: l.country || 'USA',
        issuingRegion: l.province || '',
        class: l.class || '',
        expiryDate: l.expiryDate || '',
        uploadType: l.uploadType || 'images',
        frontImage: l.frontImage, rearImage: l.rearImage, photo: l.photo, pdfDoc: l.pdfDoc
    })),
    notifications: {
      primaryEmail: { 
        email: domainData.email || "", 
        aciOnFile: false, aceOnFile: false, receiveDriversCopy: false, parsUpdates: false, papsUpdates: false 
      },
      secondaryEmail: { email: "", aciOnFile: false, aceOnFile: false, receiveDriversCopy: false, parsUpdates: false, papsUpdates: false }
    },
    phones: { 
      primary: domainData.phone || "", 
      secondary: "" 
    },
    emergencyContacts: domainData.emergencyContacts || [],
    previousResidences: domainData.previousResidences || [],
    employmentHistory: (domainData.employmentHistory || []).map((job: any) => ({
        ...job,
        // Ensure address is an object if it was a string, or default
        address: typeof job.address === 'string' 
            ? { address: job.address, unit: '', city: '', state: '', zip: '', country: 'USA' } 
            : (job.address || { address: '', unit: '', city: '', state: '', zip: '', country: 'USA' })
    })),
    documents: domainData.documents || []
  };
};

// --- Driver Form Component ---


const mapFormToDomain = (formData: any, initialDomainData: any = {}) => {
  const primaryLicense = {
      ...formData.driverLicense,
      licenseNumber: formData.driverLicense.number,
      province: formData.driverLicense.issuingRegion,
      country: formData.driverLicense.issuingCountryCode,
      isPrimary: true
  };

  const additionalLicenses = formData.additionalLicenses.map((l: any) => ({
      type: l.type,
      licenseNumber: l.number,
      province: l.issuingRegion,
      country: l.issuingCountryCode,
      class: l.class,
      expiryDate: l.expiryDate,
      uploadType: l.uploadType,
      isPrimary: false,
      frontImage: l.frontImage, rearImage: l.rearImage, photo: l.photo, pdfDoc: l.pdfDoc
  }));

  const employmentHistory = formData.employmentHistory.map((job: any) => ({
      ...job,
      address: job.address 
  }));

  return {
    ...initialDomainData, 
    driverType: formData.general.driverType,
    firstName: formData.general.firstName,
    middleName: formData.general.middleName,
    lastName: formData.general.lastName,
    dob: formData.general.dateOfBirth,
    gender: formData.general.gender,
    ssn: formData.general.ssn,
    citizenship: formData.general.citizenshipCountryCode,
    dateHired: formData.general.dateHired,
    dateAdded: formData.general.dateAdded,
    phone: formData.phones.primary,
    email: formData.notifications.primaryEmail.email,
    address: formData.address.address,
    unit: formData.address.unit,
    city: formData.address.city,
    state: formData.address.state,
    zip: formData.address.zip,
    country: formData.address.country,
    licenses: [primaryLicense, ...additionalLicenses], 
    travelDocuments: formData.travelDocuments,
    emergencyContacts: formData.emergencyContacts,
    employmentHistory: employmentHistory,
    previousResidences: formData.previousResidences,
  };
};

export const DriverForm = ({ initialData, onSave, onCancel, isEditing = false }: any) => {
  const [formData, setFormData] = useState(() => mapDomainToForm(initialData));

  // Modal States
  const [isContactsModalOpen, setContactsModalOpen] = useState(false);
  const [isEmploymentModalOpen, setEmploymentModalOpen] = useState(false);
  const [isResidencesModalOpen, setResidencesModalOpen] = useState(false);

  // Update form data if initialData changes
  React.useEffect(() => {
    if (initialData) {
        setFormData(mapDomainToForm(initialData));
    }
  }, [initialData]);

  const updateNested = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const updatePhone = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, phones: { ...prev.phones, [field]: value } }));
  };

  const updateEmail = (type: string, field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, notifications: { ...prev.notifications, [type]: { ...prev.notifications[type], [field]: value } } }));
  };

  const handleListChange = (listName: string, index: number, field: string, value: any) => {
    const updatedList = [...formData[listName]];
    updatedList[index][field] = value;
    setFormData((prev: any) => ({ ...prev, [listName]: updatedList }));
  };

  const addListItem = (listName: string, emptyItem: any) => {
    setFormData((prev: any) => ({ ...prev, [listName]: [...prev[listName], emptyItem] }));
  };

  const removeListItem = (listName: string, index: number) => {
    setFormData((prev: any) => ({ ...prev, [listName]: prev[listName].filter((_: any, i: number) => i !== index) }));
  };

  const handleSave = () => {
    const domainData = mapFormToDomain(formData, initialData);
    onSave(domainData);
  };

  return (
    <div className="bg-gray-100 min-h-screen pb-12 font-sans text-gray-900">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
          <div>
             <h1 className="text-xl font-bold text-gray-900">{isEditing ? `Edit Driver: ${formData.general.firstName} ${formData.general.lastName}` : 'Add New Driver'}</h1>
             <p className="text-xs text-slate-500 mt-1">Fill in the information below to {isEditing ? 'update the' : 'create a new'} driver profile.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Driver
            </button>
          </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-4 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Driver Type Section */}
            <div className="p-6 border-b border-gray-100 bg-blue-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <InputGroup
                        label="Driver Type"
                        options={['Company Driver', 'Owner Operator', 'Lease Operator', 'Long Haul Driver', 'Local Driver', 'Regional Driver']}
                        value={formData.general.driverType}
                        onChange={(e: any) => updateNested('general', 'driverType', e.target.value)}
                        required
                    />
                    <div className="text-xs text-slate-600 italic">
                        Select the primary driver classification for this profile
                    </div>
                </div>
            </div>

            {/* 1. Personal Identification */}
            <div className="p-8 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><User className="w-5 h-5"/></div>
                    Personal Identification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputGroup label="First Name" value={formData.general.firstName} onChange={(e: any) => updateNested('general', 'firstName', e.target.value)} required />
                    <InputGroup label="Middle Name" value={formData.general.middleName} onChange={(e: any) => updateNested('general', 'middleName', e.target.value)} />
                    <InputGroup label="Last Name" value={formData.general.lastName} onChange={(e: any) => updateNested('general', 'lastName', e.target.value)} required />
                    <InputGroup label="Date of Birth" type="date" value={formData.general.dateOfBirth} onChange={(e: any) => updateNested('general', 'dateOfBirth', e.target.value)} required />
                    <InputGroup label="Gender" options={['Male', 'Female', 'Other', 'Prefer not to say']} value={formData.general.gender} onChange={(e: any) => updateNested('general', 'gender', e.target.value)} />
                    <InputGroup label="Citizenship" options={['USA', 'Canada']} value={formData.general.citizenshipCountryCode} onChange={(e: any) => updateNested('general', 'citizenshipCountryCode', e.target.value)} required />
                    <InputGroup label="SSN / SIN" value={formData.general.ssn} onChange={(e: any) => updateNested('general', 'ssn', e.target.value)} />
                    <InputGroup label="Date Hired" type="date" value={formData.general.dateHired} onChange={(e: any) => updateNested('general', 'dateHired', e.target.value)} />
                    <InputGroup label="Date Added" type="date" value={formData.general.dateAdded} onChange={(e: any) => updateNested('general', 'dateAdded', e.target.value)} />
                </div>
            </div>

            {/* 2. Contact Information */}
            <div className="p-8 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600"><Phone className="w-5 h-5"/></div>
                    Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Primary Phone" value={formData.phones.primary} onChange={(e: any) => updatePhone('primary', e.target.value)} required />
                    <InputGroup label="Secondary Phone" value={formData.phones.secondary} onChange={(e: any) => updatePhone('secondary', e.target.value)} />
                    <InputGroup label="Primary Email" value={formData.notifications.primaryEmail.email} onChange={(e: any) => updateEmail('primaryEmail', 'email', e.target.value)} />
                    <InputGroup label="Secondary Email" value={formData.notifications.secondaryEmail.email} onChange={(e: any) => updateEmail('secondaryEmail', 'email', e.target.value)} />
                </div>
            </div>

            {/* 3. Current Residence */}
            <div className="p-8 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><MapPin className="w-5 h-5"/></div>
                    Current Residence
                </h3>
                <AddressFormFields 
                    data={formData.address} 
                    onChange={(field, value) => updateNested('address', field, value)} 
                />
            </div>

            {/* 4. Driver License (Primary) */}
            <div className="p-8 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Briefcase className="w-5 h-5"/></div>
                    Driver License (Primary)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <InputGroup label="License Number" value={formData.driverLicense.number} onChange={(e: any) => updateNested('driverLicense', 'number', e.target.value)} required />
                    <InputGroup label="License Type" options={['CDL', 'Driver License']} value={formData.driverLicense.type} onChange={(e: any) => updateNested('driverLicense', 'type', e.target.value)} />
                    <InputGroup label="Issuing State" value={formData.driverLicense.issuingRegion} onChange={(e: any) => updateNested('driverLicense', 'issuingRegion', e.target.value)} />
                    <InputGroup label="Expiry Date" type="date" value={formData.driverLicense.expiryDate} onChange={(e: any) => updateNested('driverLicense', 'expiryDate', e.target.value)} required />
                </div>
                
                {/* File Upload Section for Primary License */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload License Document</label>
                    <Toggle 
                        label={'Include PDF Document'}
                        checked={formData.driverLicense.uploadType === 'pdf'}
                        onChange={(checked) => updateNested('driverLicense', 'uploadType', checked ? 'pdf' : 'images')}
                    />
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors relative group">
                          {formData.driverLicense.frontImage ? (
                              <div className="text-green-600 flex flex-col items-center justify-center h-24">
                                  <UploadCloud className="w-8 h-8 mb-2" />
                                  <span className="text-xs font-bold">Front Uploaded</span>
                              </div>
                          ) : (
                              <>
                                <p className="text-xs font-bold text-slate-500 mb-2">Front Side</p>
                                <Camera className="w-6 h-6 text-slate-300 mx-auto mb-3" />
                                <input type="file" className="w-full text-xs text-transparent file:mr-0 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={(e: any) => updateNested('driverLicense', 'frontImage', e.target.files[0])} />
                              </>
                          )}
                        </div>
                        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors">
                           {formData.driverLicense.rearImage ? (
                              <div className="text-green-600 flex flex-col items-center justify-center h-24">
                                  <UploadCloud className="w-8 h-8 mb-2" />
                                  <span className="text-xs font-bold">Rear Uploaded</span>
                              </div>
                          ) : (
                              <>
                                <p className="text-xs font-bold text-slate-500 mb-2">Rear Side</p>
                                <Camera className="w-6 h-6 text-slate-300 mx-auto mb-3" />
                                <input type="file" className="w-full text-xs text-transparent file:mr-0 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={(e: any) => updateNested('driverLicense', 'rearImage', e.target.files[0])} />
                              </>
                          )}
                        </div>
                        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors">
                           {formData.driverLicense.photo ? (
                              <div className="text-green-600 flex flex-col items-center justify-center h-24">
                                  <UploadCloud className="w-8 h-8 mb-2" />
                                  <span className="text-xs font-bold">Photo Uploaded</span>
                              </div>
                          ) : (
                              <>
                                <p className="text-xs font-bold text-slate-500 mb-2">Driver Photo</p>
                                <User className="w-6 h-6 text-slate-300 mx-auto mb-3" />
                                <input type="file" className="w-full text-xs text-transparent file:mr-0 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={(e: any) => updateNested('driverLicense', 'photo', e.target.files[0])} />
                              </>
                          )}
                        </div>
                    </div>

                  {formData.driverLicense.uploadType === 'pdf' && (
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                        <UploadCloud className="w-8 h-8 text-indigo-200 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-600 mb-1">Upload PDF Document</p>
                        <p className="text-xs text-slate-400 mb-4">SVG, PNG, JPG or PDF (max. 5MB)</p>
                        <input type="file" className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" onChange={(e: any) => updateNested('driverLicense', 'pdfDoc', e.target.files[0])} />
                      </div>
                  )}
                </div>
            </div>

            {/* Travel Documents Section */}
            <div className="p-8 border-b border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Briefcase className="w-5 h-5"/></div>
                        Travel Documents (Passports, Visas)
                    </h3>
                    <button onClick={() => addListItem('travelDocuments', { type: 'Passport', number: '', country: 'USA', expiryDate: '', uploadType: 'images' })} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">+ Add Document</button>
                </div>

                <div className="space-y-6">
                    {formData.travelDocuments.map((doc: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-gray-200 rounded-xl p-6 relative group transition-all hover:shadow-md">
                            <button onClick={() => removeListItem('travelDocuments', idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <InputGroup label="Document Type" options={['Passport', 'Visa', 'FAST Card', 'TWIC Card', 'Other']} value={doc.type} onChange={(e: any) => handleListChange('travelDocuments', idx, 'type', e.target.value)} />
                                <InputGroup label="Document Number" value={doc.number} onChange={(e: any) => handleListChange('travelDocuments', idx, 'number', e.target.value)} />
                                <InputGroup label="Issuing Country" value={doc.country} onChange={(e: any) => handleListChange('travelDocuments', idx, 'country', e.target.value)} />
                                <InputGroup label="Expiry Date" type="date" value={doc.expiryDate} onChange={(e: any) => handleListChange('travelDocuments', idx, 'expiryDate', e.target.value)} />
                            </div>

                            {/* Document Upload */}
                             <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Upload Documents</label>
                                    <Toggle 
                                        label={'Include PDF'}
                                        checked={doc.uploadType === 'pdf'}
                                        onChange={(checked) => handleListChange('travelDocuments', idx, 'uploadType', checked ? 'pdf' : 'images')}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-3 mb-3">
                                    {doc.uploadType === 'pdf' ? (
                                        <div className="border border-dashed border-gray-300 rounded p-4 text-center hover:bg-slate-50">
                                            <UploadCloud className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                            <p className="text-[10px] text-slate-400 mb-1">Document PDF</p>
                                            <input type="file" className="text-[10px] w-full" onChange={(e: any) => handleListChange('travelDocuments', idx, 'pdfDoc', e.target.files[0])} />
                                        </div>
                                    ) : (
                                        <div className="border border-dashed border-gray-300 rounded p-4 text-center hover:bg-slate-50">
                                            <Camera className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                            <p className="text-[10px] text-slate-400 mb-1">Document Images</p>
                                            <input type="file" multiple className="text-[10px] w-full" onChange={(e: any) => handleListChange('travelDocuments', idx, 'images', e.target.files)} />
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    ))}
                    {formData.travelDocuments.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No travel documents added.</p>}
                </div>
            </div>

            {/* Additional Licenses Section */}
            <div className="p-8 border-b border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Briefcase className="w-5 h-5"/></div>
                        Additional Licenses (CDL, etc.)
                    </h3>
                    <button onClick={() => addListItem('additionalLicenses', { type: 'CDL', number: '', issuingCountryCode: 'USA', issuingRegion: '', class: '', expiryDate: '', uploadType: 'images' })} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">+ Add License</button>
                </div>

                <div className="space-y-6">
                    {formData.additionalLicenses.map((license: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-gray-200 rounded-xl p-6 relative group transition-all hover:shadow-md">
                            <button onClick={() => removeListItem('additionalLicenses', idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <InputGroup label="License Type" options={['CDL', 'Driver License', 'Other']} value={license.type} onChange={(e: any) => handleListChange('additionalLicenses', idx, 'type', e.target.value)} />
                                <InputGroup label="License Number" value={license.number} onChange={(e: any) => handleListChange('additionalLicenses', idx, 'number', e.target.value)} />
                                <InputGroup label="Issuing State" value={license.issuingRegion} onChange={(e: any) => handleListChange('additionalLicenses', idx, 'issuingRegion', e.target.value)} />
                                <InputGroup label="Class" value={license.class} onChange={(e: any) => handleListChange('additionalLicenses', idx, 'class', e.target.value)} />
                                <InputGroup label="Expiry Date" type="date" value={license.expiryDate} onChange={(e: any) => handleListChange('additionalLicenses', idx, 'expiryDate', e.target.value)} />
                            </div>

                            {/* Additional License Upload */}
                             <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Upload Documents</label>
                                    <Toggle 
                                        label={'Include PDF'}
                                        checked={license.uploadType === 'pdf'}
                                        onChange={(checked) => handleListChange('additionalLicenses', idx, 'uploadType', checked ? 'pdf' : 'images')}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div className="border border-dashed border-gray-300 rounded p-2 text-center hover:bg-slate-50">
                                        <p className="text-[10px] text-slate-400 mb-1">Front</p>
                                        <input type="file" className="text-[10px] w-full" onChange={(e: any) => handleListChange('additionalLicenses', idx, 'frontImage', e.target.files[0])} />
                                    </div>
                                    <div className="border border-dashed border-gray-300 rounded p-2 text-center hover:bg-slate-50">
                                        <p className="text-[10px] text-slate-400 mb-1">Rear</p>
                                        <input type="file" className="text-[10px] w-full" onChange={(e: any) => handleListChange('additionalLicenses', idx, 'rearImage', e.target.files[0])} />
                                    </div>
                                    <div className="border border-dashed border-gray-300 rounded p-2 text-center hover:bg-slate-50">
                                        <p className="text-[10px] text-slate-400 mb-1">Photo</p>
                                        <input type="file" className="text-[10px] w-full" onChange={(e: any) => handleListChange('additionalLicenses', idx, 'photo', e.target.files[0])} />
                                    </div>
                                </div>

                                {license.uploadType === 'pdf' && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <p className="text-[10px] text-slate-400 mb-1">License PDF</p>
                                        <input type="file" className="text-xs w-full" onChange={(e: any) => handleListChange('additionalLicenses', idx, 'pdfDoc', e.target.files[0])} />
                                    </div>
                                )}
                             </div>
                        </div>
                    ))}
                    {formData.additionalLicenses.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No additional licenses added.</p>}
                </div>
            </div>

            {/* 5. Emergency Contacts */}
            {/* 5. Emergency Contacts */}
            <div className="p-8 border-b border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600"><AlertTriangle className="w-5 h-5"/></div>
                        Emergency Contacts
                    </h3>
                    <button onClick={() => setContactsModalOpen(true)} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><Edit className="w-3 h-3"/> Manage Contacts</button>
                </div>
                <div className="space-y-4">
                    {formData.emergencyContacts.map((contact: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-start justify-between">
                           <div>
                               <p className="font-bold text-slate-900 text-sm">{contact.name} <span className="text-slate-500 font-normal">({contact.relation})</span></p>
                               <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                  {contact.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {contact.phone}</span>}
                                  {contact.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {contact.email}</span>}
                               </div>
                           </div>
                        </div>
                    ))}
                    {formData.emergencyContacts.length === 0 && <p className="text-sm text-slate-400 italic">No emergency contacts added.</p>}
                </div>
                
                {/* Reuse Edit Modal */}
                <EditContactsModal 
                    isOpen={isContactsModalOpen} 
                    onClose={() => setContactsModalOpen(false)} 
                    contacts={formData.emergencyContacts} 
                    onSave={(newList: any) => {
                        setFormData({ ...formData, emergencyContacts: newList });
                        setContactsModalOpen(false);
                    }} 
                />
            </div>

            {/* 6. Employment History */}
            {/* 6. Employment History */}
            <div className="p-8 border-b border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Briefcase className="w-5 h-5"/></div>
                        Employment History
                    </h3>
                    <button onClick={() => setEmploymentModalOpen(true)} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><Edit className="w-3 h-3"/> Manage History</button>
                </div>
                
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 tracking-wider">
                      <tr>
                        <th className="px-4 py-2 font-bold">Employer</th>
                        <th className="px-4 py-2 font-bold">Duration</th>
                        <th className="px-4 py-2 font-bold">Zone/Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {formData.employmentHistory.map((job: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 align-top">
                              <div className="font-bold text-slate-900 text-xs mb-0.5">{job.employerName}</div>
                              <div className="text-[10px] text-slate-500">
                                {typeof job.address === 'object' 
                                    ? `${job.address.city || ''}, ${job.address.state || ''}` 
                                    : job.address}
                              </div>
                          </td>
                          <td className="px-4 py-3 align-top text-slate-600 font-mono text-[10px]">
                              <div>{job.startDate}</div>
                              <div className="text-slate-400">to</div>
                              <div>{job.endDate}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-[10px] mb-1">{job.operatingZone}</div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200">{job.terminationStatus}</span>
                          </td>
                        </tr>
                      ))}
                      {formData.employmentHistory.length === 0 && (
                         <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">No employment history added.</td></tr>
                       )}
                    </tbody>
                  </table>
                </div>

                <EditEmploymentModal 
                    isOpen={isEmploymentModalOpen} 
                    onClose={() => setEmploymentModalOpen(false)} 
                    history={formData.employmentHistory} 
                    onSave={(newList: any) => {
                        setFormData({ ...formData, employmentHistory: newList });
                        setEmploymentModalOpen(false);
                    }} 
                />
            </div>

            {/* 7. Previous Residences */}
            {/* 7. Previous Residences */}
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><History className="w-5 h-5"/></div>
                        Previous Residences (Last 3 Years)
                    </h3>
                    <button onClick={() => setResidencesModalOpen(true)} className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><Edit className="w-3 h-3"/> Manage Residences</button>
                </div>
                <div className="space-y-4">
                    {formData.previousResidences.map((res: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                           <div className="flex items-start gap-3">
                              <div className="mt-0.5 text-slate-400"><MapPin className="w-4 h-4" /></div>
                              <div>
                                  <p className="font-bold text-slate-900 text-sm">{res.address} {res.unit ? `, ${res.unit}` : ''}</p>
                                  <p className="text-xs text-slate-600 mb-1">{res.city}, {res.state} {res.zip}, {res.country}</p>
                                  <p className="text-[10px] text-slate-400">{res.startDate} - {res.endDate}</p>
                              </div>
                           </div>
                        </div>
                    ))}
                    {formData.previousResidences.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No previous residences added.</p>}
                </div>

                <EditResidencesModal 
                    isOpen={isResidencesModalOpen} 
                    onClose={() => setResidencesModalOpen(false)} 
                    residences={formData.previousResidences} 
                    onSave={(newList: any) => {
                        setFormData({ ...formData, previousResidences: newList });
                        setResidencesModalOpen(false);
                    }} 
                />
            </div>

        </div>
      </div>
    </div>
  );
};
