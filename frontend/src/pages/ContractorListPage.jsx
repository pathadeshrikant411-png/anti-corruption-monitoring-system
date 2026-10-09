import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import ContractorAvatar from '../components/ContractorAvatar';
import {
  Users, Search, Filter, Plus, Eye, Edit3, CheckCircle, XCircle,
  Building, Phone, Mail, FileText, DollarSign, X, ShieldCheck, Download,
  Upload, RefreshCw, AlertCircle, MapPin, Calendar, Tag, QrCode, Printer, Trash2, Camera
} from 'lucide-react';

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

const ContractorListPage = () => {
  const { currentPreset } = useTheme();
  const navigate = useNavigate();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Details Modal State
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Network LAN IP & Public Web Domain for mobile QR scanning
  const [lanIp, setLanIp] = useState('');
  const [qrBaseUrl, setQrBaseUrl] = useState('');
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [domainSaveMessage, setDomainSaveMessage] = useState('');
  const [showDomainConfig, setShowDomainConfig] = useState(false);

  const fetchNetworkSettings = () => {
    api.get('/public/network-info')
      .then(res => {
        if (res.data) {
          if (res.data.lan_ip) setLanIp(res.data.lan_ip);
          if (res.data.qr_base_url) {
            setQrBaseUrl(res.data.qr_base_url);
            setCustomDomainInput(res.data.qr_base_url);
          }
          if (res.data.is_custom_domain) setIsCustomDomain(res.data.is_custom_domain);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNetworkSettings();
  }, []);

  const DEFAULT_PUBLIC_APP_URL = "https://company-frays-establish.ngrok-free.dev";

  const getQrUrl = (qrToken) => {
    let baseUrl = qrBaseUrl && qrBaseUrl.trim() ? qrBaseUrl.trim() : DEFAULT_PUBLIC_APP_URL;
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('10.') || baseUrl.includes('192.168.') || baseUrl.includes('172.')) {
      baseUrl = DEFAULT_PUBLIC_APP_URL;
    }
    return `${baseUrl.replace(/\/$/, '')}/public/project/${qrToken}`;
  };

  const handleRegenerateQrToken = async (contractId) => {
    if (!window.confirm("Are you sure you want to regenerate this contract's QR code token?")) return;
    try {
      const res = await api.post(`/contractors/contracts/${contractId}/regenerate-qr`);
      alert(`✅ QR code token regenerated successfully! New Token: ${res.data.qr_code_token}`);
      fetchContractors();
      fetchNetworkSettings();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to regenerate QR code token.");
    }
  };

  const handleSavePublicDomain = async (e) => {
    e.preventDefault();
    setIsSavingDomain(true);
    setDomainSaveMessage('');
    try {
      const res = await api.put('/contractors/settings/public-url', { public_url: customDomainInput });
      setQrBaseUrl(res.data.active_public_url);
      setDomainSaveMessage("Public Web Domain updated successfully!");
      fetchNetworkSettings();
    } catch (err) {
      alert("Failed to save public domain setting.");
    } finally {
      setIsSavingDomain(false);
    }
  };

  // QR Code Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedContractorForQr, setSelectedContractorForQr] = useState(null);
  const [activeContractIndexForQr, setActiveContractIndexForQr] = useState(0);

  // Upload & Document Management State
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocType, setUploadDocType] = useState(OFFICIAL_DOC_TYPES[0]);
  const [uploadContractId, setUploadContractId] = useState('');
  const [uploadDocDesc, setUploadDocDesc] = useState('');
  const [uploadDocVerStatus, setUploadDocVerStatus] = useState('Verified');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Photo Upload State for Modal
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  const handleUploadPhotoInModal = async (e, contractorId) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setToastMessage({ type: 'error', text: 'Invalid photo format. Only JPG, JPEG, PNG, and WEBP images are allowed.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setToastMessage({ type: 'error', text: 'Photo file size exceeds 10 MB limit.' });
      return;
    }

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/contractors/${contractorId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedContractor(res.data);
      setToastMessage({ type: 'success', text: 'Contractor profile photo updated and saved successfully!' });
      fetchContractors();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to upload contractor photo.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhotoInModal = async (contractorId) => {
    if (!window.confirm("Are you sure you want to remove this contractor's official profile photo?")) return;
    setIsUploadingPhoto(true);
    try {
      const res = await api.delete(`/contractors/${contractorId}/photo`);
      setSelectedContractor(res.data);
      setToastMessage({ type: 'success', text: 'Contractor profile photo removed successfully.' });
      fetchContractors();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to remove photo.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const fetchContractors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/contractors', { params });
      setContractors(response.data);

      if (selectedContractor) {
        const updated = response.data.find(c => c.id === selectedContractor.id);
        if (updated) setSelectedContractor(updated);
      }
      if (selectedContractorForQr) {
        const updatedQr = response.data.find(c => c.id === selectedContractorForQr.id);
        if (updatedQr) setSelectedContractorForQr(updatedQr);
      }
    } catch (err) {
      setError("Failed to fetch contractor list from government database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, [search, statusFilter]);

  const handleToggleStatus = async (contractorId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/contractors/${contractorId}/status`, { status: newStatus });
      fetchContractors();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleUploadDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!uploadDocName || !selectedFile || !selectedContractor) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document_name', uploadDocName);
    formData.append('document_type', uploadDocType);
    if (uploadContractId) formData.append('contract_id', uploadContractId);
    if (uploadDocDesc) formData.append('description', uploadDocDesc);
    formData.append('verification_status', uploadDocVerStatus);
    formData.append('file', selectedFile);

    try {
      await api.post(`/contractors/${selectedContractor.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadDocName('');
      setUploadDocDesc('');
      setSelectedFile(null);
      fetchContractors();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to upload document file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to permanently delete document '${docName}'?`)) return;

    try {
      await api.delete(`/contractors/documents/${docId}`);
      fetchContractors();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete document file.");
    }
  };

  const handleVerifyDocument = async (docId, newStatus) => {
    const remarks = window.prompt(`Enter verification remarks for setting status to ${newStatus}:`, `Verified by Admin on ${new Date().toLocaleDateString()}`);
    if (remarks === null) return;

    try {
      await api.put(`/contractors/documents/${docId}/verify`, {
        verification_status: newStatus,
        verification_remarks: remarks
      });
      fetchContractors();
    } catch (err) {
      alert("Failed to update verification status.");
    }
  };

  const handleDownloadDoc = async (docId, fileName, inline = false) => {
    try {
      const response = await api.get(`/contractors/documents/${docId}/download`, {
        params: { inline },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      if (inline) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      alert("Failed to access document file.");
    }
  };

  const handleRegenerateQR = async (contractId, contractTitle) => {
    if (!window.confirm(`Are you sure you want to regenerate the QR Code for '${contractTitle}'? The existing QR token will be invalidated.`)) return;

    try {
      await api.post(`/contractors/contracts/${contractId}/regenerate-qr`);
      fetchContractors();
    } catch (err) {
      alert("Failed to regenerate QR code token.");
    }
  };

  const handleDownloadQRImage = async (qrToken, contractTitle) => {
    try {
      const response = await api.get(`/public/contracts/${qrToken}/qr-image`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_${contractTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download QR code image.");
    }
  };

  const handlePrintQR = (contract, contractorName) => {
    const printWindow = window.open('', '_blank');
    const qrToken = contract.qr_code_token || contract.contract_id;
    const publicPageUrl = getQrUrl(qrToken);

    // Get rendered SVG element from DOM
    const svgElement = document.getElementById(`qr-code-svg-${contract.id}`);
    let qrImageUrl = `/api/public/contracts/${qrToken}/qr-image?target_url=${encodeURIComponent(publicPageUrl)}`;

    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      qrImageUrl = URL.createObjectURL(svgBlob);
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Government Project QR Code - ${contract.title}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 20px; text-align: center; }
            .poster { border: 4px solid #1e3a8a; border-radius: 20px; padding: 30px; max-width: 520px; margin: 0 auto; background: #ffffff; }
            .gov-badge { background: #1e3a8a; color: #ffffff; padding: 8px 20px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; line-height: 1.3; }
            .dept { font-size: 14px; color: #475569; font-weight: 700; margin-bottom: 20px; }
            .qr-box { background: #f8fafc; border: 3px dashed #cbd5e1; border-radius: 16px; padding: 24px; display: inline-block; margin: 15px 0; }
            .qr-box img { width: 240px; height: 240px; display: block; margin: 0 auto; }
            .instruction { font-size: 14px; font-weight: 800; color: #059669; margin: 10px 0 20px 0; letter-spacing: 0.3px; }
            .info-grid { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left; font-size: 13px; }
            .info-grid td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            .info-grid td.label { font-weight: 700; color: #64748b; width: 38%; }
            .info-grid td.value { font-weight: 700; color: #0f172a; }
            .footer { margin-top: 25px; font-size: 11px; color: #64748b; border-top: 2px solid #e2e8f0; padding-top: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="poster">
            <div class="gov-badge">Official Government Transparency Notice</div>
            <h1 class="title">${contract.title}</h1>
            <div class="dept">${contract.department} • ${contract.office_name || ''}</div>
            
            <div class="qr-box">
              <img src="${qrImageUrl}" alt="Official Contract QR Code" />
            </div>

            <div class="instruction">SCAN QR CODE WITH MOBILE CAMERA TO VIEW PUBLIC WORK DETAILS</div>

            <table class="info-grid">
              <tr><td class="label">Contract ID:</td><td class="value">${contract.contract_id}</td></tr>
              <tr><td class="label">Contractor Name:</td><td class="value">${contractorName}</td></tr>
              <tr><td class="label">Project Location:</td><td class="value">${contract.contract_address || contract.location}, ${contract.district}</td></tr>
              <tr><td class="label">Sanctioned Amount:</td><td class="value">₹${(contract.financials?.sanctioned_amount || 0).toLocaleString()}</td></tr>
              <tr><td class="label">Project Status:</td><td class="value">${contract.status} (${contract.progress_percentage || 0}% Completed)</td></tr>
            </table>

            <div class="footer">Public Works Department • Anti-Corruption Monitoring Portal</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`min-h-screen ${currentPreset.bgMain} ${currentPreset.textMain} flex flex-col transition-colors duration-300`}>
      <Navbar />

      {toastMessage && (
        <NotificationToast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-w-0 w-full">
        <AdminSidebar />

        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Banner */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${currentPreset.bgCard} p-5 sm:p-6 rounded-2xl border ${currentPreset.border} shadow-sm w-full`}>
            <div className="flex-1 min-w-0 space-y-1">
              <h1 className={`text-lg sm:text-xl font-extrabold ${currentPreset.textMain} tracking-tight flex items-center gap-2`}>
                <Users className="w-5 h-5 text-gov-600 shrink-0" />
                <span className="truncate">Registered Contractor Directory</span>
              </h1>
              <p className={`text-xs ${currentPreset.textMuted}`}>
                Manage contractor profiles, assigned work locations, financials & official documents.
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/contractors/create')}
              className="px-4 py-2.5 text-xs font-extrabold text-white bg-gov-700 hover:bg-gov-800 active:bg-gov-900 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap self-start sm:self-auto cursor-pointer border border-gov-600/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Contractor Profile</span>
            </button>
          </div>

          {/* Search & Filter Control Bar */}
          <div className={`${currentPreset.bgCard} rounded-xl p-4 border ${currentPreset.border} shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between`}>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contractor name, ID, email, reg #..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-700 bg-slate-900/80 text-white rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className={`text-xs font-semibold ${currentPreset.textMuted}`}>Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-700 bg-slate-900 text-white rounded-lg focus:ring-2 focus:ring-gov-500 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {error && <NotificationToast type="error" message={error} />}

          {/* Data Table */}
          <div className={`${currentPreset.bgCard} rounded-2xl border ${currentPreset.border} shadow-sm overflow-hidden`}>
            {loading ? (
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" text="Loading Contractor Directory..." />
              </div>
            ) : contractors.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold">No Contractor Profiles Found</p>
                <p className="text-xs text-slate-400">Try refining your search terms or create a new profile.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Contractor ID</th>
                      <th className="py-3 px-4">Contractor Name</th>
                      <th className="py-3 px-4">Company / Firm</th>
                      <th className="py-3 px-4">Reg Number</th>
                      <th className="py-3 px-4">Email & Mobile</th>
                      <th className="py-3 px-4 text-center">Assigned Works</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {contractors.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold">
                          <button
                            onClick={() => { setSelectedContractor(c); setIsModalOpen(true); }}
                            className="text-gov-700 hover:text-blue-900 hover:underline transition-all text-left font-bold focus:outline-none flex items-center gap-1 cursor-pointer"
                            title="Click to view complete contractor details"
                          >
                            <span>{c.contractor_id}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="relative group shrink-0">
                              <ContractorAvatar photoPath={c.photo_path} name={`${c.first_name} ${c.surname}`} size="md" />
                              <label
                                className="absolute -bottom-1 -right-1 bg-gov-700 hover:bg-gov-800 text-white p-1 rounded-full shadow-md cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                                title="Click to Upload / Change Official Contractor Photo"
                              >
                                <Camera className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={(e) => handleUploadPhotoInModal(e, c.id)}
                                  disabled={isUploadingPhoto}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <button
                              onClick={() => { setSelectedContractor(c); setIsModalOpen(true); }}
                              className="hover:text-gov-700 hover:underline transition-all text-left font-bold focus:outline-none cursor-pointer"
                              title="Click to view complete contractor details"
                            >
                              <span>{c.first_name} {c.surname}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">{c.company_name || 'Individual'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{c.contractor_reg_number}</td>
                        <td className="py-3 px-4">
                          <p className="text-slate-800">{c.email}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{c.mobile_number}</p>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px]">
                            {c.contracts?.length || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              c.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'Draft'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details Button */}
                            <button
                              onClick={() => { setSelectedContractor(c); setIsModalOpen(true); }}
                              className="px-2.5 py-1.5 text-xs bg-gov-700 hover:bg-gov-800 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-1"
                              title="View Complete Contractor Profile & Works"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </button>

                            {/* QR Code Button */}
                            <button
                              onClick={() => {
                                setSelectedContractorForQr(c);
                                setActiveContractIndexForQr(0);
                                setIsQrModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-1"
                              title="View & Download Contract QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" /> QR Code
                            </button>

                            {/* Account Status Toggle */}
                            <button
                              onClick={() => handleToggleStatus(c.id, c.status)}
                              className={`p-1.5 rounded-lg transition-colors border ${
                                c.status === 'Active'
                                  ? 'text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100'
                                  : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={c.status === 'Active' ? 'Deactivate Contractor Account' : 'Activate Contractor Account'}
                            >
                              {c.status === 'Active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 1. Complete Contractor View Details Modal */}
      {isModalOpen && selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-20 shadow">
              <div className="flex items-center space-x-3">
                <ContractorAvatar
                  photoPath={selectedContractor.photo_path}
                  name={`${selectedContractor.first_name} ${selectedContractor.surname}`}
                  size="lg"
                />
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>{selectedContractor.first_name} {selectedContractor.surname}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedContractor.contractor_id} | Reg #: {selectedContractor.contractor_reg_number}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700">
              {/* Profile Overview Card with Photo Admin Controls */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <ContractorAvatar
                      photoPath={selectedContractor.photo_path}
                      name={`${selectedContractor.first_name} ${selectedContractor.surname}`}
                      size="xl"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{selectedContractor.first_name} {selectedContractor.surname}</h4>
                      <p className="text-slate-500 font-mono text-[11px]">{selectedContractor.company_name || 'Individual Contractor'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-lg font-bold text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{selectedContractor.photo_path ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleUploadPhotoInModal(e, selectedContractor.id)}
                        disabled={isUploadingPhoto}
                        className="hidden"
                      />
                    </label>
                    {selectedContractor.photo_path && (
                      <button
                        onClick={() => handleRemovePhotoInModal(selectedContractor.id)}
                        disabled={isUploadingPhoto}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><span className="text-slate-400 block font-semibold uppercase text-[10px]">Email Address</span> <span className="font-mono text-slate-900">{selectedContractor.email}</span></div>
                  <div><span className="text-slate-400 block font-semibold uppercase text-[10px]">Mobile Number</span> <span className="font-mono text-slate-900">{selectedContractor.mobile_number}</span></div>
                  <div><span className="text-slate-400 block font-semibold uppercase text-[10px]">Company / Firm</span> <span className="font-semibold">{selectedContractor.company_name || 'Individual Firm'}</span></div>
                  <div><span className="text-slate-400 block font-semibold uppercase text-[10px]">Business Address</span> {selectedContractor.business_address}, {selectedContractor.district}, {selectedContractor.state} - {selectedContractor.pin_code}</div>
                </div>
              </div>

              {/* Assigned Government Work Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5 border-b pb-2">
                  <FileText className="w-4 h-4 text-gov-600" />
                  Assigned Government Works & Contract Details ({selectedContractor.contracts?.length || 0})
                </h4>

                {selectedContractor.contracts?.length === 0 ? (
                  <p className="text-slate-400 italic">No government work contracts assigned yet.</p>
                ) : (
                  selectedContractor.contracts.map((cnt) => (
                    <div key={cnt.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-100 text-gov-800">
                              {cnt.contract_type}
                            </span>
                            <h5 className="font-bold text-sm text-slate-900">{cnt.title}</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cnt.department} | Office: {cnt.office_name}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                          {cnt.status}
                        </span>
                      </div>

                      {/* Location & Address Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-200 text-slate-700">
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gov-600" /> Project Address / Location
                          </span>
                          <span className="font-medium">{cnt.contract_address || cnt.location}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">District & State</span>
                          <span className="font-medium">{cnt.district}, {cnt.state} - {cnt.pin_code}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-600" /> Contract Timeline
                          </span>
                          <span>{cnt.start_date} to {cnt.end_date}</span>
                        </div>
                      </div>

                      {/* Financial Specs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                          <span className="text-blue-800 text-[10px] block font-sans font-bold">Contract Amount</span>
                          <span className="font-extrabold text-blue-900">₹{(cnt.financials?.revised_contract_value || cnt.financials?.contract_value || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                          <span className="text-emerald-800 text-[10px] block font-sans font-bold">Sanctioned Amount</span>
                          <span className="font-extrabold text-emerald-900">₹{(cnt.financials?.sanctioned_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-slate-100 border rounded">
                          <span className="text-slate-600 text-[10px] block font-sans font-bold">Tender / Work Order</span>
                          <span>{cnt.tender_number} / {cnt.work_order_number}</span>
                        </div>
                        <div className="p-2 bg-slate-100 border rounded">
                          <span className="text-slate-600 text-[10px] block font-sans font-bold">Agreement #</span>
                          <span>{cnt.agreement_number}</span>
                        </div>
                      </div>

                      {/* Responsibilities */}
                      <div className="text-slate-600">
                        <span className="font-bold text-slate-800 block mb-0.5">Work Description & Responsibilities:</span>
                        <p className="bg-white p-2.5 rounded border border-slate-200 leading-relaxed">{cnt.responsibilities}</p>
                      </div>

                      {/* Public QR Code Card */}
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <QRCodeSVG
                              value={getQrUrl(cnt.qr_code_token || cnt.contract_id)}
                              size={72}
                              level="M"
                            />
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <span className="font-bold text-emerald-900 flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5 text-emerald-700" /> Public Work QR Code
                            </span>
                            <p className="text-[11px] text-slate-600">Scan to open public view-only contract details page</p>
                            <p className="text-[10px] text-slate-400 font-mono">Token: {cnt.qr_code_token || cnt.contract_id}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => window.open(`/public/project/${cnt.qr_code_token || cnt.contract_id}`, '_blank')}
                            className="px-2.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" /> View Public Page
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadQRImage(cnt.qr_code_token || cnt.contract_id, cnt.title)}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3" /> Download PNG
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintQR(cnt, `${selectedContractor.first_name} ${selectedContractor.surname}`)}
                            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Printer className="w-3 h-3" /> Print QR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateQR(cnt.id, cnt.title)}
                            className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Regenerate QR Code Token"
                          >
                            <RefreshCw className="w-3 h-3" /> Regenerate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Official Document Upload & Verification Section */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-gov-600" />
                  Official Government Document Upload & Verification
                </h4>

                {/* Upload Form */}
                <form onSubmit={handleUploadDocumentSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Category *</label>
                      <select
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs"
                      >
                        {OFFICIAL_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Related Contract / Project</label>
                      <select
                        value={uploadContractId}
                        onChange={(e) => setUploadContractId(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs"
                      >
                        <option value="">Contractor Level (General Certificate)</option>
                        {selectedContractor.contracts?.map(c => (
                          <option key={c.id} value={c.id}>{c.title} ({c.contract_id})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Name *</label>
                      <input
                        type="text"
                        required
                        value={uploadDocName}
                        onChange={(e) => setUploadDocName(e.target.value)}
                        placeholder="e.g. Technical Sanction Approval Copy"
                        className="w-full p-2 border rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Verification Status</label>
                      <select
                        value={uploadDocVerStatus}
                        onChange={(e) => setUploadDocVerStatus(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs"
                      >
                        <option value="Verified">Verified</option>
                        <option value="Pending Verification">Pending Verification</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description / Remarks</label>
                      <input
                        type="text"
                        value={uploadDocDesc}
                        onChange={(e) => setUploadDocDesc(e.target.value)}
                        placeholder="Optional remarks or document details"
                        className="w-full p-2 border rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select File (PDF, JPG, PNG, DOC, DOCX) *</label>
                      <input
                        type="file"
                        required
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isUploading || !selectedFile || !uploadDocName}
                      className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-lg shadow transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isUploading ? <LoadingSpinner size="sm" text="Uploading..." /> : <><Upload className="w-3.5 h-3.5" /> Upload Document</>}
                    </button>
                  </div>
                </form>

                {/* Documents Table */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  {selectedContractor.documents?.length === 0 ? (
                    <p className="p-4 text-slate-400 italic">No official documents attached to this contractor yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[550px]">
                      <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Document Name & Code</th>
                          <th className="py-2.5 px-3">Type / Project</th>
                          <th className="py-2.5 px-3">Uploaded By</th>
                          <th className="py-2.5 px-3">Status & Remarks</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedContractor.documents.map((doc) => {
                          const relatedContract = selectedContractor.contracts?.find(c => c.id === doc.contract_id);

                          return (
                            <tr key={doc.id}>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">{doc.document_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{doc.doc_id}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <span className="font-semibold block">{doc.document_type}</span>
                                <span className="text-[10px] text-slate-400">
                                  {relatedContract ? `Project: ${relatedContract.title}` : 'General Contractor Cert'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {doc.uploaded_by}
                                <span className="text-[10px] block text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  doc.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                                  doc.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {doc.verification_status}
                                </span>
                                {doc.description && <span className="block text-[10px] text-slate-500 italic mt-0.5">{doc.description}</span>}
                                {doc.verification_remarks && <span className="block text-[10px] text-slate-400 mt-0.5">Remark: {doc.verification_remarks}</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1">
                                <button
                                  onClick={() => handleDownloadDoc(doc.id, doc.document_name, true)}
                                  className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                  title="View / Preview File Inline"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadDoc(doc.id, doc.document_name, false)}
                                  className="p-1 text-gov-700 hover:bg-gov-50 rounded"
                                  title="Download File Attachment"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleVerifyDocument(doc.id, doc.verification_status === 'Verified' ? 'Rejected' : 'Verified')}
                                  className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                  title="Update Verification Status"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id, doc.document_name)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Contract QR Code Management Modal */}
      {isQrModalOpen && selectedContractorForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                <div className="bg-emerald-600 p-2 rounded-xl text-white shrink-0 shadow-sm">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base text-white truncate">Contract QR Code Manager</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    Contractor: {selectedContractorForQr.first_name} {selectedContractorForQr.surname} ({selectedContractorForQr.contractor_id})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {selectedContractorForQr.contracts?.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-800">No Government Contracts Assigned</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    This contractor does not have any assigned government contracts yet. Please assign a contract to generate a unique QR code.
                  </p>
                </div>
              ) : (
                (() => {
                  const currentContract = selectedContractorForQr.contracts[activeContractIndexForQr] || selectedContractorForQr.contracts[0];
                  const qrToken = currentContract.qr_code_token || currentContract.contract_id;
                  const publicPageUrl = getQrUrl(qrToken);

                  return (
                    <div className="space-y-4">
                      {/* Dropdown if contractor has multiple contracts */}
                      {selectedContractorForQr.contracts.length > 1 && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Select Contract / Project:
                          </label>
                          <select
                            value={activeContractIndexForQr}
                            onChange={(e) => setActiveContractIndexForQr(Number(e.target.value))}
                            className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gov-500"
                          >
                            {selectedContractorForQr.contracts.map((cnt, idx) => (
                              <option key={cnt.id} value={idx}>
                                {cnt.title} ({cnt.contract_id})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Public Domain Settings Box */}
                      <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2 border border-slate-800 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center space-x-2 text-xs min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                            <span className="font-bold text-slate-200 shrink-0">Public QR Base URL:</span>
                            <span className="font-mono text-[11px] text-emerald-400 bg-slate-800 px-2 py-0.5 rounded truncate max-w-[220px]">
                              {qrBaseUrl || `http://${lanIp}:5173`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDomainConfig(!showDomainConfig)}
                            className="text-[10px] font-bold text-gov-300 hover:text-white underline cursor-pointer self-end sm:self-auto shrink-0"
                          >
                            {showDomainConfig ? 'Hide Config' : 'Change Domain / Tunnel URL'}
                          </button>
                        </div>

                        {showDomainConfig && (
                          <form onSubmit={handleSavePublicDomain} className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                            <p className="text-[11px] text-slate-400">
                              Set your deployed domain (e.g., <code className="text-emerald-300 font-mono">https://transparency.gov.in</code>) or local tunnel URL for mobile testing on different networks.
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customDomainInput}
                                onChange={(e) => setCustomDomainInput(e.target.value)}
                                placeholder="https://your-public-domain.com"
                                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-gov-500"
                              />
                              <button
                                type="submit"
                                disabled={isSavingDomain}
                                className="px-3 py-1.5 bg-gov-600 hover:bg-gov-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50"
                              >
                                {isSavingDomain ? 'Saving...' : 'Save Domain'}
                              </button>
                            </div>
                            {domainSaveMessage && <p className="text-[11px] text-emerald-400 font-bold">{domainSaveMessage}</p>}
                          </form>
                        )}
                      </div>

                      {/* Main QR Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-4 shadow-sm">
                        <div className="space-y-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gov-100 text-gov-800 uppercase">
                            {currentContract.contract_type} • {currentContract.department}
                          </span>
                          <h4 className="font-extrabold text-base text-slate-900 mt-1">
                            {currentContract.title}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono">
                            Contract ID: <span className="font-bold text-gov-700">{currentContract.contract_id}</span>
                          </p>
                        </div>

                        {/* Rendered SVG QR Code */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 inline-block shadow-md">
                          <QRCodeSVG
                            id={`qr-code-svg-${currentContract.id}`}
                            value={publicPageUrl}
                            size={180}
                            level="H"
                            includeMargin={true}
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified View-Only Public Transparency Record
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Scan with any smartphone camera to view public work details without login.
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            QR Token: {qrToken}
                          </p>
                        </div>

                        {/* QR Code Action Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => window.open(publicPageUrl, '_blank')}
                            className="px-2.5 py-2 bg-gov-700 hover:bg-gov-800 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 shadow transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Page
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadQRImage(qrToken, currentContract.title)}
                            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 shadow transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download PNG
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintQR(currentContract, `${selectedContractorForQr.first_name} ${selectedContractorForQr.surname}`)}
                            className="px-2.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 shadow transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print QR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateQR(currentContract.id, currentContract.title)}
                            className="px-2.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 shadow transition-colors cursor-pointer"
                            title="Regenerate unique QR code token"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorListPage;
