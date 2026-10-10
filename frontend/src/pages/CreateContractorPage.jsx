import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import ContractorAvatar from '../components/ContractorAvatar';
import {
  User, Building, FileText, DollarSign, CheckCircle2, ArrowLeft, ArrowRight,
  Plus, Trash2, Eye, EyeOff, ShieldCheck, Edit3, Save, MapPin, QrCode, Download, Printer, RefreshCw, Upload, Camera, X
} from 'lucide-react';

const INDIAN_STATES = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Uttar Pradesh", "West Bengal", "Telangana"];
const CONTRACT_TYPES = ["Road Construction", "Building Construction", "Bridge Construction", "Water Supply System", "Electrical Works", "Sewerage Network", "Infrastructure Development", "Other"];
const OFFICIAL_DOC_TYPES = [
  "Contractor Registration Certificate",
  "Tender Document",
  "Tender Acceptance Letter",
  "Government Sanction Order",
  "Technical Sanction",
  "Work Order",
  "Contract / Agreement",
  "Project Approval Document",
  "Payment / Fund Release Documents",
  "Completion Certificate",
  "Other Official Documents"
];

import { useTheme } from '../context/ThemeContext';

const CreateContractorPage = () => {
  const { currentPreset } = useTheme();
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [createdProfile, setCreatedProfile] = useState(null);

  // Phase 1 State — Registration & Login Account Details
  const [regData, setRegData] = useState({
    first_name: '',
    fathers_name: '',
    surname: '',
    mobile_number: '',
    email: '',
    contractor_reg_number: '',
    company_name: '',
    business_address: '',
    state: 'Maharashtra',
    district: 'Mumbai',
    pin_code: '',
    password: '',
    confirm_password: '',
    status: 'Active'
  });

  // Contractor Photo Upload State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(file.type) && !['jpg', 'jpeg', 'png'].includes(ext)) {
      setFormError("Invalid photo format. Only JPG, JPEG, and PNG images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Photo file size exceeds 5 MB limit. Please select a smaller photo.");
      return;
    }

    setFormError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Phase 2 State — Complete Contract Details
  const [contracts, setContracts] = useState([
    {
      id: Date.now(),
      title: '',
      contract_type: 'Road Construction',
      department: 'Public Works Department (PWD)',
      office_name: 'Executive Engineer Office',
      location: '',
      contract_address: '',
      district: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '',
      description: '',
      tender_number: '',
      work_order_number: '',
      agreement_number: '',
      start_date: '',
      end_date: '',
      responsibilities: '',
      status: 'Awarded'
    }
  ]);

  // Phase 3 State — Financial Details
  const [financials, setFinancials] = useState({
    sanctioned_amount: '',
    sanctioned_amount_words: '',
    sanctioning_authority: '',
    sanction_order_number: '',
    sanction_date: '',
    financial_year: '2025-2026',
    budget_head: '',
    contract_value: '',
    approved_variations: '0',
    revised_contract_value: '',
    deductions_terms: '',
    fund_releases: [],
    payments: []
  });

  // Phase 5 State — Documents Management
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState(OFFICIAL_DOC_TYPES[0]);
  const [docContractIndex, setDocContractIndex] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docVerificationStatus, setDocVerificationStatus] = useState('Verified');
  const [docFile, setDocFile] = useState(null);

  // Calculated Financial Figures
  const sanctionedAmt = parseFloat(financials.sanctioned_amount) || 0;
  const contractVal = parseFloat(financials.revised_contract_value || financials.contract_value) || 0;

  const totalFundsReleased = financials.fund_releases.reduce((sum, item) => sum + (parseFloat(item.amount_released) || 0), 0);
  const totalPaymentsMade = financials.payments.filter(p => ['Approved', 'Paid'].includes(p.payment_status)).reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0);

  // Phase Navigation Handlers
  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  const validatePhase1 = () => {
    if (!regData.first_name || !regData.fathers_name || !regData.surname || !regData.mobile_number ||
        !regData.email || !regData.contractor_reg_number || !regData.business_address ||
        !regData.pin_code || !regData.password || !regData.confirm_password) {
      setFormError("Please fill in all required registration fields.");
      return false;
    }

    if (regData.password !== regData.confirm_password) {
      setFormError("Password and Confirm Password do not match.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleNextPhase = () => {
    if (activePhase === 1 && !validatePhase1()) return;
    setFormError(null);
    setActivePhase((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevPhase = () => {
    setFormError(null);
    setActivePhase((prev) => Math.max(prev - 1, 1));
  };

  const handleAttachDocument = (e) => {
    e.preventDefault();
    if (!docName || !docFile) {
      setFormError("Please provide a document name and select a file to attach.");
      return;
    }

    if (docFile.size > 10 * 1024 * 1024) {
      setFormError("Selected file exceeds the maximum 10MB limit.");
      return;
    }

    const newDocEntry = {
      id: Date.now(),
      document_name: docName,
      document_type: docType,
      contract_index: docContractIndex !== '' ? parseInt(docContractIndex) : null,
      contract_title: docContractIndex !== '' ? (contracts[parseInt(docContractIndex)]?.title || `Contract #${parseInt(docContractIndex) + 1}`) : 'Contractor Level (General Certificate)',
      description: docDescription,
      verification_status: docVerificationStatus,
      file: docFile,
      file_name: docFile.name,
      file_size: (docFile.size / 1024).toFixed(1) + ' KB',
      uploaded_at: new Date().toLocaleDateString()
    };

    setAttachedDocs([...attachedDocs, newDocEntry]);
    setDocName('');
    setDocDescription('');
    setDocFile(null);
    setFormError(null);
  };

  const handleRemoveAttachedDoc = (id) => {
    setAttachedDocs(attachedDocs.filter(d => d.id !== id));
  };

  // Add/Remove Contracts
  const addContract = () => {
    setContracts([
      ...contracts,
      {
        id: Date.now(),
        title: '',
        contract_type: 'Road Construction',
        department: 'Public Works Department (PWD)',
        office_name: 'Executive Engineer Office',
        location: '',
        contract_address: '',
        district: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '',
        description: '',
        tender_number: '',
        work_order_number: '',
        agreement_number: '',
        start_date: '',
        end_date: '',
        responsibilities: '',
        status: 'Awarded'
      }
    ]);
  };

  const removeContract = (id) => {
    if (contracts.length === 1) return;
    setContracts(contracts.filter(c => c.id !== id));
  };

  const updateContract = (id, field, val) => {
    setContracts(contracts.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  // Add Fund Releases & Payments
  const addFundRelease = () => {
    setFinancials({
      ...financials,
      fund_releases: [
        ...financials.fund_releases,
        {
          id: Date.now(),
          installment_number: financials.fund_releases.length + 1,
          release_order_number: '',
          release_date: '',
          amount_released: '',
          payment_ref_number: '',
          remarks: ''
        }
      ]
    });
  };

  // Submit Profile Request (Draft or Complete)
  const handleSubmitProfile = async (isDraft = false) => {
    if (!isDraft && !reviewConfirmed) {
      setFormError("Please check the confirmation box to verify that all details have been reviewed.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      contractor: regData,
      contracts: contracts.map(({ id, ...rest }) => ({
        ...rest,
        description: (rest.description || rest.responsibilities || rest.title || 'Official Government Contract').trim(),
        responsibilities: (rest.responsibilities || rest.description || rest.title || 'Official Contractor Responsibilities').trim()
      })),
      financials: {
        sanctioned_amount: sanctionedAmt,
        sanctioned_amount_words: financials.sanctioned_amount_words,
        sanctioning_authority: financials.sanctioning_authority || 'Department Authority',
        sanction_order_number: financials.sanction_order_number || 'SO-2026-001',
        sanction_date: financials.sanction_date || new Date().toISOString().split('T')[0],
        financial_year: financials.financial_year,
        budget_head: financials.budget_head,
        contract_value: contractVal,
        approved_variations: parseFloat(financials.approved_variations) || 0,
        revised_contract_value: contractVal,
        deductions_terms: financials.deductions_terms,
        fund_releases: financials.fund_releases.map(({ id, ...rest }) => ({
          ...rest,
          installment_number: parseInt(rest.installment_number),
          amount_released: parseFloat(rest.amount_released) || 0
        })),
        payments: financials.payments.map(({ id, ...rest }) => ({
          ...rest,
          gross_amount: parseFloat(rest.gross_amount) || 0,
          deductions: parseFloat(rest.deductions) || 0,
          net_amount: parseFloat(rest.net_amount) || 0
        }))
      },
      is_draft: isDraft
    };

    try {
      const adminToken = localStorage.getItem('admin_access_token') || localStorage.getItem('anti_corruption_token');
      const authHeaders = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};

      const response = await api.post('/contractors', payload, {
        headers: { ...authHeaders }
      });
      const createdContractorId = response.data.id;

      // Upload Official Contractor Photo if provided
      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append('file', photoFile);
        await api.post(`/contractors/${createdContractorId}/photo`, photoFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...authHeaders
          }
        });
      }

      // Upload attached Phase 5 documents if present
      if (attachedDocs.length > 0) {
        for (const doc of attachedDocs) {
          const formData = new FormData();
          formData.append('document_name', doc.document_name);
          formData.append('document_type', doc.document_type);
          if (doc.contract_index !== null && response.data.contracts && response.data.contracts[doc.contract_index]) {
            formData.append('contract_id', response.data.contracts[doc.contract_index].id);
          }
          if (doc.description) formData.append('description', doc.description);
          formData.append('verification_status', doc.verification_status);
          formData.append('file', doc.file);

          await api.post(`/contractors/${createdContractorId}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              ...authHeaders
            }
          });
        }
      }

      const contractorName = `${regData.first_name} ${regData.fathers_name ? `${regData.fathers_name} ` : ''}${regData.surname}`.trim() || regData.company_name || 'Contractor';
      const profileDetails = {
        id: response.data.id,
        contractor_id: response.data.contractor_id || createdContractorId,
        name: contractorName,
        company_name: regData.company_name,
        email: regData.email,
        mobile_number: regData.mobile_number,
        contractor_reg_number: regData.contractor_reg_number,
        status: response.data.status || 'Active',
        contracts_count: response.data.contracts?.length || contracts.length,
        is_draft: isDraft
      };

      if (isDraft) {
        setFormSuccess("Contractor draft profile saved successfully.");
        setTimeout(() => {
          navigate('/admin/contractors');
        }, 1500);
      } else {
        setCreatedProfile(profileDetails);
        setFormSuccess("Contractor Profile Created and Activated Successfully.");
      }
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create contractor profile. Please check all fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedProfile(null);
    setFormSuccess(null);
    setFormError(null);
    setActivePhase(1);
    setReviewConfirmed(false);
    setRegData({
      first_name: '',
      fathers_name: '',
      surname: '',
      mobile_number: '',
      email: '',
      contractor_reg_number: '',
      company_name: '',
      business_address: '',
      state: 'Maharashtra',
      district: 'Mumbai',
      pin_code: '',
      password: '',
      confirm_password: '',
      status: 'Active'
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setContracts([
      {
        id: Date.now(),
        title: '',
        department: 'Public Works Department (PWD)',
        office_name: 'Executive Engineer Division Office',
        location: '',
        contract_address: '',
        district: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '',
        contract_type: 'Road Construction',
        tender_number: '',
        work_order_number: '',
        agreement_number: '',
        start_date: '',
        end_date: '',
        responsibilities: ''
      }
    ]);
    setAttachedDocs([]);
  };

  return (
    <div className={`min-h-screen ${currentPreset.bgMain} ${currentPreset.textMain} flex flex-col transition-colors duration-300`}>
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row min-w-0 w-full">
        <AdminSidebar />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Title */}
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${currentPreset.bgCard} p-6 rounded-2xl border ${currentPreset.border} shadow-sm`}>
            <div>
              <h1 className={`text-xl font-bold ${currentPreset.textMain} tracking-tight flex items-center gap-2`}>
                <User className="w-5 h-5 text-gov-600" />
                Create Contractor Profile & Work Details
              </h1>
              <p className={`text-xs ${currentPreset.textMuted} mt-1`}>
                Contractor Personal Registration, Public Work Details & Official Document Uploads
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/contractors')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-gov-600/30"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to List
              </button>
            </div>
          </div>

          {/* Progress Stepper Bar */}
          <div className={`${currentPreset.bgCard} rounded-2xl p-3 sm:p-6 border ${currentPreset.border} shadow-sm overflow-x-auto custom-scrollbar`}>
            <div className="flex sm:grid sm:grid-cols-5 gap-1.5 sm:gap-4 min-w-[340px] sm:min-w-0 justify-between">
              {[
                { step: 1, label: 'Phase 1', title: 'Registration' },
                { step: 2, label: 'Phase 2', title: 'Work & Contracts' },
                { step: 3, label: 'Phase 3', title: 'Financial Specs' },
                { step: 4, label: 'Phase 4', title: 'Documents' },
                { step: 5, label: 'Phase 5', title: 'Review & Create' }
              ].map((s) => {
                const isActive = activePhase === s.step;
                const isCompleted = activePhase > s.step;

                return (
                  <button
                    key={s.step}
                    onClick={() => setActivePhase(s.step)}
                    className={`flex flex-col items-center text-center p-1.5 sm:p-2 rounded-xl transition-all flex-1 cursor-pointer ${
                      isActive
                        ? 'bg-gov-50 border border-gov-200 text-gov-800 font-bold'
                        : isCompleted
                        ? 'text-emerald-700 font-semibold hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-extrabold mb-1 transition-all ${
                        isActive
                          ? 'bg-gov-700 text-white shadow-md'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : s.step}
                    </div>
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold opacity-80">{s.label}</span>
                    <span className="text-[11px] sm:text-xs hidden sm:block truncate w-full">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Toasts */}
          {formError && <NotificationToast type="error" message={formError} onClose={() => setFormError(null)} />}
          {formSuccess && <NotificationToast type="success" message={formSuccess} />}

          {/* Form Containers */}
          <div className={`${currentPreset.bgCard} rounded-2xl p-6 sm:p-8 border ${currentPreset.border} shadow-sm`}>
            {/* PHASE 1: REGISTRATION DETAILS */}
            {activePhase === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-gov-600" />
                    Phase 1: Contractor Registration & Login Setup
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">* Required Fields</span>
                </div>

                {/* Contractor Photo Upload Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-gov-600" /> Contractor Photo Upload
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Live Preview / Placeholder Avatar */}
                    <div className="relative group shrink-0">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Contractor Preview"
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                        />
                      ) : (
                        <ContractorAvatar
                          name={regData.first_name ? `${regData.first_name} ${regData.surname}` : 'Contractor'}
                          size="xl"
                        />
                      )}
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white p-1.5 rounded-full shadow hover:bg-rose-700 transition-colors"
                          title="Remove Selected Photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Upload Controls & Guidelines */}
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <label className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white rounded-lg font-bold text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>{photoPreview ? 'Change Photo' : 'Upload Contractor Photo'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                        {photoPreview && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Upload official photo from device (JPG, JPEG, PNG, Max 5MB). Photo will be permanently stored and displayed on profile, admin lists, contractor portal, and citizen transparency views.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={regData.first_name}
                      onChange={handleRegChange}
                      placeholder="Rajesh"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Name *</label>
                    <input
                      type="text"
                      name="fathers_name"
                      value={regData.fathers_name}
                      onChange={handleRegChange}
                      placeholder="Kumar"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Surname / Last Name *</label>
                    <input
                      type="text"
                      name="surname"
                      value={regData.surname}
                      onChange={handleRegChange}
                      placeholder="Sharma"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      name="mobile_number"
                      value={regData.mobile_number}
                      onChange={handleRegChange}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Login ID *</label>
                    <input
                      type="email"
                      name="email"
                      value={regData.email}
                      onChange={handleRegChange}
                      placeholder="contractor@firm.gov"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contractor Reg Number *</label>
                    <input
                      type="text"
                      name="contractor_reg_number"
                      value={regData.contractor_reg_number}
                      onChange={handleRegChange}
                      placeholder="PWD-REG-2026-99"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Firm Name (Optional)</label>
                    <input
                      type="text"
                      name="company_name"
                      value={regData.company_name}
                      onChange={handleRegChange}
                      placeholder="Apex Infrastructure Pvt Ltd"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Business Address *</label>
                    <input
                      type="text"
                      name="business_address"
                      value={regData.business_address}
                      onChange={handleRegChange}
                      placeholder="Plot 45, Industrial Highway Zone"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                    <select
                      name="state"
                      value={regData.state}
                      onChange={handleRegChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    >
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                    <input
                      type="text"
                      name="district"
                      value={regData.district}
                      onChange={handleRegChange}
                      placeholder="Mumbai"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                    <input
                      type="text"
                      name="pin_code"
                      value={regData.pin_code}
                      onChange={handleRegChange}
                      placeholder="400001"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Contractor Account Security Credentials</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={regData.password}
                          onChange={handleRegChange}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="confirm_password"
                        value={regData.confirm_password}
                        onChange={handleRegChange}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status *</label>
                      <select
                        name="status"
                        value={regData.status}
                        onChange={handleRegChange}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none font-semibold text-slate-800"
                      >
                        <option value="Active">Active (Can log in upon completion)</option>
                        <option value="Draft">Draft (Inactive until published)</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 2: COMPLETE CONTRACT DETAILS & OFFICIAL DOCUMENTS */}
            {activePhase === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gov-600" />
                      Phase 2: Complete Government Work & Contract Specifications
                    </h2>
                    <p className="text-xs text-slate-500">Assign work details, project site address, and official documents.</p>
                  </div>
                  <button
                    onClick={addContract}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-gov-700 hover:bg-gov-800 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Contract
                  </button>
                </div>

                {contracts.map((c, idx) => (
                  <div key={c.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 relative">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-gov-900 uppercase">
                        Contract #{idx + 1} Specification
                      </span>
                      {contracts.length > 1 && (
                        <button
                          onClick={() => removeContract(c.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Contract
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Type *</label>
                        <select
                          value={c.contract_type}
                          onChange={(e) => updateContract(c.id, 'contract_type', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 font-medium"
                        >
                          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Project / Work Name *</label>
                        <input
                          type="text"
                          value={c.title}
                          onChange={(e) => updateContract(c.id, 'title', e.target.value)}
                          placeholder="Arterial Highway Widening & Bridge Construction"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 font-semibold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Government Department *</label>
                        <input
                          type="text"
                          value={c.department}
                          onChange={(e) => updateContract(c.id, 'department', e.target.value)}
                          placeholder="Public Works Department (PWD)"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Division Name</label>
                        <input
                          type="text"
                          value={c.office_name}
                          onChange={(e) => updateContract(c.id, 'office_name', e.target.value)}
                          placeholder="Executive Engineer Office Division 4"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Complete Contract Address / Site Location *</label>
                        <input
                          type="text"
                          value={c.contract_address || c.location}
                          onChange={(e) => {
                            updateContract(c.id, 'contract_address', e.target.value);
                            updateContract(c.id, 'location', e.target.value);
                          }}
                          placeholder="Sector 4 Highway Stretch, Ward 12"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                        <input
                          type="text"
                          value={c.district}
                          onChange={(e) => updateContract(c.id, 'district', e.target.value)}
                          placeholder="Mumbai"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                        <input
                          type="text"
                          value={c.pin_code}
                          onChange={(e) => updateContract(c.id, 'pin_code', e.target.value)}
                          placeholder="400001"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tender Number *</label>
                        <input
                          type="text"
                          value={c.tender_number}
                          onChange={(e) => updateContract(c.id, 'tender_number', e.target.value)}
                          placeholder="TND-2026-001"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Work Order Number *</label>
                        <input
                          type="text"
                          value={c.work_order_number}
                          onChange={(e) => updateContract(c.id, 'work_order_number', e.target.value)}
                          placeholder="WO-2026-888"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contract / Agreement Number *</label>
                        <input
                          type="text"
                          value={c.agreement_number}
                          onChange={(e) => updateContract(c.id, 'agreement_number', e.target.value)}
                          placeholder="AGR-2026-555"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Start Date *</label>
                        <input
                          type="date"
                          value={c.start_date}
                          onChange={(e) => updateContract(c.id, 'start_date', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Completion Date *</label>
                        <input
                          type="date"
                          value={c.end_date}
                          onChange={(e) => updateContract(c.id, 'end_date', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Status *</label>
                        <select
                          value={c.status}
                          onChange={(e) => updateContract(c.id, 'status', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border rounded-lg font-bold text-slate-800"
                        >
                          <option value="Awarded">Awarded</option>
                          <option value="In Progress">In Progress</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Work Description & Contractor Responsibilities *</label>
                      <textarea
                        rows="2"
                        value={c.responsibilities}
                        onChange={(e) => updateContract(c.id, 'responsibilities', e.target.value)}
                        placeholder="Complete scope of work, key deliverables, and contractor responsibilities..."
                        className="w-full px-3 py-1.5 text-sm border rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PHASE 3: FINANCIAL & PAYMENT DETAILS */}
            {activePhase === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gov-600" />
                    Phase 3: Financial Specifications & Fund Installments
                  </h2>
                  <p className="text-xs text-slate-500">Record sanctioned amounts, contract value, and release installments.</p>
                </div>

                {/* Calculated Live Metrics Card */}
                <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Total Sanctioned</p>
                    <p className="text-lg font-extrabold text-emerald-400">₹{sanctionedAmt.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Contract Value</p>
                    <p className="text-lg font-extrabold text-blue-400">₹{contractVal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Funds Released</p>
                    <p className="text-lg font-extrabold text-amber-400">₹{totalFundsReleased.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Payments Made</p>
                    <p className="text-lg font-extrabold text-teal-300">₹{totalPaymentsMade.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioned Amount (₹) *</label>
                    <input
                      type="number"
                      value={financials.sanctioned_amount}
                      onChange={(e) => setFinancials({ ...financials, sanctioned_amount: e.target.value })}
                      placeholder="5000000"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 font-semibold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Value (₹) *</label>
                    <input
                      type="number"
                      value={financials.contract_value}
                      onChange={(e) => setFinancials({ ...financials, contract_value: e.target.value, revised_contract_value: e.target.value })}
                      placeholder="4500000"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500 font-semibold text-gov-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Financial Year</label>
                    <input
                      type="text"
                      value={financials.financial_year}
                      onChange={(e) => setFinancials({ ...financials, financial_year: e.target.value })}
                      placeholder="2025-2026"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioning Authority</label>
                    <input
                      type="text"
                      value={financials.sanctioning_authority}
                      onChange={(e) => setFinancials({ ...financials, sanctioning_authority: e.target.value })}
                      placeholder="Ministry of State Infrastructure"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Order Number</label>
                    <input
                      type="text"
                      value={financials.sanction_order_number}
                      onChange={(e) => setFinancials({ ...financials, sanction_order_number: e.target.value })}
                      placeholder="SO-2026-001"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                </div>

                {/* Fund Releases Table */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Fund Release Installments</h3>
                    <button
                      type="button"
                      onClick={addFundRelease}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record Installment
                    </button>
                  </div>

                  {financials.fund_releases.map((fr, idx) => (
                    <div key={fr.id} className="p-3 bg-slate-50 border rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-600">Installment #{idx + 1} Order #</span>
                        <input
                          type="text"
                          value={fr.release_order_number}
                          onChange={(e) => {
                            const updated = [...financials.fund_releases];
                            updated[idx].release_order_number = e.target.value;
                            setFinancials({ ...financials, fund_releases: updated });
                          }}
                          placeholder="RO-01"
                          className="w-full p-1.5 border rounded"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Release Date</span>
                        <input
                          type="date"
                          value={fr.release_date}
                          onChange={(e) => {
                            const updated = [...financials.fund_releases];
                            updated[idx].release_date = e.target.value;
                            setFinancials({ ...financials, fund_releases: updated });
                          }}
                          className="w-full p-1.5 border rounded"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Amount Released (₹)</span>
                        <input
                          type="number"
                          value={fr.amount_released}
                          onChange={(e) => {
                            const updated = [...financials.fund_releases];
                            updated[idx].amount_released = e.target.value;
                            setFinancials({ ...financials, fund_releases: updated });
                          }}
                          placeholder="2000000"
                          className="w-full p-1.5 border rounded font-semibold text-emerald-700"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">Payment Ref #</span>
                        <input
                          type="text"
                          value={fr.payment_ref_number}
                          onChange={(e) => {
                            const updated = [...financials.fund_releases];
                            updated[idx].payment_ref_number = e.target.value;
                            setFinancials({ ...financials, fund_releases: updated });
                          }}
                          placeholder="TXN-BANK-001"
                          className="w-full p-1.5 border rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PHASE 4: DOCUMENTS */}
            {activePhase === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gov-600" />
                      Phase 4: Official Documents Management
                    </h2>
                    <p className="text-xs text-slate-500">Upload all official documents related to the contractor and their government contracts in one organized section.</p>
                  </div>
                </div>

                {/* Form to attach documents */}
                <form onSubmit={handleAttachDocument} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Attach Document File</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category *</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-gov-500"
                      >
                        {OFFICIAL_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Related Contract / Project</label>
                      <select
                        value={docContractIndex}
                        onChange={(e) => setDocContractIndex(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-gov-500"
                      >
                        <option value="">Contractor Level (General Certificate)</option>
                        {contracts.map((c, idx) => (
                          <option key={idx} value={idx}>
                            Contract #{idx + 1}: {c.title || 'Untitled Work'} ({c.contract_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Document Name *</label>
                      <input
                        type="text"
                        required
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="e.g. Contractor License Certificate"
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-gov-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Verification Status</label>
                      <select
                        value={docVerificationStatus}
                        onChange={(e) => setDocVerificationStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-gov-500"
                      >
                        <option value="Verified">Verified</option>
                        <option value="Pending Verification">Pending Verification</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Remarks</label>
                      <input
                        type="text"
                        value={docDescription}
                        onChange={(e) => setDocDescription(e.target.value)}
                        placeholder="Optional details or reference numbers"
                        className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-gov-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Select File (PDF, JPG, PNG, DOC, DOCX) *</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setDocFile(e.target.files[0])}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!docName || !docFile}
                      className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-lg shadow transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Attach Document to Profile
                    </button>
                  </div>
                </form>

                {/* Attached Documents List */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-slate-700">Attached Documents ({attachedDocs.length})</span>
                  </div>

                  {attachedDocs.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 italic">No documents attached yet in Phase 4. You can attach documents now or upload them later after creating the profile.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Document Name & File</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Associated With</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attachedDocs.map((doc) => (
                          <tr key={doc.id}>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{doc.document_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{doc.file_name} ({doc.file_size})</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{doc.document_type}</td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">{doc.contract_title}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                doc.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                                doc.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {doc.verification_status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachedDoc(doc.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Remove Attached Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* PHASE 5: REVIEW & CREATE */}
            {activePhase === 5 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Phase 5: Final Review & Profile Activation
                    </h2>
                    <p className="text-xs text-slate-500">Review all information across Phase 1 to Phase 4 before finalizing contractor account.</p>
                  </div>
                </div>

                {/* Review Section 1 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 uppercase">1. Contractor Registration Info</span>
                    <button onClick={() => setActivePhase(1)} className="text-gov-700 font-semibold flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Section
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Contractor" className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 shadow-sm shrink-0" />
                    ) : (
                      <ContractorAvatar name={`${regData.first_name} ${regData.surname}`} size="lg" />
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                      <p><span className="text-slate-400">Name:</span> <span className="font-bold">{regData.first_name} {regData.surname}</span></p>
                      <p><span className="text-slate-400">Reg #:</span> <span className="font-mono">{regData.contractor_reg_number}</span></p>
                      <p><span className="text-slate-400">Email:</span> {regData.email}</p>
                      <p><span className="text-slate-400">Mobile:</span> {regData.mobile_number}</p>
                    </div>
                  </div>
                </div>

                {/* Review Section 2 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 uppercase">2. Assigned Work Contracts ({contracts.length})</span>
                    <button onClick={() => setActivePhase(2)} className="text-gov-700 font-semibold flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Section
                    </button>
                  </div>
                  {contracts.map((c, i) => (
                    <div key={i} className="p-2 bg-white rounded border space-y-1">
                      <p className="font-bold text-slate-900">#{i+1}: {c.title || 'Untitled Project'} ({c.contract_type})</p>
                      <p className="text-slate-500">Address: {c.contract_address || c.location}, {c.district}, {c.state} - {c.pin_code}</p>
                    </div>
                  ))}
                </div>

                {/* Review Section 3 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 uppercase">3. Financial Summary</span>
                    <button onClick={() => setActivePhase(3)} className="text-gov-700 font-semibold flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Section
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    <p>Sanctioned: ₹{sanctionedAmt.toLocaleString()}</p>
                    <p>Contract Value: ₹{contractVal.toLocaleString()}</p>
                    <p>Released: ₹{totalFundsReleased.toLocaleString()}</p>
                    <p>Payments: ₹{totalPaymentsMade.toLocaleString()}</p>
                  </div>
                </div>

                {/* Review Section 4: Documents */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-800 uppercase">4. Attached Official Documents ({attachedDocs.length})</span>
                    <button onClick={() => setActivePhase(4)} className="text-gov-700 font-semibold flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Section
                    </button>
                  </div>
                  {attachedDocs.length === 0 ? (
                    <p className="text-slate-400 italic">No documents attached to profile.</p>
                  ) : (
                    <div className="space-y-1">
                      {attachedDocs.map((doc, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900">{doc.document_name}</span>
                            <span className="text-[11px] text-slate-500 block">{doc.document_type} — {doc.contract_title}</span>
                          </div>
                          <span className="text-emerald-700 font-bold">{doc.verification_status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review Section 5: QR Code Preview */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      5. Generated Public Contract QR Codes ({contracts.length})
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">Automatic Unique Token Assignment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contracts.map((c, idx) => {
                      const dummyQrToken = `QR-CNT-PENDING-${idx + 1}`;
                      const targetUrl = `${window.location.origin}/public/project/${dummyQrToken}`;

                      return (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-slate-50 border rounded-lg shrink-0">
                            <QRCodeSVG value={targetUrl} size={64} level="M" />
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">Contract #{idx + 1}: {c.title || 'Untitled Work'}</p>
                            <p className="text-[11px] text-slate-500">{c.department}</p>
                            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              QR Code Active Upon Creation
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confirmation Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium">
                    <input
                      type="checkbox"
                      checked={reviewConfirmed}
                      onChange={(e) => setReviewConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-gov-600 rounded cursor-pointer"
                    />
                    <span>
                      I confirm that the contractor details, complete work specifications, site address, financial figures, and attached official documents have been verified.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={activePhase === 1}
                onClick={handlePrevPhase}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous Phase
              </button>

              <div className="flex items-center gap-2">
                {activePhase === 5 ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmitProfile(true)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !reviewConfirmed}
                      onClick={() => handleSubmitProfile(false)}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <LoadingSpinner size="sm" text="Creating Profile..." />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" /> Create & Activate Profile
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextPhase}
                    className="px-5 py-2 text-xs font-bold text-white bg-gov-700 hover:bg-gov-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>Save & Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Contractor Profile Activation Success Modal */}
      {createdProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-emerald-200 overflow-hidden space-y-0">
            <div className="bg-emerald-800 text-white p-6 text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-600/50 border border-emerald-400/40 rounded-full flex items-center justify-center mx-auto text-white shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-extrabold text-lg text-white tracking-tight">
                Contractor Profile Created and Activated Successfully.
              </h3>
              <p className="text-xs text-emerald-100">
                Official contractor transparency record active in database.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-semibold">Contractor Name:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{createdProfile.name}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-semibold">Contractor ID:</span>
                  <span className="font-mono font-extrabold text-gov-700 bg-gov-50 px-2.5 py-1 rounded border border-gov-200 text-xs">
                    {createdProfile.contractor_id}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-semibold">Profile Status:</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active
                  </span>
                </div>

                {createdProfile.company_name && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-semibold">Company / Firm:</span>
                    <span className="font-semibold text-slate-800">{createdProfile.company_name}</span>
                  </div>
                )}

                {createdProfile.contractor_reg_number && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-semibold">Government Reg #:</span>
                    <span className="font-mono font-semibold text-slate-800">{createdProfile.contractor_reg_number}</span>
                  </div>
                )}

                {createdProfile.mobile_number && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-semibold">Mobile Number:</span>
                    <span className="font-mono text-slate-800">{createdProfile.mobile_number}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-semibold">Registered Email:</span>
                  <span className="font-mono text-slate-800">{createdProfile.email}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Assigned Work Orders:</span>
                  <span className="font-bold text-gov-700">{createdProfile.contracts_count || 1} Work Orders Configured</span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900 leading-relaxed font-medium">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Confirmation: The contractor profile is permanently preserved and can now log in to the Contractor Portal with their registered credentials.
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCreateAnother}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Create Another Profile
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Executive Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/contractors')}
                    className="px-5 py-2.5 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    View in Directory
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

export default CreateContractorPage;
