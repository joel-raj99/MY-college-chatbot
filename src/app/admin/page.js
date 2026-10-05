"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, crm, college, keywords, aiconfig
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Leads CRM Board search & filter
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadForView, setSelectedLeadForView] = useState(null);

  // Forms states
  const [collegeDetailsForm, setCollegeDetailsForm] = useState({
    name: '', tagline: '', description: '', location: '', email: '', phone: ''
  });
  const [newCourse, setNewCourse] = useState({ name: '', duration: '4 Years', fees: '', eligibility: '' });
  const [newFacility, setNewFacility] = useState({ name: '', description: '' });
  const [newDate, setNewDate] = useState({ event: '', date: '' });
  
  // Keywords states
  const [keywordSearch, setKeywordSearch] = useState('');
  const [keywordForm, setKeywordForm] = useState({ id: null, keyword: '', reply: '' });
  const [isEditingKeyword, setIsEditingKeyword] = useState(false);

  // AI settings state
  const [aiSettingsForm, setAiSettingsForm] = useState({
    mode: 'ai', apiKey: '', provider: 'gemini', systemPrompt: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status notification
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error("Failed to fetch data from database");
      const data = await res.json();
      setDb(data);
      setCollegeDetailsForm(data.collegeInfo);
      setAiSettingsForm(data.settings);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action, payload) => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update database");
      
      setDb(resData.db);
      if (action === 'update_settings') setAiSettingsForm(resData.db.settings);
      if (action === 'update_college_info') setCollegeDetailsForm(resData.db.collegeInfo);
      
      showToast(`${action.replace('_', ' ').toUpperCase()} successful!`);
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Leads columns
  const PIPELINES = ["New", "Contacted", "Follow-up", "Interested", "Admitted", "Closed"];
  const getPipelineColor = (status) => {
    switch (status) {
      case 'New': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Contacted': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Follow-up': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Interested': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'Admitted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Closed': return 'bg-slate-800/60 text-slate-400 border-slate-700/50';
      default: return 'bg-slate-800/40 text-slate-400 border-slate-800/60';
    }
  };

  const getPipelineBorderLeft = (status) => {
    switch (status) {
      case 'New': return 'border-l-sky-500';
      case 'Contacted': return 'border-l-amber-500';
      case 'Follow-up': return 'border-l-indigo-500';
      case 'Interested': return 'border-l-fuchsia-500';
      case 'Admitted': return 'border-l-emerald-500';
      case 'Closed': return 'border-l-slate-600';
      default: return 'border-l-slate-700';
    }
  };

  // College Info Actions
  const handleSaveCollegeDetails = async (e) => {
    e.preventDefault();
    await handleAction('update_college_info', collegeDetailsForm);
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.name || !newCourse.fees) {
      showToast("Course name and fees are required", "error");
      return;
    }
    const updatedCourses = [...db.collegeInfo.courses, { ...newCourse, id: `c-${Date.now()}` }];
    const success = await handleAction('update_college_info', { courses: updatedCourses });
    if (success) setNewCourse({ name: '', duration: '4 Years', fees: '', eligibility: '' });
  };

  const handleDeleteCourse = async (courseId) => {
    const updatedCourses = db.collegeInfo.courses.filter(c => c.id !== courseId);
    await handleAction('update_college_info', { courses: updatedCourses });
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.description) {
      showToast("Facility name and description are required", "error");
      return;
    }
    const updatedFacilities = [...db.collegeInfo.facilities, { ...newFacility }];
    const success = await handleAction('update_college_info', { facilities: updatedFacilities });
    if (success) setNewFacility({ name: '', description: '' });
  };

  const handleDeleteFacility = async (facilityName) => {
    const updatedFacilities = db.collegeInfo.facilities.filter(f => f.name !== facilityName);
    await handleAction('update_college_info', { facilities: updatedFacilities });
  };

  const handleAddDate = async (e) => {
    e.preventDefault();
    if (!newDate.event || !newDate.date) {
      showToast("Event name and date are required", "error");
      return;
    }
    const updatedDates = [...db.collegeInfo.dates, { ...newDate }];
    const success = await handleAction('update_college_info', { dates: updatedDates });
    if (success) setNewDate({ event: '', date: '' });
  };

  const handleDeleteDate = async (eventIndex) => {
    const updatedDates = db.collegeInfo.dates.filter((_, idx) => idx !== eventIndex);
    await handleAction('update_college_info', { dates: updatedDates });
  };

  // Keyword Actions
  const handleSaveKeyword = async (e) => {
    e.preventDefault();
    if (!keywordForm.keyword || !keywordForm.reply) {
      showToast("Keyword and reply are required", "error");
      return;
    }
    const success = await handleAction('save_keyword', keywordForm);
    if (success) {
      setKeywordForm({ id: null, keyword: '', reply: '' });
      setIsEditingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (id) => {
    if (confirm("Are you sure you want to delete this keyword?")) {
      await handleAction('delete_keyword', { id });
    }
  };

  // AI settings
  const handleSaveAiSettings = async (e) => {
    e.preventDefault();
    await handleAction('update_settings', aiSettingsForm);
  };

  // Leads calculations for dashboard
  const getDashboardStats = () => {
    if (!db || !db.leads) return { total: 0, new: 0, admitted: 0, rate: 0 };
    const total = db.leads.length;
    const newLeads = db.leads.filter(l => l.status === 'New').length;
    const admittedLeads = db.leads.filter(l => l.status === 'Admitted').length;
    const interestedOrAdmitted = db.leads.filter(l => ['Interested', 'Admitted'].includes(l.status)).length;
    const rate = total > 0 ? Math.round((interestedOrAdmitted / total) * 100) : 0;
    return { total, new: newLeads, admitted: admittedLeads, rate };
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');

    setTimeout(() => {
      if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid username or password. (Default: admin / admin123)');
      }
      setIsSubmitting(false);
    }, 600);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-white text-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Animated Background Decorative Elements */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-100 rounded-full blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Login Box Container with entrance animation */}
        <div className="w-full max-w-md bg-white border border-black/10 rounded-2xl p-8 shadow-2xl relative z-10 animate-fadeIn transform transition-all hover:shadow-black/5">
          
          {/* Header & Logo with animation */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-black">Admin Panel Login</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Please enter your credentials to access management console</p>
          </div>

          {/* Error Message Display */}
          {loginError && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-shake">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (e.g. admin)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm text-black placeholder-gray-400 focus:bg-white focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (e.g. admin123)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm text-black placeholder-gray-400 focus:bg-white focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Public Website
            </Link>
          </div>

        </div>
      </div>
    );
  }

  const stats = getDashboardStats();
  const filteredLeads = db.leads.filter(lead => {
    const searchString = `${lead.name} ${lead.course} ${lead.email} ${lead.phone}`.toLowerCase();
    return searchString.includes(leadSearch.toLowerCase());
  });

  return (
    <div className="flex min-h-screen bg-slate-50/50 font-sans text-slate-900">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3.5 shadow-xl backdrop-blur-md transition duration-300 animate-fadeIn ${
          toast.type === 'error' 
            ? 'border-red-200 bg-red-50 text-red-800' 
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>
          {toast.type === 'error' ? (
            <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-lg bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">A</div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 line-clamp-1">APEX ADMIN</h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Admission CRM</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
              { id: 'crm', name: 'Leads CRM Pipeline', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
              { id: 'college', name: 'College Details', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { id: 'keywords', name: 'Keywords & FAQs', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
              { id: 'aiconfig', name: 'AI Settings', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedLeadForView(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white font-semibold shadow-md shadow-violet-500/15'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Chatbot Mode</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`h-2 w-2 rounded-full ${db.settings.mode === 'ai' && db.settings.apiKey ? 'bg-emerald-500 shadow-sm' : 'bg-amber-500 shadow-sm'}`}></span>
              <p className="text-xs font-semibold text-slate-700">
                {db.settings.mode === 'ai' && db.settings.apiKey ? 'AI Agent Enabled' : 'Rule-Based Active'}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-center text-xs font-bold text-violet-700 hover:text-violet-800 border border-violet-200 hover:border-violet-300 rounded-lg py-2.5 transition bg-violet-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Go to College Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-200 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'crm' && 'Leads CRM Pipeline'}
              {activeTab === 'college' && 'College Details Manager'}
              {activeTab === 'keywords' && 'Keywords & Fallback Replies'}
              {activeTab === 'aiconfig' && 'AI Settings & Integrations'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800">Logged in as Admin</p>
              <p className="text-[10px] text-slate-500 font-bold">{db?.collegeInfo?.name || 'College Admin'}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-xs font-bold text-violet-700">
              AD
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="ml-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
              title="Log out"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Quick statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-between shadow-xs hover:border-violet-300 hover:shadow-md transition-all duration-300 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{stats.total}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-between shadow-xs hover:border-sky-300 hover:shadow-md transition-all duration-300 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Enquiries</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{stats.new}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-between shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-300 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admitted Students</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{stats.admitted}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-between shadow-xs hover:border-fuchsia-300 hover:shadow-md transition-all duration-300 group">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interested/Admit Rate</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1.5">{stats.rate}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* CRM Pipeline Conversion & Popular Courses */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base mb-4">Leads by Status Pipeline</h3>
                  <div className="space-y-4">
                    {PIPELINES.map(status => {
                      const count = db.leads.filter(l => l.status === status).length;
                      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-700">{status}</span>
                            <span className="text-slate-500">{count} lead{count !== 1 ? 's' : ''} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                status === 'New' ? 'bg-sky-500' :
                                status === 'Contacted' ? 'bg-amber-500' :
                                status === 'Follow-up' ? 'bg-indigo-500' :
                                status === 'Interested' ? 'bg-fuchsia-500' :
                                status === 'Admitted' ? 'bg-emerald-500' :
                                'bg-slate-400'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base mb-4">Popular Courses Interested</h3>
                  <div className="space-y-4">
                    {db.collegeInfo.courses.map(course => {
                      const count = db.leads.filter(l => l.course === course.name).length;
                      const maxCount = Math.max(...db.collegeInfo.courses.map(c => db.leads.filter(l => l.course === c.name).length), 1);
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div key={course.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-700 font-medium truncate max-w-50">{course.name}</span>
                            <span className="text-slate-600 font-bold shrink-0">{count}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-violet-600" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Recent leads table */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-base">Recent Enquiries</h3>
                  <button onClick={() => setActiveTab('crm')} className="text-xs font-bold text-violet-600 hover:text-violet-700 transition">View CRM Pipeline →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email / Phone</th>
                        <th className="py-3 px-4">Interested Course</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.leads.slice(0, 5).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50 text-slate-700">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{lead.name}</td>
                          <td className="py-3.5 px-4">
                            <div>{lead.email}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{lead.phone}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-800">{lead.course}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPipelineColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CRM LEADS PIPELINE TAB */}
          {activeTab === 'crm' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Search and view options */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search leads by name, email, phone, or course..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                  />
                </div>
                <div className="text-xs text-slate-500 font-semibold shrink-0">
                  Showing {filteredLeads.length} of {db.leads.length} leads
                </div>
              </div>

              {/* Kanban Pipelines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
                {PIPELINES.map(status => {
                  const statusLeads = filteredLeads.filter(l => l.status === status);
                  return (
                    <div key={status} className="flex flex-col min-w-55 rounded-xl bg-slate-100/70 border border-slate-200 p-3 h-150">
                      
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2 px-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            status === 'New' ? 'bg-sky-500 shadow-xs' :
                            status === 'Contacted' ? 'bg-amber-500 shadow-xs' :
                            status === 'Follow-up' ? 'bg-indigo-500 shadow-xs' :
                            status === 'Interested' ? 'bg-fuchsia-500 shadow-xs' :
                            status === 'Admitted' ? 'bg-emerald-500 shadow-xs' :
                            'bg-slate-400'
                          }`}></span>
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">{status}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{statusLeads.length}</span>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                        {statusLeads.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-24 border border-dashed border-slate-300 rounded-lg text-slate-400 text-[10px] font-semibold tracking-wide bg-white/50">
                            No Leads
                          </div>
                        ) : (
                          statusLeads.map(lead => (
                            <div 
                              key={lead.id} 
                              onClick={() => setSelectedLeadForView(lead)}
                              className={`group border border-slate-200 bg-white hover:bg-slate-50 p-3.5 rounded-xl cursor-pointer transition-all duration-200 border-l-4 ${getPipelineBorderLeft(lead.status)} shadow-xs hover:shadow-md flex flex-col justify-between`}
                            >
                              <div>
                                <h5 className="font-semibold text-xs text-slate-900 group-hover:text-violet-700 transition truncate">{lead.name}</h5>
                                <p className="text-[10px] text-slate-500 mt-1 truncate">{lead.course}</p>
                                {lead.notes && (
                                  <p className="text-[9px] text-slate-500 italic mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-1.5 rounded">
                                    "{lead.notes}"
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-3.5 border-t border-slate-100 pt-2 text-[8px] text-slate-400 font-bold">
                                <span>{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                <span className="group-hover:text-violet-600 transition uppercase tracking-wider">Details →</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lead Details Modal / Slide-out */}
              {selectedLeadForView && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
                  <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full p-8 overflow-y-auto flex flex-col justify-between shadow-2xl">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-6">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedLeadForView.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPipelineColor(selectedLeadForView.status)}`}>
                              {selectedLeadForView.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Lead ID: {selectedLeadForView.id}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedLeadForView(null)} 
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Content Form */}
                      <div className="space-y-6">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <a href={`mailto:${selectedLeadForView.email}`} className="text-sm font-medium text-violet-600 hover:underline block mt-1">{selectedLeadForView.email}</a>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                            <a href={`tel:${selectedLeadForView.phone}`} className="text-sm font-medium text-violet-600 hover:underline block mt-1">{selectedLeadForView.phone}</a>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interested Course</label>
                          <p className="text-sm font-medium text-slate-800 mt-1">{selectedLeadForView.course}</p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Change Pipeline Status</label>
                          <div className="flex flex-wrap gap-2">
                            {PIPELINES.map(status => (
                              <button
                                key={status}
                                onClick={async () => {
                                  const updatedLead = { ...selectedLeadForView, status };
                                  setSelectedLeadForView(updatedLead);
                                  await handleAction('update_lead_status', { id: selectedLeadForView.id, status });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                  selectedLeadForView.status === status
                                    ? status === 'New' ? 'bg-sky-100 border-sky-300 text-sky-800 font-bold shadow-xs' :
                                      status === 'Contacted' ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold shadow-xs' :
                                      status === 'Follow-up' ? 'bg-indigo-100 border-indigo-300 text-indigo-800 font-bold shadow-xs' :
                                      status === 'Interested' ? 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800 font-bold shadow-xs' :
                                      status === 'Admitted' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold shadow-xs' :
                                      'bg-slate-200 border-slate-300 text-slate-800 font-bold'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internal Follow-up Notes</label>
                          <textarea
                            value={selectedLeadForView.notes || ''}
                            onChange={async (e) => {
                              const updatedNotes = e.target.value;
                              const updatedLead = { ...selectedLeadForView, notes: updatedNotes };
                              setSelectedLeadForView(updatedLead);
                              await handleAction('update_lead_notes', { id: selectedLeadForView.id, notes: updatedNotes });
                            }}
                            placeholder="Add notes about student eligibility, documents submitted, callbacks scheduled, etc."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          />
                        </div>

                        {/* Conversational transcript */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Student Chatbot Transcript</label>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3">
                            {(!selectedLeadForView.chatHistory || selectedLeadForView.chatHistory.length === 0) ? (
                              <p className="text-xs text-slate-400 text-center py-4 italic">No conversation log available.</p>
                            ) : (
                              selectedLeadForView.chatHistory.map((chat, idx) => (
                                <div key={idx} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                                    chat.sender === 'user'
                                      ? 'bg-violet-600 text-white shadow-xs'
                                      : 'bg-white text-slate-800 border border-slate-200 shadow-xs'
                                  }`}>
                                    <p className="whitespace-pre-line">{chat.text}</p>
                                  </div>
                                  <span className="text-[8px] text-slate-400 font-semibold mt-1 px-1">
                                    {chat.sender === 'user' ? 'Student' : 'Bot'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6 mt-8 flex items-center justify-between">
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to permanently delete lead ${selectedLeadForView.name}?`)) {
                            const success = await handleAction('delete_lead', { id: selectedLeadForView.id });
                            if (success) setSelectedLeadForView(null);
                          }
                        }}
                        className="text-xs font-bold text-red-600 hover:text-red-700 transition"
                      >
                        Delete Lead Account
                      </button>
                      <button
                        onClick={() => setSelectedLeadForView(null)}
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* COLLEGE INFORMATION TAB */}
          {activeTab === 'college' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* College Details Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-base mb-4">College Profile Details</h3>
                <form onSubmit={handleSaveCollegeDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">College Name</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.name}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tagline / Motto</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.tagline}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, tagline: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">General Description</label>
                    <textarea
                      value={collegeDetailsForm.description}
                      onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, description: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Campus Location</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.location}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, location: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={collegeDetailsForm.email}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={collegeDetailsForm.phone}
                        onChange={(e) => setCollegeDetailsForm({ ...collegeDetailsForm, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-md transition">Save Profile Changes</button>
                  </div>
                </form>
              </div>

              {/* Courses offered */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Courses List */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-4 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base">Offered Programs / Courses</h3>
                  <div className="divide-y divide-slate-100 space-y-3">
                    {db.collegeInfo.courses.map(course => (
                      <div key={course.id} className="pt-3 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{course.name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-semibold">
                            <span>Duration: {course.duration}</span>
                            <span>Fees: {course.fees}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            <span className="font-bold text-slate-700 text-[10px] uppercase">Eligibility:</span> {course.eligibility}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 p-1 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Course Form */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 h-fit shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base mb-4">Add New Course</h3>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Course Name</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Computer Science"
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duration</label>
                        <select
                          value={newCourse.duration}
                          onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        >
                          <option>1 Year</option>
                          <option>2 Years</option>
                          <option>3 Years</option>
                          <option>4 Years</option>
                          <option>5 Years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fees (₹ / year)</label>
                        <input
                          type="text"
                          placeholder="e.g. ₹1,50,000 / year"
                          value={newCourse.fees}
                          onChange={(e) => setNewCourse({ ...newCourse, fees: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Eligibility Criteria</label>
                      <textarea
                        placeholder="e.g. High school graduate with science background, minimum 70% aggregate"
                        value={newCourse.eligibility}
                        onChange={(e) => setNewCourse({ ...newCourse, eligibility: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                      />
                    </div>

                    <button type="submit" className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-md transition">Create Course</button>
                  </form>
                </div>

              </div>

              {/* Campus Facilities & Deadlines */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Facilities */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base">Campus Facilities</h3>
                  <div className="divide-y divide-slate-100 space-y-3">
                    {db.collegeInfo.facilities.map((fac, idx) => (
                      <div key={idx} className="pt-3 flex justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{fac.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{fac.description}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteFacility(fac.name)}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 shrink-0 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddFacility} className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900">Add Campus Facility</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Facility Name"
                        value={newFacility.name}
                        onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Short description"
                        value={newFacility.description}
                        onChange={(e) => setNewFacility({ ...newFacility, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition">Add Facility</button>
                  </form>
                </div>

                {/* Deadlines */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base">Key Dates & Deadlines</h3>
                  <div className="divide-y divide-slate-100 space-y-3">
                    {db.collegeInfo.dates.map((item, idx) => (
                      <div key={idx} className="pt-3 flex justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{item.event}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{item.date}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteDate(idx)}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 shrink-0 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddDate} className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                    <h4 className="font-bold text-xs text-slate-900">Add Important Date</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Event (e.g. Merit Test)"
                        value={newDate.event}
                        onChange={(e) => setNewDate({ ...newDate, event: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Date (e.g. October 15, 2026)"
                        value={newDate.date}
                        onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition">Add Deadline</button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* KEYWORDS & RULES TAB */}
          {activeTab === 'keywords' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Keywords List */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-base">Configured Keywords & Replies</h3>
                    <input
                      type="text"
                      placeholder="Filter keywords..."
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                    />
                  </div>
                  
                  <div className="space-y-4 max-h-125 overflow-y-auto pr-2">
                    {db.keywords
                      .filter(kw => kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase()))
                      .map(kw => (
                        <div key={kw.id} className="border border-slate-200 bg-slate-50/50 p-4 rounded-lg flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="inline-block px-2.5 py-1 rounded bg-violet-100 text-violet-800 font-mono text-xs font-bold uppercase tracking-wider">
                              {kw.keyword}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setKeywordForm(kw);
                                  setIsEditingKeyword(true);
                                }}
                                className="text-xs font-bold text-violet-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteKeyword(kw.id)}
                                className="text-xs font-bold text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 mt-2.5 leading-relaxed">{kw.reply}</p>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Edit / Add Keyword Form */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 h-fit space-y-4 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-base">
                    {isEditingKeyword ? 'Edit Keyword Rule' : 'Create Keyword Rule'}
                  </h3>
                  <form onSubmit={handleSaveKeyword} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trigger Keyword</label>
                      <input
                        type="text"
                        placeholder="e.g. hostel"
                        value={keywordForm.keyword}
                        onChange={(e) => setKeywordForm({ ...keywordForm, keyword: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono transition"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">If user query contains this word, bot replies with the text below.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bot Reply</label>
                      <textarea
                        placeholder="Enter the response for this keyword..."
                        value={keywordForm.reply}
                        onChange={(e) => setKeywordForm({ ...keywordForm, reply: e.target.value })}
                        rows={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed transition"
                        required
                      />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button type="submit" className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-md transition">
                        {isEditingKeyword ? 'Update Rule' : 'Save Rule'}
                      </button>
                      {isEditingKeyword && (
                        <button
                          type="button"
                          onClick={() => {
                            setKeywordForm({ id: null, keyword: '', reply: '' });
                            setIsEditingKeyword(false);
                          }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* AI SETTINGS & INTEGRATIONS TAB */}
          {activeTab === 'aiconfig' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-base mb-4">AI Agent Engine Configuration</h3>
                
                <form onSubmit={handleSaveAiSettings} className="space-y-6">
                  
                  {/* Mode Selector */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900">Chatbot Engine Mode</label>
                      <p className="text-xs text-slate-500 mt-0.5">Toggle between AI Agent and static rule-based system.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAiSettingsForm({ ...aiSettingsForm, mode: 'keyword' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          aiSettingsForm.mode === 'keyword'
                            ? 'bg-slate-200 text-slate-900 border border-slate-300'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Rule-Based Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiSettingsForm({ ...aiSettingsForm, mode: 'ai' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          aiSettingsForm.mode === 'ai'
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        AI Agent
                      </button>
                    </div>
                  </div>

                  {/* AI Provider */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Provider</label>
                    <select
                      value={aiSettingsForm.provider || 'openrouter'}
                      onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, provider: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="openrouter">OpenRouter API (Text-to-Text RAG)</option>
                      <option value="gemini">Google Gemini API (gemini-1.5-flash)</option>
                    </select>
                  </div>

                  {/* Model Selection for OpenRouter */}
                  {aiSettingsForm.provider === 'openrouter' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">OpenRouter Model</label>
                      <input
                        type="text"
                        placeholder="openai/gpt-3.5-turbo"
                        value={aiSettingsForm.model || 'openai/gpt-3.5-turbo'}
                        onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, model: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono tracking-wider transition"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Specify model slug e.g. openai/gpt-3.5-turbo, anthropic/claude-3-haiku, or meta-llama/llama-3-8b-instruct.</p>
                    </div>
                  )}

                  {/* API Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {aiSettingsForm.provider === 'openrouter' ? 'OpenRouter API Key (sk-or-v1-...)' : 'Gemini API Key'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[10px] font-bold text-violet-600 hover:underline"
                      >
                        {showApiKey ? 'Hide Key' : 'Reveal Key'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk-or-v1-..."
                        value={aiSettingsForm.apiKey || ''}
                        onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, apiKey: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono tracking-wider transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">If the key is left empty, the bot will automatically fall back to Keyword/Rule-Based mode.</p>
                  </div>

                  {/* System Prompt / Persona */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Agent System Instruction Persona</label>
                    <textarea
                      value={aiSettingsForm.systemPrompt}
                      onChange={(e) => setAiSettingsForm({ ...aiSettingsForm, systemPrompt: e.target.value })}
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed transition"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                      The core profile instructions given to the LLM. The AI Agent will read this prompt AND the college database before replying to students.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-bold text-white shadow-md transition">Save AI Configurations</button>
                  </div>

                </form>

              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}
