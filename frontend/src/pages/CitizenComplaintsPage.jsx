import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import {
  AlertTriangle, Search, Filter, RefreshCw, Eye, CheckCircle2,
  Clock, MapPin, Camera, ExternalLink, MessageSquare, ShieldCheck, X, Building
} from 'lucide-react';

const STATUS_OPTIONS = [
  "New",
  "Under Review",
  "Verified",
  "Action Taken",
  "Resolved",
  "Rejected"
];

import { useTheme } from '../context/ThemeContext';

const CitizenComplaintsPage = () => {
  const { currentPreset } = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Selected Complaint for Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Status Update State inside Modal
  const [newStatus, setNewStatus] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Image Preview Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  const fetchComplaints = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/contractors/complaints', { params });
      setComplaints(response.data);

      if (selectedComplaint) {
        const updated = response.data.find(c => c.complaint_id === selectedComplaint.complaint_id);
        if (updated) {
          setSelectedComplaint(updated);
        }
      }
    } catch (err) {
      setError("Failed to fetch real-time complaints feed.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial & Filter Load
  useEffect(() => {
    fetchComplaints(true);
  }, [search, statusFilter]);

  const handleOpenModal = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setAdminRemarks(complaint.admin_remarks || '');
    setUpdateSuccess('');
    setIsModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setIsUpdatingStatus(true);
    setUpdateSuccess('');
    try {
      const response = await api.put(`/contractors/complaints/${selectedComplaint.complaint_id}/status`, {
        status: newStatus,
        admin_remarks: adminRemarks
      });
      setSelectedComplaint(response.data);
      setUpdateSuccess(`Complaint status updated to '${newStatus}'.`);
      fetchComplaints(false);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update complaint status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Summary Metrics
  const totalCount = complaints.length;
  const newCount = complaints.filter(c => c.status === 'New').length;
  const underReviewCount = complaints.filter(c => c.status === 'Under Review' || c.status === 'Verified').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Action Taken').length;

  return (
    <div className={`min-h-screen ${currentPreset.bgMain} ${currentPreset.textMain} flex flex-col transition-colors duration-300`}>
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row min-w-0 w-full">
        <AdminSidebar />

        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Banner */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${currentPreset.bgCard} p-5 sm:p-6 rounded-2xl border ${currentPreset.border} shadow-sm w-full`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className={`text-lg sm:text-xl font-extrabold ${currentPreset.textMain} tracking-tight flex items-center gap-2`}>
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Citizen Complaints & Real-Time Project Oversight</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Real-Time Feed
                </span>
              </div>
              <p className={`text-xs ${currentPreset.textMuted}`}>
                Monitor citizen reports, photo evidence, and live GPS locations submitted from project QR codes in real time.
              </p>
            </div>

            <button
              onClick={() => fetchComplaints(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-gov-700 hover:bg-gov-800 rounded-xl transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer border border-gov-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Now</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`${currentPreset.bgCard} p-4 rounded-xl border ${currentPreset.border} shadow-sm space-y-1`}>
              <span className={`text-[10px] font-bold uppercase ${currentPreset.textMuted}`}>Total Reports</span>
              <p className={`text-2xl font-black ${currentPreset.textMain}`}>{totalCount}</p>
            </div>
            <div className={`${currentPreset.bgCard} p-4 rounded-xl border border-rose-500/30 shadow-sm space-y-1 bg-rose-500/10`}>
              <span className="text-rose-400 text-[10px] font-bold uppercase">New Unreviewed</span>
              <p className="text-2xl font-black text-rose-500">{newCount}</p>
            </div>
            <div className={`${currentPreset.bgCard} p-4 rounded-xl border border-amber-500/30 shadow-sm space-y-1 bg-amber-500/10`}>
              <span className="text-amber-400 text-[10px] font-bold uppercase">Under Investigation</span>
              <p className="text-2xl font-black text-amber-500">{underReviewCount}</p>
            </div>
            <div className={`${currentPreset.bgCard} p-4 rounded-xl border border-emerald-500/30 shadow-sm space-y-1 bg-emerald-500/10`}>
              <span className="text-emerald-400 text-[10px] font-bold uppercase">Action Taken / Resolved</span>
              <p className="text-2xl font-black text-emerald-500">{resolvedCount}</p>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className={`${currentPreset.bgCard} rounded-xl p-4 border ${currentPreset.border} shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between`}>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search complaint ID, category, contract, citizen name..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-700 bg-slate-900/80 text-white rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className={`text-xs font-semibold ${currentPreset.textMuted}`}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-700 bg-slate-900 text-white rounded-lg focus:ring-2 focus:ring-gov-500 font-medium"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          {error && <NotificationToast type="error" message={error} />}

          {/* Data Table */}
          <div className={`${currentPreset.bgCard} rounded-2xl border ${currentPreset.border} shadow-sm overflow-hidden`}>
            {loading ? (
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" text="Loading Citizen Complaints Feed..." />
              </div>
            ) : complaints.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold">No Citizen Complaints Found</p>
                <p className="text-xs text-slate-400">There are currently no citizen issues reported matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Complaint ID</th>
                      <th className="py-3 px-4">Related Contract / Project</th>
                      <th className="py-3 px-4">Issue Category</th>
                      <th className="py-3 px-4 text-center">Photo Evidence</th>
                      <th className="py-3 px-4 text-center">GPS Location</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {complaints.map((comp) => (
                      <tr key={comp.id} className={`hover:bg-slate-50/80 transition-colors ${comp.status === 'New' ? 'bg-amber-50/20' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-gov-800">
                          <button
                            onClick={() => handleOpenModal(comp)}
                            className="hover:underline text-left"
                          >
                            {comp.complaint_id}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{comp.contract_title}</span>
                          <span className="text-[10px] font-mono text-slate-400">ID: {comp.contract_code} • {comp.department}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            {comp.issue_category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {comp.photo_path ? (
                            <button
                              onClick={() => setPreviewPhotoUrl(comp.photo_path)}
                              className="px-2 py-1 bg-gov-50 hover:bg-gov-100 text-gov-700 rounded text-[10px] font-bold inline-flex items-center gap-1 border border-gov-200"
                            >
                              <Camera className="w-3 h-3 text-gov-600" /> Photo Attached
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No Photo</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {comp.latitude && comp.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${comp.latitude},${comp.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold inline-flex items-center gap-1 border border-emerald-200"
                              title="Click to view GPS location on Google Maps"
                            >
                              <MapPin className="w-3 h-3 text-emerald-600" /> GPS Map
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not Shared</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(comp.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                              comp.status === 'New' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              comp.status === 'Under Review' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              comp.status === 'Verified' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              comp.status === 'Action Taken' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                              comp.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {comp.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenModal(comp)}
                            className="px-2.5 py-1 text-xs bg-gov-700 hover:bg-gov-800 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-1 mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5" /> View & Respond
                          </button>
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

      {/* Complaint Details & Admin Action Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10 shadow">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-500 p-2 rounded-lg text-slate-900 font-bold">
                  <AlertTriangle className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Citizen Complaint & Action Tracker</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedComplaint.complaint_id} • Project: {selectedComplaint.contract_code}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700">
              {updateSuccess && <NotificationToast type="success" message={updateSuccess} />}

              {/* Related Contract Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Related Project / Contract</span>
                <h4 className="font-extrabold text-sm text-slate-900">{selectedComplaint.contract_title}</h4>
                <p className="text-xs text-slate-600">Department: {selectedComplaint.department} | Contractor: {selectedComplaint.contractor_name || 'N/A'}</p>
              </div>

              {/* Complaint Description Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                    Category: {selectedComplaint.issue_category}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    Submitted: {new Date(selectedComplaint.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl leading-relaxed text-slate-800 text-xs">
                  <span className="font-bold block mb-1 text-slate-900">Citizen Description:</span>
                  <p className="whitespace-pre-wrap">{selectedComplaint.description}</p>
                </div>
              </div>

              {/* Photo Evidence & GPS Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Evidence Gallery */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 sm:col-span-2">
                  <span className="font-bold text-slate-800 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gov-800">
                      <Camera className="w-4 h-4 text-gov-600" /> GPS Camera Evidence ({selectedComplaint.photos?.length || (selectedComplaint.photo_path ? 1 : 0)})
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Persistent Evidence Vault</span>
                  </span>

                  {selectedComplaint.photos && selectedComplaint.photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedComplaint.photos.map((ph, idx) => (
                        <div key={ph.id || idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                          <img
                            src={ph.photo_path}
                            alt={`GPS Evidence ${idx+1}`}
                            className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setPreviewPhotoUrl(ph.photo_path)}
                          />
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center justify-between font-mono">
                              <span className="font-bold text-slate-700">Photo #{idx+1}</span>
                              <span className="text-slate-400 text-[10px]">{new Date(ph.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {ph.latitude && ph.longitude ? (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="font-mono text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600" /> {ph.latitude.toFixed(5)}, {ph.longitude.toFixed(5)}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${ph.latitude},${ph.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" /> Map
                                </a>
                              </div>
                            ) : (
                              <p className="text-slate-400 italic text-[10px]">No photo GPS coordinates</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedComplaint.photo_path ? (
                    <div className="space-y-2">
                      <img
                        src={selectedComplaint.photo_path}
                        alt="Citizen Evidence"
                        className="w-full h-48 object-cover rounded-lg border border-slate-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewPhotoUrl(selectedComplaint.photo_path)}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(selectedComplaint.photo_path)}
                        className="text-xs text-gov-700 hover:underline font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Full Resolution Image
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic py-6 text-center text-xs">No photo evidence uploaded by citizen.</p>
                  )}
                </div>

                {/* Overall GPS Location & Map */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 sm:col-span-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Overall Project GPS Coordinates & Verification
                  </span>
                  {selectedComplaint.latitude && selectedComplaint.longitude ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-white border border-slate-200 rounded-lg text-xs gap-3">
                      <div className="font-mono space-y-0.5 text-left w-full sm:w-auto">
                        <p><span className="text-slate-400 font-bold">Latitude:</span> {selectedComplaint.latitude}</p>
                        <p><span className="text-slate-400 font-bold">Longitude:</span> {selectedComplaint.longitude}</p>
                        {selectedComplaint.location_address && (
                          <p className="text-slate-600 text-[10px]">{selectedComplaint.location_address}</p>
                        )}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors shrink-0 w-full sm:w-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Map Location
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic py-3 text-center text-xs">Citizen did not share overall GPS location.</p>
                  )}
                </div>
              </div>

              {/* Private Citizen Contact (Admin Only View) */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Citizen Reporter Information (Private - Admin Only)</span>
                <p><span className="font-bold text-slate-800">Reporter Name:</span> {selectedComplaint.reporter_name || 'Anonymous Citizen'}</p>
                <p><span className="font-bold text-slate-800">Contact Details:</span> {selectedComplaint.reporter_contact || 'Not Provided'}</p>
              </div>

              {/* Admin Action & Status Update Form */}
              <form onSubmit={handleUpdateStatusSubmit} className="p-4 bg-gov-50 border border-gov-200 rounded-xl space-y-3">
                <h4 className="font-extrabold text-gov-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gov-700" /> Admin Action & Official Status Update
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Update Status *</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold text-xs"
                    >
                      {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Admin Remarks / Action Details</label>
                    <input
                      type="text"
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="e.g. Field inspection ordered for material sample test."
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-lg shadow transition-colors disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Save Official Status Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Full Resolution Photo Modal */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in" onClick={() => setPreviewPhotoUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            <img src={previewPhotoUrl} alt="Complaint Evidence High Res" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full font-bold shadow"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenComplaintsPage;
