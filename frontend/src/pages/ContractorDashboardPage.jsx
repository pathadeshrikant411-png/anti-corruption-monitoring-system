import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import ContractorAvatar from '../components/ContractorAvatar';
import {
  UserCheck, Building, FileText, Download, ShieldCheck, Lock,
  DollarSign, CheckCircle2, AlertCircle, KeyRound, Calendar
} from 'lucide-react';

const ContractorDashboardPage = () => {
  const { user, logout } = useAuth();
  const { currentPreset } = useTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Work Updates Form State
  const [selectedContractIdForUpdate, setSelectedContractIdForUpdate] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateProgressPercentage, setUpdateProgressPercentage] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('In Progress');
  const [updatePhotoFile, setUpdatePhotoFile] = useState(null);
  const [updateLocationAddress, setUpdateLocationAddress] = useState('');
  const [isSubmittingWorkUpdate, setIsSubmittingWorkUpdate] = useState(false);
  const [workUpdateMsg, setWorkUpdateMsg] = useState(null);

  // Password Change Modal State
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/contractor/dashboard');
      setDashboardData(response.data);
      if (response.data.contracts && response.data.contracts.length > 0) {
        if (!selectedContractIdForUpdate) {
          setSelectedContractIdForUpdate(response.data.contracts[0].id);
          setUpdateProgressPercentage(response.data.contracts[0].progress_percentage || 0);
          setUpdateStatus(response.data.contracts[0].status || 'In Progress');
        }
      }
      if (user?.must_change_password) {
        setMustChangePassword(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load contractor portal data.");
    } finally {
      setLoading(false);
    }
  };

  const handleWorkUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContractIdForUpdate || !updateTitle || !updateDescription || !workDate) return;

    setIsSubmittingWorkUpdate(true);
    setWorkUpdateMsg(null);

    const formData = new FormData();
    formData.append('work_date', workDate);
    formData.append('title', updateTitle.trim());
    formData.append('description', updateDescription.trim());
    formData.append('progress_percentage', updateProgressPercentage);
    formData.append('status', updateStatus);
    if (updateLocationAddress) formData.append('location_address', updateLocationAddress.trim());
    if (updatePhotoFile) formData.append('file', updatePhotoFile);

    try {
      await api.post(`/contractor/contracts/${selectedContractIdForUpdate}/work-updates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setWorkUpdateMsg({ type: 'success', text: `✅ Work update for date ${workDate} posted successfully!` });
      setUpdateTitle('');
      setUpdateDescription('');
      setUpdatePhotoFile(null);
      fetchDashboardData();
    } catch (err) {
      setWorkUpdateMsg({ type: 'error', text: err.response?.data?.detail || "Failed to post work update." });
    } finally {
      setIsSubmittingWorkUpdate(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters long.");
      return;
    }

    setIsChangingPw(true);
    setPwError(null);

    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      setPwSuccess("Password updated successfully! You may now access your portal.");
      setTimeout(() => {
        setMustChangePassword(false);
      }, 1200);
    } catch (err) {
      setPwError(err.response?.data?.detail || "Failed to change password. Please check your current password.");
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleDownloadDoc = async (docId, fileName, inline = false) => {
    try {
      const response = await api.get(`/contractor/documents/${docId}/download`, {
        params: { inline },
        responseType: 'blob',
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
      alert("Unable to access document file.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center">
        <LoadingSpinner size="lg" text="Loading Contractor Portal..." />
      </div>
    );
  }

  const contractor = dashboardData?.contractor;
  const contracts = dashboardData?.contracts || [];
  const documents = dashboardData?.documents || [];
  const finSum = dashboardData?.financial_summary;

  return (
    <div className={`min-h-screen ${currentPreset.bgMain} ${currentPreset.textMain} flex flex-col selection:bg-gov-600 selection:text-white transition-colors duration-300`}>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Contractor Portal Header Hero */}
        <div className={`${currentPreset.headerBg} rounded-2xl p-6 sm:p-8 text-white shadow-lg border ${currentPreset.border}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <ContractorAvatar
                photoPath={contractor?.photo_path}
                name={`${contractor?.first_name} ${contractor?.surname}`}
                size="xl"
              />
              <div>
                <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized Contractor Access Portal</span>
                </div>
                <h1 className="text-2xl font-extrabold text-white">
                  {contractor?.first_name} {contractor?.surname}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-1">
                  ID: {contractor?.contractor_id} | Reg #: {contractor?.contractor_reg_number}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Account Status: {contractor?.status}
              </span>
            </div>
          </div>
        </div>

        {error && <NotificationToast type="error" message={error} />}

        {/* Tab Navigation */}
        <div className={`flex overflow-x-auto whitespace-nowrap custom-scrollbar border ${currentPreset.border} ${currentPreset.bgCard} px-3 sm:px-4 rounded-xl shadow-sm gap-1 sm:gap-2`}>
          {[
            { id: 'profile', label: 'My Profile', icon: UserCheck },
            { id: 'contracts', label: `My Contracts (${contracts.length})`, icon: FileText },
            { id: 'updates', label: 'Update Work Progress & Logs', icon: Calendar },
            { id: 'documents', label: `My Documents (${documents.length})`, icon: Download },
            { id: 'financials', label: 'My Financial Summary', icon: DollarSign }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-gov-600 text-gov-600 dark:text-emerald-400 font-extrabold'
                    : `border-transparent ${currentPreset.textMuted} hover:text-white`
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MY PROFILE */}
        {activeTab === 'profile' && contractor && (
          <div className={`${currentPreset.bgCard} rounded-2xl p-6 border ${currentPreset.border} shadow-sm space-y-6`}>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-3">
              <UserCheck className="w-4 h-4 text-gov-600" /> Contractor Identity & Business Profile
            </h2>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <ContractorAvatar
                photoPath={contractor.photo_path}
                name={`${contractor.first_name} ${contractor.surname}`}
                size="2xl"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs flex-1 w-full">
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Full Name</p> <p className="font-bold text-slate-800 text-sm">{contractor.first_name} {contractor.fathers_name} {contractor.surname}</p></div>
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Contractor ID</p> <p className="font-mono font-bold text-gov-700">{contractor.contractor_id}</p></div>
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Registration Number</p> <p className="font-mono text-slate-800">{contractor.contractor_reg_number}</p></div>
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Registered Email</p> <p className="font-mono text-slate-800">{contractor.email}</p></div>
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Mobile Number</p> <p className="font-mono text-slate-800">{contractor.mobile_number}</p></div>
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Company Name</p> <p className="font-semibold text-slate-800">{contractor.company_name || 'Individual Firm'}</p></div>
                <div className="sm:col-span-2"><p className="text-slate-400 font-semibold uppercase text-[10px]">Business Address</p> <p className="text-slate-800">{contractor.business_address}, {contractor.district}, {contractor.state} - {contractor.pin_code}</p></div>
                <div><p className="text-slate-400 font-semibold uppercase text-[10px]">Account Status</p> <span className="font-bold text-emerald-700">{contractor.status}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY CONTRACTS */}
        {activeTab === 'contracts' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-3">Assigned Government Contracts</h2>
            {contracts.length === 0 ? (
              <p className="text-xs text-slate-400">No public contracts currently assigned to your account.</p>
            ) : (
              <div className="space-y-4">
                {contracts.map((cnt) => (
                  <div key={cnt.id} className="p-4 bg-slate-50 border rounded-xl space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center font-bold text-slate-900 border-b pb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gov-900 font-extrabold">{cnt.title}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                          {cnt.progress_percentage || 0}% Completed
                        </span>
                      </div>
                      <span className="font-mono text-gov-700">{cnt.contract_id}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                      <p><span className="text-slate-400">Department:</span> {cnt.department}</p>
                      <p><span className="text-slate-400">Location:</span> {cnt.location}, {cnt.district}</p>
                      <p><span className="text-slate-400">Status:</span> <span className="font-semibold text-emerald-700">{cnt.status}</span></p>
                      <p><span className="text-slate-400">Duration:</span> {cnt.start_date} to {cnt.end_date}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedContractIdForUpdate(cnt.id);
                          setUpdateProgressPercentage(cnt.progress_percentage || 0);
                          setUpdateStatus(cnt.status || 'In Progress');
                          setActiveTab('updates');
                        }}
                        className="px-3.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-lg font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> Update Work Progress & Log Date
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: UPDATE WORK PROGRESS & DATED LOGS */}
        {activeTab === 'updates' && (
          <div className="space-y-6">
            {/* Form to submit work update */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-gov-600" />
                  Post Work Progress Update with Date
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Log your daily or milestone progress updates with work date, physical completion percentage, and site photo proof.
                </p>
              </div>

              {workUpdateMsg && (
                <NotificationToast
                  type={workUpdateMsg.type}
                  message={workUpdateMsg.text}
                  onClose={() => setWorkUpdateMsg(null)}
                />
              )}

              {contracts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No government contracts currently assigned to your profile.</p>
              ) : (
                <form onSubmit={handleWorkUpdateSubmit} className="space-y-4 text-xs">
                  {/* Select Contract */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Select Assigned Contract / Project *</label>
                    <select
                      value={selectedContractIdForUpdate}
                      onChange={(e) => {
                        const cid = Number(e.target.value);
                        setSelectedContractIdForUpdate(cid);
                        const found = contracts.find(c => c.id === cid);
                        if (found) {
                          setUpdateProgressPercentage(found.progress_percentage || 0);
                          setUpdateStatus(found.status || 'In Progress');
                        }
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-gov-500"
                    >
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.contract_id}) • {c.progress_percentage}% Done
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Work Date */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Work Update Date *</label>
                      <input
                        type="date"
                        required
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-gov-500"
                      />
                    </div>

                    {/* Progress Percentage */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Physical Progress: <span className="text-gov-700 font-extrabold">{updateProgressPercentage}%</span> *</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={updateProgressPercentage}
                        onChange={(e) => setUpdateProgressPercentage(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-600 mt-2.5"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Contract Status */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Updated Contract Status *</label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-gov-500"
                      >
                        <option value="Awarded">Awarded</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Work Title / Milestone Name *</label>
                    <input
                      type="text"
                      required
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder="e.g. Sub-grade levelling & foundation pillar casting completed"
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-gov-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Work Description & Accomplishments *</label>
                    <textarea
                      required
                      rows={3}
                      value={updateDescription}
                      onChange={(e) => setUpdateDescription(e.target.value)}
                      placeholder="Provide detailed notes of construction activities, material usage, and tasks finished on this date..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gov-500"
                    />
                  </div>

                  {/* Site Photo & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Site Photo Proof (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setUpdatePhotoFile(e.target.files[0] || null)}
                        className="w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Site Location / Stretch Remarks (Optional)</label>
                      <input
                        type="text"
                        value={updateLocationAddress}
                        onChange={(e) => setUpdateLocationAddress(e.target.value)}
                        placeholder="e.g. Section KM 14 to KM 18 Stretch"
                        className="w-full p-2.5 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingWorkUpdate || !updateTitle || !updateDescription}
                      className="px-5 py-2.5 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingWorkUpdate ? (
                        <LoadingSpinner size="sm" text="Posting Work Update..." />
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 text-amber-400" /> Save Work Progress Update
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Work Updates Dated History */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b pb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gov-600" />
                Dated Work Progress Updates History
              </h3>

              {(() => {
                const activeContract = contracts.find(c => c.id === Number(selectedContractIdForUpdate)) || contracts[0];
                const workUpdates = activeContract?.work_updates || [];

                if (workUpdates.length === 0) {
                  return (
                    <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1 text-xs text-slate-500">
                      <p className="font-semibold">No work updates logged yet for {activeContract?.title || 'this contract'}.</p>
                      <p className="text-[11px] text-slate-400">Use the form above to log your first dated work update with progress proof.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {workUpdates.map((wu) => (
                      <div key={wu.id} className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 bg-gov-900 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" /> {wu.work_date}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900">{wu.title}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                              {wu.progress_percentage}% Completed
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              wu.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              wu.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {wu.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {wu.description}
                        </p>

                        {wu.photo_path && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Uploaded Site Photo:</span>
                            <img
                              src={wu.photo_path}
                              alt={`Work Proof ${wu.work_date}`}
                              className="h-40 object-cover rounded-lg border border-slate-300 shadow-sm cursor-pointer hover:opacity-95"
                              onClick={() => window.open(wu.photo_path, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: MY DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-3">Official Contract & Government Documents</h2>
            {documents.length === 0 ? (
              <p className="text-xs text-slate-400">No documents uploaded for your profile or assigned contracts.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{doc.document_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          doc.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                          doc.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.verification_status}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">Type:</span> {doc.document_type} | <span className="font-semibold text-slate-700">Uploaded By:</span> {doc.uploaded_by} ({new Date(doc.uploaded_at).toLocaleDateString()})
                      </p>
                      {doc.description && (
                        <p className="text-slate-500 italic text-[11px]">
                          Remarks: {doc.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleDownloadDoc(doc.id, doc.document_name, true)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        Preview / View
                      </button>
                      <button
                        onClick={() => handleDownloadDoc(doc.id, doc.document_name, false)}
                        className="px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY FINANCIAL SUMMARY */}
        {activeTab === 'financials' && finSum && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gov-600" /> Read-Only Financial Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-emerald-800 font-bold uppercase text-[10px]">Total Sanctioned Project Amount</p>
                <p className="text-xl font-extrabold text-emerald-900 mt-1">₹{finSum.total_sanctioned_amount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-800 font-bold uppercase text-[10px]">Total Contract Value</p>
                <p className="text-xl font-extrabold text-blue-900 mt-1">₹{finSum.total_contract_value.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-800 font-bold uppercase text-[10px]">Total Funds Released</p>
                <p className="text-xl font-extrabold text-amber-900 mt-1">₹{finSum.total_funds_released.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700 pt-2 border-t">
              <div className="p-3 bg-slate-50 border rounded-lg flex justify-between">
                <span>Total Payments Made to Date:</span>
                <span className="font-mono text-slate-900">₹{finSum.total_payments_made.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg flex justify-between">
                <span>Remaining Released Funds:</span>
                <span className="font-mono text-slate-900">₹{finSum.remaining_released_funds.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg flex justify-between">
                <span>Unreleased Sanctioned Funds:</span>
                <span className="font-mono text-slate-900">₹{finSum.unreleased_sanctioned_funds.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg flex justify-between">
                <span>Pending Payment Amount:</span>
                <span className="font-mono text-gov-800">₹{finSum.pending_payment_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mandatory Change Password Modal */}
      {mustChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-gov-900 text-white p-4 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm">Mandatory Password Update Required</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are logging in with an administrative temporary password. For security, you must update your password before proceeding.
              </p>

              {pwError && <NotificationToast type="error" message={pwError} />}
              {pwSuccess && <NotificationToast type="success" message={pwSuccess} />}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Permanent Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gov-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPw}
                  className="w-full py-2.5 bg-gov-800 hover:bg-gov-900 text-white font-bold text-xs rounded-lg shadow transition-colors flex justify-center"
                >
                  {isChangingPw ? <LoadingSpinner size="sm" text="Updating Password..." /> : 'Update & Continue to Portal'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorDashboardPage;
