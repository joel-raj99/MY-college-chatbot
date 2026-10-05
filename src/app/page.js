"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Home() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatStep, setChatStep] = useState('form'); // 'form' or 'chat'
  
  // Lead Form
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', course: '' });
  const [currentLead, setCurrentLead] = useState(null);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPromptBadge, setShowPromptBadge] = useState(true);

  // File Upload State (PDF / Word, max 10MB via MinIO)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Multilingual & Voice Assistant States
  const [selectedLang, setSelectedLang] = useState('en-US'); // 'en-US', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'es-ES', 'fr-FR'
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);

  const LANGUAGES = [
    { code: 'en-US', name: 'English 🇬🇧' },
    { code: 'hi-IN', name: 'Hindi 🇮🇳' },
    { code: 'ta-IN', name: 'Tamil 🇮🇳' },
    { code: 'te-IN', name: 'Telugu 🇮🇳' },
    { code: 'kn-IN', name: 'Kannada 🇮🇳' },
    
  ];

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = selectedLang;

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        // Automatically send the voice input
        handleSendMessage(transcript);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [selectedLang]);

  // Update speech recognition language when selection changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLang;
    }
  }, [selectedLang]);

  // Text-To-Speech function
  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any previous speech
    const cleanText = text.replace(/[*_#`~]/g, ''); // strip markdown
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedLang;

    // Try finding matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(selectedLang.slice(0, 2)));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert("Voice speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
      }
    }
  };

  // Handle File Upload to MinIO (PDF / Word - max 10MB)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    // Check size limit (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File size exceeds 10MB limit! Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      return;
    }

    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      alert("Invalid format! Only PDF (.pdf) and Word documents (.doc, .docx) are allowed.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    // Add uploading indicator message
    setMessages(prev => [...prev, { sender: 'user', text: `📄 Uploading document: ${file.name}...` }]);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const successMsg = `✅ Successfully uploaded '${data.fileName}' (${data.size}) via MinIO Storage. I've attached your document for admission review!`;
        setMessages(prev => [...prev, { sender: 'bot', text: successMsg }]);
        if (autoVoice) speakText(`Your document ${data.fileName} has been uploaded successfully.`);
      } else {
        const errorMsg = `❌ Upload failed: ${data.error || 'Server error'}`;
        setMessages(prev => [...prev, { sender: 'bot', text: errorMsg }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: "❌ Failed to upload document due to network error." }]);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchCollegeData();
    // Auto-hide the chat prompt badge after 8 seconds
    const timer = setTimeout(() => setShowPromptBadge(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatOpen, isTyping]);

  const fetchCollegeData = async () => {
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDb(data);
        if (data?.collegeInfo?.courses?.length > 0) {
          setLeadForm(prev => ({ ...prev, course: data.collegeInfo.courses[0].name }));
        }
      }
    } catch (err) {
      console.error("Error loading college info:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit Lead Form and Start Chat
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.email || !leadForm.phone || !leadForm.course) return;

    setIsTyping(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lead',
          payload: {
            name: leadForm.name,
            email: leadForm.email,
            phone: leadForm.phone,
            course: leadForm.course,
            status: 'New',
            notes: `Enquiry generated online. Interested in: ${leadForm.course}`,
            chatHistory: []
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        // The last added lead will have the newest timestamp, let's find it or get from database response
        const newLead = data.db.leads[data.db.leads.length - 1];
        setCurrentLead(newLead);
        
        // Initialize chat history with greeting
        const greeting = `Hi ${leadForm.name}! Welcome to the ${db?.collegeInfo?.name || 'Apex Institute'} admission helpline. I see you are interested in the **${leadForm.course}** program. 
        
How can I assist you with your admissions today? You can ask about fees, hostel facilities, scholarships, eligibility, or placement details!`;
        
        setMessages([{ sender: 'bot', text: greeting }]);
        setChatStep('chat');
        
        // Update greeting in the database for this lead
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_lead',
            payload: {
              ...newLead,
              chatHistory: [{ sender: 'bot', text: greeting }]
            }
          })
        });
      }
    } catch (err) {
      console.error("Error submitting lead:", err);
    } finally {
      setIsTyping(false);
    }
  };

  // Send Chat message
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text || text.trim() === '' || !currentLead) return;

    if (!textToSend) setInputValue('');
    
    // Add user message to state
    const updatedMessages = [...messages, { sender: 'user', text }];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      // API call to Chat Bot Router with selected language
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          leadId: currentLead.id,
          history: messages,
          language: selectedLang
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
        if (autoVoice) {
          speakText(data.reply);
        }
      } else {
        const fallbackText = "I'm sorry, I encountered a temporary connection issue. Please feel free to email our admission office directly, or try asking me again.";
        setMessages(prev => [...prev, { sender: 'bot', text: fallbackText }]);
        if (autoVoice) speakText(fallbackText);
      }
    } catch (err) {
      console.error(err);
      const errText = "Oops, something went wrong. Please check your network connection.";
      setMessages(prev => [...prev, { sender: 'bot', text: errText }]);
      if (autoVoice) speakText(errText);
    } finally {
      setIsTyping(false);
    }
  };

  // Suggestion click
  const handleSuggestionClick = (keyword) => {
    let question = "";
    switch (keyword) {
      case 'fees': question = `What are the fees for ${currentLead?.course || 'my course'}?`; break;
      case 'hostel': question = "What are the hostel options and hostel fees?"; break;
      case 'scholarship': question = "Do you offer scholarships or financial aid?"; break;
      case 'placements': question = "What is the placement record for the college?"; break;
      case 'admission': question = "What is the application deadline and admission process?"; break;
      default: question = `Tell me more about ${keyword}`;
    }
    handleSendMessage(question);
  };

  if (loading || !db) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Loading College Portal...</p>
        </div>
      </div>
    );
  }

  const { collegeInfo } = db;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col justify-between selection:bg-violet-600 selection:text-white">
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 lg:px-16 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">A</div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900">{collegeInfo.name.toUpperCase()}</h1>
            <p className="text-[10px] text-violet-600 font-semibold tracking-wide uppercase">Admissions 2026-27</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <a href="#about" className="hover:text-violet-600 transition">About</a>
          <a href="#courses" className="hover:text-violet-600 transition">Programs</a>
          <a href="#facilities" className="hover:text-violet-600 transition">Facilities</a>
          <a href="#process" className="hover:text-violet-600 transition">Admissions</a>
        </nav>
        <div>
          <Link
            href="/admin"
            className="flex items-center gap-2 border border-violet-200 hover:border-violet-400 rounded-lg px-4 py-2 text-xs font-bold text-violet-700 hover:text-violet-800 transition bg-violet-50"
          >
            Admin Panel
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-1 bg-white">

        {/* Hero Section */}
        <section className="px-6 lg:px-16 py-20 lg:py-28 relative overflow-hidden bg-linear-to-b from-violet-50/50 via-white to-white">
          <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 text-[11px] font-bold uppercase tracking-wider">
              Accredited Grade A+ Premier Campus
            </span>
            <h2 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-none">
              Your Gateway to Future-Ready <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-600 to-indigo-600">Innovation & Excellence</span>
            </h2>
            <p className="max-w-2xl mx-auto text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              {collegeInfo.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => { setIsChatOpen(true); setChatStep('form'); }}
                className="w-full sm:w-auto px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition transform active:scale-98"
              >
                Apply / Enquire Now
              </button>
              <a 
                href="#courses"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition"
              >
                Explore Courses
              </a>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Excellence & Legacy</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                At {collegeInfo.name}, we believe in creating an environment that sparks curiosity and breeds problem-solvers. Located at {collegeInfo.location}, we bring industry and academia together to deliver a workspace that is intellectually enriching and physically inspiring.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border border-slate-200 bg-slate-50/50 p-5 rounded-xl">
                  <p className="text-2xl font-black text-violet-600">15+</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Years of Legacy</p>
                </div>
                <div className="border border-slate-200 bg-slate-50/50 p-5 rounded-xl">
                  <p className="text-2xl font-black text-violet-600">98%</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">Placement Record</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-base">Admission Office Contact</h4>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{collegeInfo.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{collegeInfo.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{collegeInfo.location}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Have quick queries?</p>
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 mt-1 transition"
                >
                  Chat with Admission Assistant →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Programs / Courses Section */}
        <section id="courses" className="bg-slate-50/50 border-t border-slate-100 py-20 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-violet-600 tracking-wider uppercase">Our Programs</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Undergraduate & Postgraduate Offerings</h3>
              <p className="text-sm text-slate-600 max-w-xl mx-auto font-medium">Explore professional, accredited degrees designed to elevate your professional trajectory.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collegeInfo.courses.map(course => (
                <div key={course.id} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-violet-300 transition">
                  <div className="space-y-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">{course.duration}</span>
                    <h4 className="font-bold text-base text-slate-900">{course.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      <span className="font-bold text-slate-800">Eligibility:</span> {course.eligibility}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tuition Fees</p>
                      <p className="text-sm font-bold text-slate-900">{course.fees}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setLeadForm(prev => ({ ...prev, course: course.name }));
                        setIsChatOpen(true);
                        setChatStep('form');
                      }}
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline transition"
                    >
                      Enquire Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Facilities Section */}
        <section id="facilities" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-100">
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-violet-600 tracking-wider uppercase">Vibrant Campus Life</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">World-Class Campus Facilities</h3>
              <p className="text-sm text-slate-600 max-w-xl mx-auto font-medium">Everything you need to thrive academically, physically, and socially.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collegeInfo.facilities.map((fac, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6 flex items-start gap-4 shadow-xs">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{fac.name}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{fac.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Admission Process Section */}
        <section id="process" className="bg-slate-50/50 border-t border-slate-100 py-20 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-violet-600 tracking-wider uppercase">Admissions Workflow</span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">How To Secure Your Admission</h3>
              <p className="text-sm text-slate-600 max-w-xl mx-auto font-medium">Follow our quick, simple 4-step admission process to secure your seat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {collegeInfo.admissionProcess.map((step, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 relative shadow-xs">
                  <span className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-violet-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">{idx + 1}</span>
                  <h4 className="font-bold text-sm text-slate-900 pt-2">Step {idx + 1}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {step.replace(/^Step \d+: /, '')}
                  </p>
                </div>
              ))}
            </div>

            {/* Timetable/Deadlines */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 max-w-2xl mx-auto shadow-xs">
              <h4 className="font-bold text-slate-900 text-base text-center mb-6">Key Application Dates (Cycle 2026)</h4>
              <div className="space-y-4">
                {collegeInfo.dates.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <span className="text-slate-700">{item.event}</span>
                    <span className="text-violet-600 font-bold">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {collegeInfo.name}. All rights reserved.</p>
        <p className="mt-1 text-[10px]">Accredited Grade A+ Higher Institution | Built with Next.js & OpenRouter AI</p>
      </footer>

      {/* FLOATING CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50">
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="relative h-14 w-14 rounded-full bg-linear-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition cursor-pointer group"
          aria-label="Toggle admission chat bot"
        >
          {isChatOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}

          {/* Micro-animation hover notification badge */}
          {showPromptBadge && !isChatOpen && (
            <span className="absolute -left-44 top-2 bg-white border border-slate-200 text-slate-800 text-[10px] font-bold rounded-lg px-3 py-2 shadow-xl animate-bounce shrink-0 pointer-events-none tracking-tight">
              💬 Enquire Admissions Live!
            </span>
          )}
        </button>

        {/* Chat Drawer */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-87.5 sm:w-95 h-130 rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-fadeIn select-text">
            
            {/* Chat Drawer Header */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">AI</div>
                <div>
                  <h4 className="font-bold text-xs text-white">Apex Admission Assistant</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[9px] text-slate-300 font-semibold uppercase tracking-wider">Online counselor</span>
                  </div>
                </div>
              </div>

              {/* Language Selector & Speech Control */}
              <div className="flex items-center gap-1.5">
                {/* Language Selector Dropdown */}
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-slate-800 text-white text-[10px] font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none cursor-pointer"
                  title="Select Chatbot Language"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>

                {/* Auto Voice Toggle Button */}
                <button
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setAutoVoice(!autoVoice);
                  }}
                  className={`p-1.5 rounded-lg border transition ${
                    autoVoice 
                      ? 'bg-violet-600/30 text-violet-400 border-violet-500/50' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={autoVoice ? "Auto Voice Response Enabled" : "Auto Voice Response Muted"}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {autoVoice ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    )}
                  </svg>
                </button>

                {/* Close Button */}
                <button 
                  onClick={() => {
                    stopSpeaking();
                    setIsChatOpen(false);
                  }}
                  className="text-slate-400 hover:text-white transition p-1"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col">
              
              {/* STEP 1: PRE-CHAT LEAD FORM */}
              {chatStep === 'form' ? (
                <div className="flex-1 flex flex-col justify-center py-2 space-y-4">
                  <div className="text-center space-y-1">
                    <h5 className="font-bold text-sm text-slate-900">Let's Get Started!</h5>
                    <p className="text-[10px] text-slate-500">Introduce yourself to start a live admission chat.</p>
                  </div>
                  
                  <form onSubmit={handleLeadSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email ID</label>
                        <input
                          type="email"
                          placeholder="john@example.com"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+91 95665 93695"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Course of Interest</label>
                      <select
                        value={leadForm.course}
                        onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                      >
                        {collegeInfo.courses.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-md transition mt-4"
                    >
                      Connect & Chat Live
                    </button>
                  </form>
                  <p className="text-[8px] text-center text-slate-400">By starting, you agree to allow admissions representative to follow-up.</p>
                </div>
              ) : (
                /* STEP 2: LIVE CHAT WINDOW */
                <div className="flex-1 flex flex-col justify-between">
                  
                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-75">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed relative group ${
                          msg.sender === 'user'
                            ? 'bg-violet-600 text-white font-medium shadow-xs rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-line">{msg.text}</p>
                          {msg.sender === 'bot' && (
                            <button
                              onClick={() => speakText(msg.text)}
                              className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition"
                              title="Listen to message"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              Listen
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Bot Typing Indicator */}
                    {isTyping && (
                      <div className="flex items-center gap-1.5 pl-1 py-1">
                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="border-t border-slate-200 pt-3 mt-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Quick Enquiry Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'fees', label: '💰 Course Fees' },
                        { id: 'hostel', label: '🏠 Hostels' },
                        { id: 'scholarship', label: '🎓 Scholarships' },
                        { id: 'placements', label: '💼 Placements' },
                        { id: 'admission', label: '📝 Apply Process' }
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => handleSuggestionClick(chip.id)}
                          className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-violet-600 hover:border-violet-300 text-[9px] font-semibold shadow-xs transition"
                          disabled={isTyping}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Chat Drawer Input Footer */}
            {chatStep === 'chat' && (
              <div className="bg-white border-t border-slate-200 p-3 flex gap-1.5 items-center">
                {/* Hidden File Input for PDF / Word */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />

                {/* MinIO File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                    isUploading 
                      ? 'bg-violet-100 text-violet-600 animate-spin' 
                      : 'bg-slate-100 hover:bg-violet-50 hover:text-violet-600 text-slate-600'
                  }`}
                  title="Upload PDF or Word Document (Max 10MB via MinIO)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Speak to Assistant"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <input
                  type="text"
                  placeholder={isListening ? "Listening... speak now..." : "Ask a question or speak..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 transition"
                  disabled={isTyping || isUploading}
                />

                <button
                  onClick={() => handleSendMessage()}
                  className="h-8 w-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shrink-0 transition"
                  disabled={isTyping || isUploading}
                >
                  <svg className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
