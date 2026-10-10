import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import ContractorAvatar from '../components/ContractorAvatar';
import {
  ShieldCheck, Building, MapPin, Calendar, FileText, DollarSign,
  Award, CheckCircle2, Download, Eye, AlertTriangle, Printer, Share2,
  ExternalLink, Layers, CheckCircle, Clock, Receipt, FileSpreadsheet
} from 'lucide-react';

const PublicContractDetailsPage = () => {
  const { qrToken } = useParams();
  const [contractData, setContractData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Citizen Feedback / Report Issue Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueCategory, setIssueCategory] = useState('Delayed Execution');
  const [issueDescription, setIssueDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);
  const [submittedComplaintId, setSubmittedComplaintId] = useState(null);

  // Multi-Photo & Live GPS Location State
  const [capturedPhotos, setCapturedPhotos] = useState([]); // [{ file, previewUrl, latitude, longitude, address, capturedAt }]
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationStatus, setLocationStatus] = useState('none'); // 'none', 'fetching', 'success', 'denied', 'unsupported'
  const [locationAddress, setLocationAddress] = useState('');
  const [locationTimestamp, setLocationTimestamp] = useState(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsPermissionError, setGpsPermissionError] = useState(null);
  const [isVerifyingGps, setIsVerifyingGps] = useState(false);

  const DENIED_GPS_MESSAGE = "Location permission is required to take a GPS Photo. Please allow location access in your browser settings.";

  const cameraInputRef = React.useRef(null);
  const galleryInputRef = React.useRef(null);

  const fetchPublicContractDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/public/project/${qrToken}`);
      setContractData(response.data);
    } catch (err) {
      try {
        const response2 = await api.get(`/public/contracts/${qrToken}`);
        setContractData(response2.data);
      } catch (err2) {
        setError(err2.response?.data?.detail || err.response?.data?.detail || "Unable to fetch public contract details. The QR code may be invalid, tampered with, or expired.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qrToken) {
      fetchPublicContractDetails();
    }
  }, [qrToken]);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const [selectedViewDoc, setSelectedViewDoc] = useState(null);

  const handlePrint = () => {
    window.print();
  };

  const handleViewDoc = (doc) => {
    const filePath = (doc.file_path || '').toLowerCase();
    const docName = (doc.document_name || '').toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filePath) || /\.(jpg|jpeg|png|webp|gif)$/i.test(docName) || (doc.mime_type && doc.mime_type.startsWith('image/'));
    const isPdf = /\.(pdf)$/i.test(filePath) || /\.(pdf)$/i.test(docName) || doc.mime_type === 'application/pdf';

    const directUrl = `/api/public/documents/${doc.id}/view?inline=true`;
    const downloadUrl = `/api/public/documents/${doc.id}/download`;
    setSelectedViewDoc({
      ...doc,
      isImage,
      isPdf,
      directUrl,
      downloadUrl
    });
  };

  const handleDownloadDoc = (docId, fileName) => {
    const downloadUrl = `/api/public/documents/${docId}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          return data.display_name;
        }
      }
    } catch (e) {
      console.warn("Reverse geocode fetch failed or timed out:", e);
    }
    return `GPS Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getBrowserGpsPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleGetLocation = async () => {
    setLocationStatus('fetching');
    setGpsPermissionError(null);
    try {
      const position = await getBrowserGpsPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const nowIso = new Date().toISOString();

      setLatitude(lat);
      setLongitude(lng);
      setLocationTimestamp(nowIso);
      setLocationStatus('success');
      setGpsPermissionError(null);

      const addr = await reverseGeocode(lat, lng);
      setLocationAddress(addr);
    } catch (err) {
      console.warn("Geolocation permission error:", err);
      setLocationStatus('denied');
      let errorMsg = "Location permission is required to take a GPS Photo. Please allow location access in your browser settings.";
      if (err.code === 2) {
        errorMsg = "GPS location unavailable. Please ensure GPS/location services are enabled on your device.";
      } else if (err.code === 3) {
        errorMsg = "GPS acquisition timed out. Please retry in an open area with better GPS signal.";
      }
      setGpsPermissionError(errorMsg);
    }
  };

  const handleTriggerPhotoAction = (inputRef) => {
    setGpsPermissionError(null);
    setIsVerifyingGps(false);
    
    // Background pre-fetch GPS position without blocking inputRef click gesture
    getBrowserGpsPosition()
      .then(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nowIso = new Date().toISOString();

        setLatitude(lat);
        setLongitude(lng);
        setLocationTimestamp(nowIso);
        setLocationStatus('success');
        setGpsPermissionError(null);

        reverseGeocode(lat, lng).then(addr => setLocationAddress(addr));
      })
      .catch(err => {
        console.warn("Background GPS pre-fetch failed:", err);
      });

    // Synchronously trigger native camera/file picker in direct user touch handler
    if (inputRef && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleRetryGpsPermission = async () => {
    setGpsPermissionError(null);
    await handleGetLocation();
  };

  const stampGpsMetadataOnImage = (file, metadata) => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          try {
            // Downscale high-resolution mobile camera photos (Max 1600px) to prevent tab RAM crashes
            const MAX_DIM = 1600;
            let origW = img.naturalWidth || img.width || 1200;
            let origH = img.naturalHeight || img.height || 900;

            let width = origW;
            let height = origH;

            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const scale = Math.max(0.6, Math.min(2.0, width / 1200));

            const dateObj = metadata.capturedAt ? new Date(metadata.capturedAt) : new Date();
            const dateStr = dateObj.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const timeStr = dateObj.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            });

            const bannerPadding = Math.round(20 * scale);
            const headerFontSize = Math.round(22 * scale);
            const detailFontSize = Math.round(16 * scale);
            const lineHeight = Math.round(26 * scale);

            const lines = [];
            if (metadata.projectName) {
              lines.push({ text: `PROJECT: ${metadata.projectName.toUpperCase()}`, type: 'header' });
            }
            if (metadata.latitude && metadata.longitude) {
              lines.push({ text: `📍 LAT: ${metadata.latitude.toFixed(6)}°  |  LONG: ${metadata.longitude.toFixed(6)}°`, type: 'gps' });
            } else {
              lines.push({ text: `📍 GPS LOCATION: PERMISSION DENIED OR UNAVAILABLE`, type: 'error' });
            }
            if (metadata.address) {
              lines.push({ text: `📍 LOCATION: ${metadata.address}`, type: 'detail' });
            }
            lines.push({ text: `📅 DATE: ${dateStr}   🕒 TIME: ${timeStr}   🛡️ OFFICIAL EVIDENCE STAMP`, type: 'meta' });

            const totalTextHeight = lines.length * lineHeight + Math.round(8 * scale);
            const bannerHeight = totalTextHeight + (bannerPadding * 2);
            const bannerY = height - bannerHeight;

            // Semi-transparent dark slate banner
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(0, bannerY, width, bannerHeight);

            // Top emerald accent line
            ctx.fillStyle = '#10b981';
            ctx.fillRect(0, bannerY, width, Math.max(3, Math.round(5 * scale)));

            // Text shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = Math.round(3 * scale);
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            let currentY = bannerY + bannerPadding + detailFontSize;
            const startX = bannerPadding;
            const maxTextWidth = width - (bannerPadding * 2);

            lines.forEach((line) => {
              if (line.type === 'header') {
                ctx.font = `bold ${headerFontSize}px sans-serif, Arial`;
                ctx.fillStyle = '#ffffff';
              } else if (line.type === 'gps') {
                ctx.font = `bold ${detailFontSize}px monospace, Courier New`;
                ctx.fillStyle = '#34d399';
              } else if (line.type === 'error') {
                ctx.font = `bold ${detailFontSize}px sans-serif, Arial`;
                ctx.fillStyle = '#f87171';
              } else if (line.type === 'meta') {
                ctx.font = `bold ${Math.round(detailFontSize * 0.85)}px monospace, Courier New`;
                ctx.fillStyle = '#94a3b8';
              } else {
                ctx.font = `500 ${detailFontSize}px sans-serif, Arial`;
                ctx.fillStyle = '#f8fafc';
              }

              let textToDraw = line.text;
              if (ctx.measureText(textToDraw).width > maxTextWidth) {
                while (textToDraw.length > 5 && ctx.measureText(textToDraw + '...').width > maxTextWidth) {
                  textToDraw = textToDraw.slice(0, -1);
                }
                textToDraw += '...';
              }

              ctx.fillText(textToDraw, startX, currentY);
              currentY += lineHeight;
            });

            ctx.shadowColor = 'transparent';

            canvas.toBlob((blob) => {
              if (!blob) {
                resolve({ stampedFile: file, previewUrl: URL.createObjectURL(file) });
                return;
              }
              const stampedFile = new File([blob], file.name || `gps_photo_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve({
                stampedFile,
                previewUrl: URL.createObjectURL(blob)
              });
            }, 'image/jpeg', 0.88);
          } catch (err) {
            console.error("Canvas stamping error:", err);
            resolve({ stampedFile: file, previewUrl: URL.createObjectURL(file) });
          }
        };
        img.onerror = () => {
          resolve({ stampedFile: file, previewUrl: URL.createObjectURL(file) });
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        resolve({ stampedFile: file, previewUrl: URL.createObjectURL(file) });
      };
      reader.readAsDataURL(file);
    });
  };

  const processAddPhotoFile = async (file) => {
    if (!file) return;
    setIsCapturingPhoto(true);

    const nowIso = new Date().toISOString();
    let photoLat = latitude;
    let photoLng = longitude;
    let photoAddr = locationAddress;

    if (!photoLat || !photoLng) {
      try {
        const position = await getBrowserGpsPosition();
        photoLat = position.coords.latitude;
        photoLng = position.coords.longitude;
        photoAddr = await reverseGeocode(photoLat, photoLng);

        setLatitude(photoLat);
        setLongitude(photoLng);
        setLocationAddress(photoAddr);
        setLocationTimestamp(nowIso);
        setLocationStatus('success');
        setGpsPermissionError(null);
      } catch (err) {
        console.warn("Photo GPS capture error:", err);
        setIsCapturingPhoto(false);
        let errorMsg = DENIED_GPS_MESSAGE;
        if (err.code === 2) {
          errorMsg = "GPS location unavailable. Please ensure GPS/location services are enabled on your device.";
        } else if (err.code === 3) {
          errorMsg = "GPS acquisition timed out. Please retry in an open area with better GPS signal.";
        }
        setGpsPermissionError(errorMsg);
        setLocationStatus('denied');
        return; // DO NOT take or save photo without valid location data!
      }
    }

    if (!photoLat || !photoLng) {
      setIsCapturingPhoto(false);
      setGpsPermissionError(DENIED_GPS_MESSAGE);
      setLocationStatus('denied');
      return;
    }

    const metadata = {
      latitude: photoLat,
      longitude: photoLng,
      address: photoAddr,
      capturedAt: nowIso,
      projectName: contractData?.title || 'Government Project',
      contractId: contractData?.contract_id || qrToken
    };

    try {
      const { stampedFile, previewUrl } = await stampGpsMetadataOnImage(file, metadata);

      const newPhotoItem = {
        file: stampedFile,
        previewUrl: previewUrl,
        latitude: photoLat,
        longitude: photoLng,
        address: photoAddr,
        capturedAt: nowIso
      };

      setCapturedPhotos(prev => [...prev, newPhotoItem]);
    } catch (err) {
      console.error("Error processing photo file:", err);
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleReportIssueSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!issueDescription.trim()) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('issue_category', issueCategory);
    formData.append('description', issueDescription.trim());
    if (reporterName) formData.append('reporter_name', reporterName.trim());
    if (reporterContact) formData.append('reporter_contact', reporterContact.trim());
    if (latitude) formData.append('latitude', latitude);
    if (longitude) formData.append('longitude', longitude);
    if (locationAddress) formData.append('location_address', locationAddress);

    // Photos and metadata
    capturedPhotos.forEach((item) => {
      formData.append('photos', item.file);
    });

    const photoMeta = capturedPhotos.map(item => ({
      latitude: item.latitude,
      longitude: item.longitude,
      location_address: item.address,
      captured_at: item.capturedAt
    }));
    formData.append('photos_metadata', JSON.stringify(photoMeta));

    try {
      const res = await api.post(`/public/project/${qrToken}/complaints`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmittedComplaintId(res.data.complaint_id);
      setIssueSubmitted(true);
    } catch (err) {
      try {
        const res2 = await api.post(`/public/contracts/${qrToken}/complaints`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSubmittedComplaintId(res2.data.complaint_id);
        setIssueSubmitted(true);
      } catch (err2) {
        alert(err2.response?.data?.detail || err.response?.data?.detail || "Failed to submit citizen complaint. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <Navbar hideTheme={true} isPublic={true} />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-4 animate-pulse">
          <div className="h-28 bg-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div className="h-4 bg-emerald-500/30 rounded w-1/3"></div>
            <div className="h-6 bg-slate-700 rounded w-3/4"></div>
            <div className="h-3 bg-slate-700/60 rounded w-1/2"></div>
          </div>
          <div className="h-44 bg-slate-800 rounded-2xl p-6 space-y-3">
            <div className="h-4 bg-slate-700 rounded w-1/4"></div>
            <div className="h-3 bg-slate-700/60 rounded w-full"></div>
            <div className="h-3 bg-slate-700/60 rounded w-5/6"></div>
          </div>
          <div className="flex items-center justify-center py-6 text-emerald-400 font-bold text-xs gap-2">
            <LoadingSpinner size="sm" />
            <span>Authenticating QR Code & Loading Project Details...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !contractData) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar hideTheme={true} isPublic={true} />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 border border-rose-200 shadow-md text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-rose-800">Invalid or Unrecognized QR Code</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {error || "The scanned QR code token is invalid, expired, tampered with, or does not exist in official government records. No contract details can be displayed."}
            </p>
            <div className="pt-4">
              <Link
                to="/"
                className="px-5 py-2.5 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-xl shadow transition-all inline-block"
              >
                Go to Citizen Portal
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const fin = contractData.financials;
  const contractor = contractData.contractor;
  const verifiedDocs = contractData.verified_documents || [];

  const totalSanctioned = fin?.sanctioned_amount || 0;
  const totalContractVal = fin?.revised_contract_value || fin?.contract_value || 0;
  const totalReleased = fin?.fund_releases?.reduce((sum, item) => sum + (parseFloat(item.amount_released) || 0), 0) || 0;
  const totalPaid = fin?.payments?.filter(p => ['Approved', 'Paid'].includes(p.payment_status))?.reduce((sum, item) => sum + (parseFloat(item.net_amount) || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-gov-700 selection:text-white print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Navbar hideTheme={true} isPublic={true} />
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Official QR Scanner Verification Banner */}
        <div className="bg-gradient-to-r from-gov-900 via-slate-900 to-gov-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Public Record • QR Code Scan Authenticated</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mt-1">
              {contractData.title}
            </h1>
            <p className="text-xs text-slate-300 font-mono">
              Contract ID: <span className="text-emerald-300 font-bold">{contractData.contract_id}</span> | Department: {contractData.department}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden self-start sm:self-center">
            <button
              onClick={handleShareLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copySuccess ? 'Link Copied!' : 'Share'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Project Status & Progress Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Current Execution Status</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  contractData.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  contractData.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {contractData.status}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{contractData.contract_type}</span>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Physical Progress:</span>
                <span className="text-gov-800">{contractData.progress_percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, contractData.progress_percentage))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tender Number</span>
              <span className="font-semibold text-slate-900 font-mono">{contractData.tender_number}</span>
            </div>
            <div className="p-3 bg-slate-50 border rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Work Order Number</span>
              <span className="font-semibold text-slate-900 font-mono">{contractData.work_order_number}</span>
            </div>
            <div className="p-3 bg-slate-50 border rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Agreement Number</span>
              <span className="font-semibold text-slate-900 font-mono">{contractData.agreement_number}</span>
            </div>
            <div className="p-3 bg-slate-50 border rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Timeline</span>
              <span className="font-semibold text-slate-900">{contractData.start_date} to {contractData.end_date}</span>
            </div>
          </div>
        </div>

        {/* Official Work Updates Timeline with Dates */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gov-600" />
                📅 Official Dated Work Updates & Progress Timeline ({contractData.work_updates?.length || 0})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic progress updates, milestone logs, and site proof submitted by the contractor with dates.
              </p>
            </div>
          </div>

          {!contractData.work_updates || contractData.work_updates.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No dated work progress updates posted yet for this project.</p>
              <p className="text-[11px] text-slate-400">Work updates posted by the contractor will automatically appear here with dates and site photo proof.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contractData.work_updates.map((wu) => (
                <div key={wu.id} className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
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

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                    {wu.description}
                  </p>

                  {wu.photo_path && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Site Photo Proof:</span>
                      <img
                        src={wu.photo_path}
                        alt={`Work Proof ${wu.work_date}`}
                        className="h-44 object-cover rounded-lg border border-slate-300 shadow-sm cursor-pointer hover:opacity-95"
                        onClick={() => window.open(wu.photo_path, '_blank')}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Official Material Purchase Bills & Vouchers (Public Citizen Transparency) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                🧾 Material Purchase Bills & Supplier Invoices ({contractData.material_bills?.length || 0})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic material purchase invoices and supplier receipts permanently uploaded by the contractor for citizen audit.
              </p>
            </div>
            {contractData.material_bills?.length > 0 && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Verified Audit Records
              </span>
            )}
          </div>

          {!contractData.material_bills || contractData.material_bills.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No material purchase bills uploaded yet for this contract.</p>
              <p className="text-[11px] text-slate-400">Supplier invoices and bills uploaded by the contractor will be permanently displayed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Bill / Invoice #</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Material Description</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {contractData.material_bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{bill.bill_date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-mono whitespace-nowrap">{bill.bill_number}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold">{bill.supplier_name}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={bill.material_description}>
                        {bill.material_description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                        ₹{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <a
                          href={bill.bill_file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] transition-colors border border-emerald-200"
                        >
                          <ExternalLink className="w-3 h-3" /> View Bill
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Work Location & Contractor Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Location Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gov-600" /> Project Site & Location
            </h3>
            <div className="text-xs space-y-1.5 text-slate-700">
              <p><span className="font-semibold text-slate-900">Project Address:</span> {contractData.contract_address || contractData.location}</p>
              <p><span className="font-semibold text-slate-900">District & State:</span> {contractData.district}, {contractData.state}</p>
              <p><span className="font-semibold text-slate-900">PIN Code:</span> {contractData.pin_code || 'N/A'}</p>
              <p><span className="font-semibold text-slate-900">Issuing Office:</span> {contractData.office_name}</p>
            </div>
          </div>

          {/* Contractor Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-gov-600" /> Assigned Government Contractor
            </h3>
            <div className="flex items-start gap-3.5 pt-1">
              <ContractorAvatar
                photoPath={contractor.photo_path}
                name={`${contractor.first_name} ${contractor.surname}`}
                size="xl"
              />
              <div className="text-xs space-y-1.5 text-slate-700 flex-1">
                <p><span className="font-semibold text-slate-900">Contractor Name:</span> <span className="font-bold text-slate-900 text-sm">{contractor.first_name} {contractor.surname}</span></p>
                {contractor.company_name && (
                  <p><span className="font-semibold text-slate-900">Company / Entity:</span> {contractor.company_name}</p>
                )}
                <p><span className="font-semibold text-slate-900">Government Reg #:</span> <span className="font-mono text-gov-800 font-bold">{contractor.contractor_reg_number}</span></p>
                <p className="text-[11px] text-slate-500 italic mt-1">Verified & Active Government Contractor Record</p>
              </div>
            </div>
          </div>
        </div>

        {/* Work Description & Responsibilities */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gov-600" /> Scope of Work & Responsibilities
          </h3>
          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-800 block mb-1">Work Description:</span>
              <p className="p-3 bg-slate-50 rounded-xl border leading-relaxed">{contractData.description}</p>
            </div>
            <div>
              <span className="font-bold text-slate-800 block mb-1">Contractor Responsibilities:</span>
              <p className="p-3 bg-slate-50 rounded-xl border leading-relaxed">{contractData.responsibilities}</p>
            </div>
          </div>
        </div>

        {/* Public Financial Summary */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-gov-600" /> Public Financial Transparency
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Sanctioned Amount</span>
              <span className="text-lg font-extrabold text-emerald-900">₹{totalSanctioned.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Contract Amount</span>
              <span className="text-lg font-extrabold text-blue-900">₹{totalContractVal.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Funds Released</span>
              <span className="text-lg font-extrabold text-amber-900">₹{totalReleased.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-700 block">Payments Made</span>
              <span className="text-lg font-extrabold text-slate-900">₹{totalPaid.toLocaleString()}</span>
            </div>
          </div>

          {/* Installment History */}
          {fin?.fund_releases && fin.fund_releases.length > 0 && (
            <div className="pt-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Fund Release Installments</h4>
              <div className="border rounded-xl overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[360px]">
                  <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Inst #</th>
                      <th className="py-2 px-3">Release Order</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fin.fund_releases.map((fr) => (
                      <tr key={fr.id}>
                        <td className="py-2 px-3 font-bold text-slate-800">#{fr.installment_number}</td>
                        <td className="py-2 px-3 font-mono">{fr.release_order_number}</td>
                        <td className="py-2 px-3 text-slate-600">{fr.release_date}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">₹{parseFloat(fr.amount_released).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Official Project Documents Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-gov-600" />
                📄 Official Project Documents ({verifiedDocs.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic government records, sanctions, and technical approvals approved for public inspection.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              Public Approved Records
            </span>
          </div>

          {verifiedDocs.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No public approved documents attached yet for this project.</p>
              <p className="text-[11px] text-slate-400">Official documents uploaded by Admin will automatically appear here once approved for public access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {verifiedDocs.map((doc) => {
                const formattedDate = doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'N/A';
                const formattedSize = doc.file_size
                  ? `${(doc.file_size / 1024).toFixed(1)} KB`
                  : null;

                return (
                  <div key={doc.id} className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs transition-colors">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{doc.document_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-100 text-gov-800 border border-gov-200">
                          {doc.document_type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Verified & Approved
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>Document ID: <strong className="font-mono text-slate-700">{doc.doc_id}</strong></span>
                        <span>•</span>
                        <span>Upload Date: <strong className="text-slate-700">{formattedDate}</strong></span>
                        {formattedSize && (
                          <>
                            <span>•</span>
                            <span>Size: <strong className="text-slate-700">{formattedSize}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Authority: <strong className="text-slate-700">{doc.uploaded_by}</strong></span>
                      </div>

                      {doc.description && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100 mt-1">
                          "{doc.description}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 print:hidden self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleViewDoc(doc)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                        title="View Document Inline"
                      >
                        <Eye className="w-3.5 h-3.5 text-gov-600" /> View Document
                      </button>
                      <button
                        onClick={() => handleDownloadDoc(doc.id, doc.document_name)}
                        className="px-3.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-lg font-bold text-xs shadow transition-colors flex items-center gap-1.5"
                        title="Download Document Attachment"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Citizen Action & Report Issue Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Notice An Issue with this Government Project?
            </h4>
            <p className="text-xs text-amber-800">
              Citizens can submit feedback, report delays, or highlight quality concerns directly to anti-corruption oversight officers.
            </p>
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition-colors shrink-0"
          >
            Report an Issue / Complaint
          </button>
        </div>

        {/* Bottom Legal Notice */}
        <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-200 space-y-1">
          <p className="font-semibold text-slate-500">Anti Curruption Monitoring System</p>
          <p>This page displays view-only data generated from authoritative database records linked to QR Token <span className="font-mono">{contractData.qr_code_token}</span>.</p>
        </div>
      </main>

      {/* Citizen Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gov-900 text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Report Project Issue / Feedback
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-300 hover:text-white font-bold text-base">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {issueSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-emerald-900 text-base">Complaint Submitted Successfully!</h4>
                  <p className="text-xs text-emerald-700 max-w-xs mx-auto">
                    Thank you. Your report has been securely registered with official oversight officers.
                  </p>
                  {submittedComplaintId && (
                    <div className="p-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-emerald-900 font-bold inline-block">
                      Complaint ID: {submittedComplaintId}
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowIssueModal(false);
                        setIssueSubmitted(false);
                        setIssueDescription('');
                        setReporterName('');
                        setReporterContact('');
                        setSelectedPhoto(null);
                        setPhotoPreview(null);
                        setLocationStatus('none');
                        setLatitude(null);
                        setLongitude(null);
                      }}
                      className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl shadow"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReportIssueSubmit} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Issue Category *</label>
                    <select
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gov-500"
                    >
                      <option value="Delayed Execution">Delayed Project Execution</option>
                      <option value="Poor Work Quality">Substandard Materials / Work Quality</option>
                      <option value="Unapproved Changes">Unapproved Work Variations</option>
                      <option value="Fund Misuse">Suspected Misuse of Funds</option>
                      <option value="Safety Hazard">Public Safety / Site Hazard</option>
                      <option value="Other">Other Concerns</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Detailed Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      placeholder="Describe the issue observed at the project site..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-gov-500"
                    />
                  </div>

                  {/* GPS Camera Evidence Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span className="text-base">📷</span> GPS Evidence Photos ({capturedPhotos.length})
                      </label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Camera + Real-Time Location</span>
                    </div>

                    {/* Hidden Inputs for Direct Camera & Gallery Selection */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) processAddPhotoFile(e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          Array.from(e.target.files).forEach(f => processAddPhotoFile(f));
                        }
                        e.target.value = '';
                      }}
                    />

                    {/* Action Buttons: Take Photo & Upload Gallery */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTriggerPhotoAction(cameraInputRef)}
                        disabled={isCapturingPhoto || isVerifyingGps}
                        className="py-2.5 px-3 bg-gov-700 hover:bg-gov-800 active:bg-gov-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="text-sm">📷</span> {isVerifyingGps ? 'Checking GPS...' : 'Take GPS Photo'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerPhotoAction(galleryInputRef)}
                        disabled={isCapturingPhoto || isVerifyingGps}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="text-sm">📁</span> Select Gallery
                      </button>
                    </div>

                    {/* GPS Permission Warning & Retry Button Box */}
                    {gpsPermissionError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                        <div className="flex items-start gap-2 text-rose-900 font-semibold leading-relaxed">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{gpsPermissionError}</span>
                        </div>
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={handleRetryGpsPermission}
                            className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>🔄</span> Retry / Allow Location Access
                          </button>
                        </div>
                      </div>
                    )}

                    {isCapturingPhoto && (
                      <div className="p-2 text-center text-xs text-gov-700 font-bold bg-gov-50 border border-gov-200 rounded-lg animate-pulse">
                        Capturing Photo & Acquiring GPS Coordinates...
                      </div>
                    )}

                    {/* Photo Preview Cards */}
                    {capturedPhotos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {capturedPhotos.map((item, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-start space-x-2.5 relative shadow-sm">
                            <img src={item.previewUrl} alt={`Evidence ${idx+1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0" />
                            <div className="flex-1 min-w-0 space-y-0.5 text-[10px]">
                              <p className="font-extrabold text-slate-800 truncate">Photo #{idx+1}</p>
                              {item.latitude && item.longitude ? (
                                <div className="space-y-0.5">
                                  <p className="font-mono font-bold text-emerald-700 truncate">
                                    📍 {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                                  </p>
                                  {item.address && (
                                    <p className="text-slate-600 truncate text-[9px]">
                                      {item.address}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-rose-600 font-medium text-[9px] leading-tight">
                                  {DENIED_GPS_MESSAGE}
                                </p>
                              )}
                              <p className="text-slate-500 font-mono text-[9px]">
                                🕒 {new Date(item.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded font-bold text-xs shrink-0"
                              title="Remove Photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Share Live Location Section */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                        📍 Capture Overall Project Location
                      </span>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locationStatus === 'fetching'}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg shadow transition-colors disabled:opacity-50 shrink-0"
                      >
                        {locationStatus === 'fetching' ? 'Acquiring GPS...' : locationStatus === 'success' ? 'Update GPS' : 'Capture Location'}
                      </button>
                    </div>

                    {locationStatus === 'success' && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] space-y-1 font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>GPS: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}</span>
                        </div>
                        {locationAddress && (
                          <p className="text-slate-700 font-sans text-[11px]">
                            <span className="font-bold">Address:</span> {locationAddress}
                          </p>
                        )}
                        {locationTimestamp && (
                          <p className="text-slate-500 text-[10px]">
                            Captured at: {new Date(locationTimestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {locationStatus === 'denied' && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-medium flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{DENIED_GPS_MESSAGE}</span>
                      </div>
                    )}
                  </div>

                  {/* Citizen Contact Details (Optional) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Your Name (Optional)</label>
                      <input
                        type="text"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        placeholder="Citizen Name"
                        className="w-full p-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Contact Phone/Email</label>
                      <input
                        type="text"
                        value={reporterContact}
                        onChange={(e) => setReporterContact(e.target.value)}
                        placeholder="For updates (Optional)"
                        className="w-full p-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowIssueModal(false)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !issueDescription.trim()}
                      className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded-xl shadow disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-App Document Viewer Modal for PDFs & Official Files */}
      {selectedViewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Responsive Header */}
            <div className="bg-slate-900 text-white p-3 sm:p-4 px-4 sm:px-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="p-2 bg-gov-700/50 rounded-lg border border-gov-500/40 text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-xs sm:text-sm text-white truncate">{selectedViewDoc.document_name}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                    ID: {selectedViewDoc.doc_id || selectedViewDoc.id} • {selectedViewDoc.document_type || 'Official Document'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 self-end sm:self-auto">
                <a
                  href={selectedViewDoc.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Open PDF in Browser Reader"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> <span>Open PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(selectedViewDoc.id, selectedViewDoc.document_name)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Download Document File"
                >
                  <Download className="w-3.5 h-3.5" /> <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedViewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg text-lg font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mobile Helper Banner */}
            <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <span className="text-base">{selectedViewDoc.isImage ? '🖼️' : '📄'}</span>
                <span>{selectedViewDoc.isImage ? 'Viewing Official Document Image' : 'Viewing Official Project Document'}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedViewDoc.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gov-800 hover:text-gov-900 font-bold underline text-[11px] flex items-center gap-1"
                >
                  Can't see preview on mobile? Tap here to open ↗
                </a>
              </div>
            </div>

            {/* Document Viewer Frame with Object/Iframe and Mobile Fallback */}
            <div className="flex-1 bg-slate-900/90 relative overflow-hidden flex flex-col justify-center items-center p-2">
              {selectedViewDoc.isImage ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={selectedViewDoc.directUrl}
                    alt={selectedViewDoc.document_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <object
                  data={selectedViewDoc.directUrl}
                  type="application/pdf"
                  className="w-full h-full border-0 rounded-b-xl"
                >
                  <iframe
                    src={selectedViewDoc.directUrl}
                    title={selectedViewDoc.document_name}
                    className="w-full h-full border-0 rounded-b-xl"
                  >
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50">
                      <div className="w-16 h-16 bg-gov-100 text-gov-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {selectedViewDoc.document_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Mobile browser inline preview unavailable for this document format.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-xs">
                        <a
                          href={selectedViewDoc.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" /> Open Document
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(selectedViewDoc.id, selectedViewDoc.document_name)}
                          className="w-full py-2.5 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Download File
                        </button>
                      </div>
                    </div>
                  </iframe>
                </object>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicContractDetailsPage;
