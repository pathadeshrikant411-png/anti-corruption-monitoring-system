import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AdminSidebar from '../components/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import ContractorAvatar from '../components/ContractorAvatar';
import {
  ShieldCheck, UserCheck, Calendar, Key, Lock, Layers,
  ArrowRight, Users, AlertTriangle, FileText, Globe, CheckCircle2,
  DollarSign, Activity, PieChart, BarChart3, TrendingUp, Sparkles,
  Search, Eye, Clock, AlertCircle, ArrowUpRight, ChevronRight, CheckCircle, RefreshCw,
  Building, Phone, Mail, MapPin, Receipt, X, Download, QrCode
} from 'lucide-react';
import api from '../services/api';

const DashboardPage = () => {
  const { user, admin, logout } = useAuth();
  const { currentPreset, config } = useTheme();
  const activeAdmin = admin || user;

  const [customUrl, setCustomUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlMsg, setUrlMsg] = useState(null);

  const [loading, setLoading] = useState(true);
  const [contractorsData, setContractorsData] = useState([]);
  const [complaintsData, setComplaintsData] = useState([]);

  // Contractor Inspection Modal & Search
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [contractorSearch, setContractorSearch] = useState('');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalContractors: 0,
    activeContractors: 0,
    totalContracts: 0,
    activeContractsCount: 0,
    activeProjectsCount: 0,
    totalProjectValue: 0,
    totalFundsReleased: 0,
    pendingComplaintsCount: 0,
    resolvedComplaintsCount: 0,
    riskAlertsCount: 0,
    contractStatusCounts: { awarded: 0, inProgress: 0, completed: 0, onHold: 0 },
    complaintCategoryCounts: {}
  });

  useEffect(() => {
    fetchDashboardData();
    fetchNetworkSetting();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [contractorsRes, complaintsRes] = await Promise.all([
        api.get('/contractors').catch(() => ({ data: [] })),
        api.get('/contractors/complaints').catch(() => ({ data: [] }))
      ]);

      const contractors = Array.isArray(contractorsRes.data) ? contractorsRes.data : [];
      const complaints = Array.isArray(complaintsRes.data) ? complaintsRes.data : [];

      setContractorsData(contractors);
      setComplaintsData(complaints);

      // Compute calculations from real database records
      let totalValue = 0;
      let totalReleased = 0;
      let allContractsList = [];
      let activeContractors = 0;

      contractors.forEach(ctr => {
        if (ctr.status === 'Active') activeContractors++;
        
        const ctrContracts = ctr.contracts || [];
        allContractsList.push(...ctrContracts);

        ctrContracts.forEach(c => {
          if (c.financials) {
            totalValue += c.financials.contract_value || c.financials.sanctioned_amount || 0;
            if (c.financials.fund_releases) {
              c.financials.fund_releases.forEach(fr => {
                totalReleased += fr.amount_released || 0;
              });
            }
          }
        });
      });

      const statusCounts = { awarded: 0, inProgress: 0, completed: 0, onHold: 0 };
      let activeProjects = 0;
      let delayedOrLowProgress = 0;

      allContractsList.forEach(c => {
        const s = (c.status || '').toLowerCase();
        if (s.includes('award')) statusCounts.awarded++;
        else if (s.includes('progress') || s.includes('active')) {
          statusCounts.inProgress++;
          activeProjects++;
          if (c.progress_percentage > 0 && c.progress_percentage < 30) {
            delayedOrLowProgress++;
          }
        } else if (s.includes('complet')) statusCounts.completed++;
        else statusCounts.onHold++;
      });

      // Complaints breakdown
      let pendingComplaints = 0;
      let resolvedComplaints = 0;
      let highRiskComplaints = 0;
      const categoryMap = {};

      complaints.forEach(cmp => {
        const status = cmp.status || 'New';
        if (status === 'Resolved') {
          resolvedComplaints++;
        } else {
          pendingComplaints++;
        }

        const cat = cmp.issue_category || 'General Concern';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;

        if (['Substandard Material', 'Fraud', 'Safety Hazard', 'Bribery'].includes(cat) || status === 'New') {
          highRiskComplaints++;
        }
      });

      setMetrics({
        totalContractors: contractors.length,
        activeContractors,
        totalContracts: allContractsList.length,
        activeContractsCount: statusCounts.inProgress + statusCounts.awarded,
        activeProjectsCount: activeProjects || statusCounts.inProgress,
        totalProjectValue: totalValue,
        totalFundsReleased: totalReleased,
        pendingComplaintsCount: pendingComplaints,
        resolvedComplaintsCount: resolvedComplaints,
        riskAlertsCount: highRiskComplaints + delayedOrLowProgress,
        contractStatusCounts: statusCounts,
        complaintCategoryCounts: categoryMap
      });

    } catch (err) {
      console.error("Failed to calculate dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkSetting = async () => {
    try {
      const res = await api.get('/public/network-info');
      if (res.data?.qr_base_url) {
        setCustomUrl(res.data.qr_base_url);
      }
    } catch (err) {
      console.error("Failed to load network info", err);
    }
  };

  const handleSavePublicUrl = async () => {
    if (!customUrl.trim()) return;
    setSavingUrl(true);
    setUrlMsg(null);
    try {
      await api.put('/contractors/settings/public-url', { public_url: customUrl.trim() });
      setUrlMsg({ type: 'success', text: '✅ Public QR Domain successfully saved! All QR codes now embed this URL.' });
    } catch (err) {
      console.error("Failed to update public URL", err);
      setUrlMsg({ type: 'error', text: 'Failed to update domain URL. Please check server logs.' });
    } finally {
      setSavingUrl(false);
    }
  };

  // Helper formatting for currency
  const formatCurrency = (val) => {
    if (!val || val === 0) return '₹0';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const radiusClass = config.borderRadius === 'sm' ? 'rounded-lg' : config.borderRadius === 'md' ? 'rounded-xl' : config.borderRadius === 'xl' ? 'rounded-3xl' : 'rounded-2xl';
  const densityClass = config.layoutDensity === 'compact' ? 'py-4 space-y-4' : 'py-6 space-y-6';

  const formattedLastLogin = activeAdmin?.last_login_at
    ? new Date(activeAdmin.last_login_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Active Session';

  const filteredContractors = contractorsData.filter(c => {
    if (!contractorSearch.trim()) return true;
    const q = contractorSearch.toLowerCase();
    const fullName = `${c.first_name || ''} ${c.fathers_name || ''} ${c.surname || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (c.contractor_id || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.mobile_number || '').includes(q) ||
      (c.contractor_reg_number || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className={`min-h-screen ${currentPreset.bgMain} ${currentPreset.textMain} flex flex-col font-sans transition-colors duration-300`}>
      {/* Navbar */}
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row min-w-0 w-full">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Main Dashboard Workspace */}
        <main className={`flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${densityClass}`}>
          
          {/* Executive Header Bar */}
          <div className={`${currentPreset.headerBg} ${radiusClass} p-5 sm:p-6 shadow-xl border relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all`}>
            {/* Ambient Background Gradient Accent */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-1.5 z-10">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-Corruption Government Operations Suite</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white pt-1">
                Executive Command Center
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Real-Time Public Works Monitoring, Contractor Auditing & Citizen Transparency Portal
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-200 bg-white/10 p-3 rounded-xl border border-white/15 shrink-0 z-10">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorized Government Officer</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-300" />
                <span>{formattedLastLogin}</span>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="ml-1 p-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white transition-colors cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 8 Primary Government Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Total Contractors */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Contractors Directory</span>
                <div className="w-10 h-10 bg-gov-100 text-gov-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-gov-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {loading ? '...' : metrics.totalContractors}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {metrics.activeContractors} Active Profile{metrics.activeContractors !== 1 ? 's' : ''}
                  </span>
                  <Link to="/admin/contractors" className="text-gov-700 hover:text-gov-800 font-bold flex items-center gap-0.5 text-[11px]">
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Metric 2: Active Contracts */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Active Works & Contracts</span>
                <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {loading ? '...' : metrics.activeContractsCount}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 text-[11px] font-medium">
                    Out of {metrics.totalContracts} total registered
                  </span>
                  <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                    Enforced
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 3: Total Project Value */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Sanctioned Budget</span>
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5 text-amber-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {loading ? '...' : formatCurrency(metrics.totalProjectValue)}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                    Approved Allocations
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 4: Funds Released */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Funds Disbursed</span>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {loading ? '...' : formatCurrency(metrics.totalFundsReleased)}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 text-[11px]">
                    {metrics.totalProjectValue > 0
                      ? `${((metrics.totalFundsReleased / metrics.totalProjectValue) * 100).toFixed(1)}% of Budget Released`
                      : 'Audited Disbursement'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 5: Active Projects */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Live Projects in Execution</span>
                <div className="w-10 h-10 bg-indigo-100 text-indigo-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5 text-indigo-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {loading ? '...' : metrics.activeProjectsCount}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                    Site Progress Tracked
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 6: Pending Complaints */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Pending Citizen Reports</span>
                <div className="w-10 h-10 bg-rose-100 text-rose-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-rose-700 dark:text-rose-400">
                  {loading ? '...' : metrics.pendingComplaintsCount}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                    Requires Audit Review
                  </span>
                  <Link to="/admin/complaints" className="text-gov-700 font-bold text-[11px]">
                    Inspect Feed →
                  </Link>
                </div>
              </div>
            </div>

            {/* Metric 7: Resolved Complaints */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Resolved Complaints</span>
                <div className="w-10 h-10 bg-teal-100 text-teal-800 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-teal-700 dark:text-teal-400">
                  {loading ? '...' : metrics.resolvedComplaintsCount}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                    Verified Closed
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 8: Risk Alerts */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-5 border ${currentPreset.border} shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden border-l-4 border-l-amber-500`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Operational Risk Flags</span>
                <div className="w-10 h-10 bg-amber-100 text-amber-900 rounded-xl flex items-center justify-center font-bold shadow-inner group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <h3 className="text-2xl font-black text-amber-800 dark:text-amber-400">
                  {loading ? '...' : metrics.riskAlertsCount}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                    High Sensitivity Alerts
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Visualizations & Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Financial Allocation & Disbursements Progress Meter */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-6 border ${currentPreset.border} shadow-sm space-y-5 lg:col-span-2`}>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gov-700" />
                    Financial Allocation & Fund Disbursement Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparative audit breakdown of sanctioned project funds vs actual disbursements
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Live Audit Data
                </span>
              </div>

              {/* Progress Visual Component */}
              <div className="space-y-5">
                {/* Visual Bar Spectrum */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span className="text-slate-700 dark:text-slate-300">Sanctioned Budget Allocation</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(metrics.totalProjectValue)}</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700 flex">
                    <div
                      className="h-full bg-gradient-to-r from-gov-700 to-blue-500 rounded-full transition-all duration-1000"
                      style={{
                        width: metrics.totalProjectValue > 0
                          ? `${Math.min(100, Math.max(5, (metrics.totalFundsReleased / metrics.totalProjectValue) * 100))}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Disbursed: {formatCurrency(metrics.totalFundsReleased)}</span>
                    <span>Remaining: {formatCurrency(Math.max(0, metrics.totalProjectValue - metrics.totalFundsReleased))}</span>
                  </div>
                </div>

                {/* 3 Summary Financial Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <p className="text-[11px] font-bold uppercase text-slate-500">Sanctioned Works</p>
                    <p className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(metrics.totalProjectValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                    <p className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-400">Total Disbursed</p>
                    <p className="text-base font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
                      {formatCurrency(metrics.totalFundsReleased)}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1">
                    <p className="text-[11px] font-bold uppercase text-amber-900 dark:text-amber-400">Budget Liquidity</p>
                    <p className="text-base font-extrabold font-mono text-amber-900 dark:text-amber-300">
                      {metrics.totalProjectValue > 0
                        ? `${((metrics.totalFundsReleased / metrics.totalProjectValue) * 100).toFixed(1)}%`
                        : '100%'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Contract Execution Breakdown */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-6 border ${currentPreset.border} shadow-sm space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-gov-700" />
                  Work Status Breakdown
                </h3>
              </div>

              <div className="space-y-3.5 pt-1">
                {[
                  { label: 'In Progress / Active', count: metrics.contractStatusCounts.inProgress, color: 'bg-emerald-500', badge: 'Active Execution' },
                  { label: 'Awarded / Sanctioned', count: metrics.contractStatusCounts.awarded, color: 'bg-blue-500', badge: 'Pre-Execution' },
                  { label: 'Completed Works', count: metrics.contractStatusCounts.completed, color: 'bg-gov-700', badge: 'Fulfilled' },
                  { label: 'On Hold / Under Audit', count: metrics.contractStatusCounts.onHold, color: 'bg-amber-500', badge: 'Review Needed' }
                ].map((item, idx) => {
                  const pct = metrics.totalContracts > 0 ? Math.round((item.count / metrics.totalContracts) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                          {item.label}
                        </span>
                        <span className="font-mono text-slate-900 dark:text-white">{item.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Admin Created Contractors & Transparency Ledger Section */}
          <div className={`${currentPreset.bgCard} ${radiusClass} p-6 border ${currentPreset.border} shadow-sm space-y-4`}>
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-gov-700" />
                    Admin Created Contractors & Permanent Transparency Directory
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    {contractorsData.length} Permanent Profiles (Zero Deletion)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Full ledger of all contractors created by admin. Deletion is permanently blocked; all profiles, contracts, and bills are preserved.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={contractorSearch}
                    onChange={(e) => setContractorSearch(e.target.value)}
                    placeholder="Search contractor name, ID, email..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-500 w-48 sm:w-64"
                  />
                </div>
                <Link
                  to="/admin/contractors"
                  className="px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1 shrink-0"
                >
                  Manage Directory <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Contractors Table */}
            {filteredContractors.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                {contractorSearch ? "No contractor matches your search query." : "No contractors registered yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Contractor Profile</th>
                      <th className="py-2.5 px-3">Company & Reg #</th>
                      <th className="py-2.5 px-3">Contact Information</th>
                      <th className="py-2.5 px-3">Assigned Works & Bills</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredContractors.map((ctr) => {
                      const totalContractValue = (ctr.contracts || []).reduce((acc, c) => {
                        return acc + (c.financials?.contract_value || c.financials?.sanctioned_amount || 0);
                      }, 0);
                      const totalBills = (ctr.contracts || []).reduce((acc, c) => acc + (c.material_bills?.length || 0), 0);

                      return (
                        <tr key={ctr.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <ContractorAvatar
                                photoPath={ctr.photo_path}
                                firstName={ctr.first_name}
                                surname={ctr.surname}
                                size="sm"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {ctr.first_name} {ctr.fathers_name ? `${ctr.fathers_name} ` : ''}{ctr.surname}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 block">{ctr.contractor_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {ctr.company_name || 'Individual Contractor'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Reg: {ctr.contractor_reg_number}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            <div className="space-y-0.5">
                              <span className="block flex items-center gap-1 text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400" /> {ctr.email}
                              </span>
                              <span className="block flex items-center gap-1 text-[11px] font-mono">
                                <Phone className="w-3 h-3 text-slate-400" /> {ctr.mobile_number}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {ctr.contracts?.length || 0} Work Orders
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Val: {formatCurrency(totalContractValue)} {totalBills > 0 && `• ${totalBills} Material Bills`}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ctr.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {ctr.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedContractor(ctr);
                                setIsContractorModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Inspect Details
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

          {/* Quick Action Operations & Citizen Complaints Live Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Recent Complaints Live Feed */}
            <div className={`${currentPreset.bgCard} ${radiusClass} p-6 border ${currentPreset.border} shadow-sm space-y-4 lg:col-span-2`}>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Recent Citizen Complaints & GPS Evidence Feed
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live stream of citizen reports with verified GPS location and photographic proof
                  </p>
                </div>
                <Link
                  to="/admin/complaints"
                  className="px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                >
                  View All Feed ({metrics.pendingComplaintsCount}) <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {complaintsData.length === 0 ? (
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No citizen complaints registered in the system yet.</p>
                  <p className="text-[11px] text-slate-400">Scanned QR code complaint submissions from mobile citizens will automatically show up here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {complaintsData.slice(0, 4).map((cmp) => {
                    const createdDate = cmp.created_at
                      ? new Date(cmp.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Recently';
                    const hasPhotos = cmp.photos && cmp.photos.length > 0;
                    const isNew = cmp.status === 'New';

                    return (
                      <div
                        key={cmp.id}
                        className="p-4 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-50 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{cmp.complaint_id}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              {cmp.issue_category}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isNew
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {cmp.status || 'New'}
                            </span>
                          </div>

                          <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
                            "{cmp.description}"
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span>Date: <strong className="text-slate-700 dark:text-slate-300">{createdDate}</strong></span>
                            {cmp.latitude && cmp.longitude && (
                              <span className="text-emerald-700 font-mono">📍 GPS: {cmp.latitude.toFixed(4)}, {cmp.longitude.toFixed(4)}</span>
                            )}
                            {hasPhotos && (
                              <span className="text-gov-700 font-bold bg-gov-50 px-1.5 py-0.5 rounded">
                                📷 {cmp.photos.length} Photo Evidence
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          to="/admin/complaints"
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg shadow-sm shrink-0 self-end sm:self-center transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-gov-600" /> Review
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 1 Column: Permanent QR Domain Configuration & Operations */}
            <div className="space-y-6">
              
              {/* QR Domain Setup Module */}
              <div className={`${currentPreset.bgCard} ${radiusClass} p-6 border ${currentPreset.border} shadow-sm space-y-4`}>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gov-700" />
                    Public QR Domain Embed
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Configure the base domain URL encoded into public contract QR codes for citizen mobile scanning.
                </p>

                <div className="space-y-3">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="e.g. https://your-domain.ngrok-free.app"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gov-500 font-mono"
                  />
                  <button
                    onClick={handleSavePublicUrl}
                    disabled={savingUrl || !customUrl.trim()}
                    className="w-full py-2.5 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingUrl ? 'Saving URL...' : 'Update QR Base Domain'}
                  </button>

                  {urlMsg && (
                    <div className={`p-2.5 rounded-xl text-xs font-semibold ${urlMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                      {urlMsg.text}
                    </div>
                  )}
                </div>
              </div>

              {/* System Session Status */}
              <div className={`${currentPreset.bgCard} ${radiusClass} p-6 border ${currentPreset.border} shadow-sm space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    System Clearance Status
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <span className="font-bold">Security Level</span>
                    <span className="font-extrabold uppercase text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">High Governance</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50 text-slate-300">
                    <span className="font-bold">Encryption Status</span>
                    <span className="font-mono text-[10px]">256-Bit SSL Enforced</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full py-2 px-3 bg-rose-600/10 hover:bg-rose-600 hover:text-white text-rose-500 text-xs font-bold rounded-xl border border-rose-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Terminate Officer Session</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Contractor Full Details Inspection Modal */}
          {isContractorModalOpen && selectedContractor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden my-auto text-slate-800 dark:text-slate-100">
                {/* Modal Header */}
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <ContractorAvatar
                      photoPath={selectedContractor.photo_path}
                      firstName={selectedContractor.first_name}
                      surname={selectedContractor.surname}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base text-white truncate">
                          {selectedContractor.first_name} {selectedContractor.fathers_name ? `${selectedContractor.fathers_name} ` : ''}{selectedContractor.surname}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedContractor.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {selectedContractor.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        ID: {selectedContractor.contractor_id} • Reg: {selectedContractor.contractor_reg_number}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsContractorModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                  
                  {/* Permanent Retention Notice */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-[11px]">
                      <strong>Permanent Government Record:</strong> This contractor profile was created by the administration and is permanently protected against deletion. All past and ongoing contracts, financial disbursements, and material bills remain intact.
                    </span>
                  </div>

                  {/* Personal & Business Dossier */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal & Contact Details */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-gov-600" /> Personal & Account Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                          <span className="font-semibold">{selectedContractor.first_name} {selectedContractor.fathers_name} {selectedContractor.surname}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Father's Name</span>
                          <span className="font-medium">{selectedContractor.fathers_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                          <span className="font-medium">{selectedContractor.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Number</span>
                          <span className="font-mono font-medium">{selectedContractor.mobile_number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Business Registration */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-gov-600" /> Business & Accreditation
                      </h4>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Company / Enterprise</span>
                          <span className="font-semibold">{selectedContractor.company_name || 'Individual Contractor'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Govt Reg Number</span>
                          <span className="font-mono font-semibold">{selectedContractor.contractor_reg_number}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Business Address</span>
                          <span className="font-medium">{selectedContractor.business_address}, {selectedContractor.district}, {selectedContractor.state} - {selectedContractor.pin_code}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Government Contracts Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-gov-600" /> Assigned Government Contracts & Projects ({selectedContractor.contracts?.length || 0})
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Total Contracts: {selectedContractor.contracts?.length || 0}
                      </span>
                    </div>

                    {!selectedContractor.contracts || selectedContractor.contracts.length === 0 ? (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400">
                        No contracts currently assigned to this contractor profile.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedContractor.contracts.map((cnt) => (
                          <div key={cnt.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{cnt.title}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                    {cnt.status}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {cnt.contract_id} • Dept: {cnt.department} • Office: {cnt.office_name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {cnt.qr_code_token && (
                                  <button
                                    onClick={() => window.open(`/public/project/${cnt.qr_code_token || cnt.contract_id}`, '_blank')}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                  >
                                    <QrCode className="w-3 h-3" /> Public QR View
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Location & Financials */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Contract Value</span>
                                <span className="font-bold font-mono text-blue-900 dark:text-blue-300">
                                  ₹{(cnt.financials?.contract_value || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Sanctioned Budget</span>
                                <span className="font-bold font-mono text-emerald-900 dark:text-emerald-300">
                                  ₹{(cnt.financials?.sanctioned_amount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Physical Progress</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {cnt.progress_percentage || 0}% Complete
                                </span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">Timeline</span>
                                <span className="font-medium text-[10px]">
                                  {cnt.start_date} to {cnt.end_date}
                                </span>
                              </div>
                            </div>

                            {/* Material Purchase Bills */}
                            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1">
                                  <Receipt className="w-3.5 h-3.5 text-blue-600" /> Material Bills ({cnt.material_bills?.length || 0})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Total: ₹{(cnt.material_bills || []).reduce((acc, b) => acc + (b.amount || 0), 0).toLocaleString('en-IN')}
                                </span>
                              </div>

                              {!cnt.material_bills || cnt.material_bills.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                                  No material purchase bills uploaded for this contract yet.
                                </p>
                              ) : (
                                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs min-w-[500px]">
                                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[9px] border-b">
                                        <tr>
                                          <th className="py-2 px-3">Bill # & Date</th>
                                          <th className="py-2 px-3">Supplier / Vendor</th>
                                          <th className="py-2 px-3">Material Description</th>
                                          <th className="py-2 px-3">Amount</th>
                                          <th className="py-2 px-3 text-right">Invoice</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {cnt.material_bills.map((bill) => (
                                          <tr key={bill.id}>
                                            <td className="py-2 px-3">
                                              <span className="font-mono font-bold text-slate-900 dark:text-white block">{bill.bill_number}</span>
                                              <span className="text-[10px] text-slate-400">{bill.bill_date}</span>
                                            </td>
                                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                                              {bill.supplier_name}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                                              {bill.material_description}
                                            </td>
                                            <td className="py-2 px-3 font-mono font-bold text-blue-900 dark:text-blue-300">
                                              ₹{(bill.amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                              {bill.bill_file_path && (
                                                <a
                                                  href={bill.bill_file_path}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded inline-flex items-center gap-1"
                                                >
                                                  <Eye className="w-3 h-3" /> View Bill
                                                </a>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Work Progress Updates */}
                            {cnt.work_updates && cnt.work_updates.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                                <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Work Progress Logs ({cnt.work_updates.length})
                                </span>
                                <div className="space-y-2">
                                  {cnt.work_updates.map((upd) => (
                                    <div key={upd.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900 dark:text-white">{upd.title}</span>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                                          {upd.progress_percentage}% • {upd.work_date}
                                        </span>
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1">{upd.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <Link
                    to="/admin/contractors"
                    className="text-xs text-gov-700 dark:text-gov-400 font-bold hover:underline flex items-center gap-1"
                  >
                    Open in Contractor Directory & Document Manager <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setIsContractorModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
