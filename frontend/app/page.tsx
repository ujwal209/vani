"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import VoiceMicRecorder from "./components/VoiceMicRecorder";
import PolicyResult, { PolicyResponseData } from "./components/PolicyResult";
import SchemeCards from "./components/SchemeCards";
import AudioPlayer from "./components/AudioPlayer";
import LanguageSelector from "./components/LanguageSelector";
import { useAuth } from "./context/AuthContext";
import { getTranslation } from "./utils/translations";
import {
  Mic,
  Search,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Send,
  Square,
  Loader2,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  X
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  audioBase64?: string | null;
  sources?: any[];
  modelUsed?: string;
  language?: string;
  state?: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { label: "PM-Kisan Eligibility & Benefits", query: "What is PM Kisan Samman Nidhi scheme eligibility, benefits of 6000 rupees and how to register online?", category: "Agriculture" },
  { label: "Ayushman Bharat Golden Card", query: "How to get Ayushman Bharat golden card for 5 lakh free health insurance policy?", category: "Healthcare" },
  { label: "PM Awas Yojana House Subsidy", query: "PM Awas Yojana Gramin eligibility list, financial subsidy for building house and application process", category: "Housing" },
  { label: "MNREGA 100 Days Job Card", query: "How to apply for MNREGA job card and get 100 days guaranteed wage employment in village?", category: "Employment" },
];

export default function AppMainPage() {
  const { token, language, state } = useAuth();
  const t = getTranslation(language);

  // App View Mode: "voice_portal" vs "chat_mode"
  const [viewMode, setViewMode] = useState<"voice_portal" | "chat_mode">("voice_portal");

  // MODE 1: Voice & Policy Assistant State
  const [activeTab, setActiveTab] = useState<"voice" | "text">("voice");
  const [portalQuery, setPortalQuery] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalResult, setPortalResult] = useState<PolicyResponseData | null>(null);
  const [portalError, setPortalError] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  // MODE 2: AI Chat State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatRecording, setIsChatRecording] = useState(false);
  const [chatRecordTime, setChatRecordTime] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatAudioChunksRef = useRef<Blob[]>([]);
  const chatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (token) {
      fetch(`${BACKEND_URL}/api/vani/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.history) {
            setHistory(data.history);
          }
        })
        .catch((err) => console.log("Error loading history:", err));
    }
  }, [token, portalResult]);

  useEffect(() => {
    if (viewMode === "chat_mode") {
      scrollToBottom();
    }
  }, [messages, chatLoading, viewMode]);

  // FULL MARKDOWN PARSER: Strips ###, ##, #, **, bullet points, and numbered lists into clean HTML
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      let cleanLine = line.trim();
      if (!cleanLine) {
        elements.push(<div key={index} className="h-1.5" />);
        return;
      }

      // Handle ### or ## or # Headings
      if (cleanLine.startsWith("#")) {
        cleanLine = cleanLine.replace(/^#+\s*/, "");
        elements.push(
          <h4 key={index} className="font-bold text-gray-900 text-xs sm:text-sm mt-3 mb-1 border-b border-gray-200 pb-1">
            {parseInlineFormatting(cleanLine)}
          </h4>
        );
        return;
      }

      // Handle Bullet points (- or *)
      if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
        const content = cleanLine.replace(/^[-*]\s*/, "");
        elements.push(
          <li key={index} className="ml-4 list-disc my-1 text-gray-800 text-xs sm:text-sm leading-relaxed">
            {parseInlineFormatting(content)}
          </li>
        );
        return;
      }

      // Handle Numbered lists (1. 2. 3.)
      if (/^\d+\.\s/.test(cleanLine)) {
        const content = cleanLine.replace(/^\d+\.\s*/, "");
        elements.push(
          <li key={index} className="ml-4 list-decimal my-1 text-gray-800 text-xs sm:text-sm leading-relaxed">
            {parseInlineFormatting(content)}
          </li>
        );
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={index} className="my-1.5 text-gray-800 leading-relaxed text-xs sm:text-sm">
          {parseInlineFormatting(cleanLine)}
        </p>
      );
    });

    return elements;
  };

  const parseInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // --- MODE 1 HANDLERS ---
  const handlePortalTextSubmit = async (e?: React.FormEvent, customQuery?: str) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || portalQuery;
    if (!queryToUse || !queryToUse.trim()) return;

    setPortalError("");
    setPortalLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/vani/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: queryToUse.trim(),
          language: language,
          state: state,
          generate_audio: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Query failed");

      setPortalResult(data);
      window.scrollTo({ top: 380, behavior: "smooth" });
    } catch (err: any) {
      setPortalError(err.message || "Failed to process query.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePortalAudioRecorded = async (audioBlob: Blob) => {
    setPortalError("");
    setPortalLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice_input.wav");
      formData.append("language", language);
      formData.append("state", state);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/vani/voice-query`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Voice query failed");

      if (!data.success) {
        throw new Error(data.error || "Could not recognize voice speech.");
      }

      setPortalResult(data);
      window.scrollTo({ top: 380, behavior: "smooth" });
    } catch (err: any) {
      setPortalError(err.message || "Failed to process voice recording.");
    } finally {
      setPortalLoading(false);
    }
  };

  // --- MODE 2 CHAT HANDLERS ---
  const handleSendChat = async (customText?: str) => {
    const query = customText || chatInput;
    if (!query || !query.trim() || chatLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/vani/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: query.trim(),
          language: language,
          state: state,
          generate_audio: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Query failed");

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: data.response_text,
        audioBase64: data.audio_base64,
        sources: data.sources,
        modelUsed: data.model_used,
        language: data.language,
        state: data.state,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "Connection error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const startChatRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chatMediaRecorderRef.current = mediaRecorder;
      chatAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chatAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chatAudioChunksRef.current, { type: "audio/wav" });
        stream.getTracks().forEach((track) => track.stop());
        await processChatVoiceBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsChatRecording(true);
      setChatRecordTime(0);

      chatTimerRef.current = setInterval(() => {
        setChatRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone permission required.");
    }
  };

  const stopChatRecording = () => {
    if (chatMediaRecorderRef.current && isChatRecording) {
      chatMediaRecorderRef.current.stop();
      setIsChatRecording(false);
      if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    }
  };

  const processChatVoiceBlob = async (audioBlob: Blob) => {
    setChatLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice_input.wav");
      formData.append("language", language);
      formData.append("state", state);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/vani/voice-query`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Voice processing failed");

      if (data.transcript) {
        const userMsg: Message = {
          id: Date.now().toString(),
          sender: "user",
          text: data.transcript,
          timestamp: new Date(),
        };
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.response_text,
          audioBase64: data.audio_base64,
          sources: data.sources,
          modelUsed: data.model_used,
          language: data.language,
          state: data.state,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg, botMsg]);
      }
    } catch (err: any) {
      console.log("Voice chat error:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace("www.", "");
    } catch (e) {
      return "gov.in";
    }
  };

  const getFaviconUrl = (urlStr: string) => {
    const domain = getDomain(urlStr);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* Header - Fixed Height */}
      <div className="flex-shrink-0">
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
      </div>

      {/* Mode Switcher Banner - Fixed Height */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-2">
        <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-2">
          <span className="font-bold text-[11px] sm:text-xs text-gray-700 uppercase tracking-wider google-sans-bold truncate">
            Interface View:
          </span>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode("voice_portal")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "voice_portal"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Voice Portal
            </button>

            <button
              onClick={() => setViewMode("chat_mode")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "chat_mode"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Vani GPT Chat
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: VOICE & POLICY PORTAL INTERFACE                  */}
      {/* ======================================================== */}
      {viewMode === "voice_portal" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          {/* Hero Section */}
          <div className="bg-white border-b border-gray-200 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 flex-shrink-0">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
                Government Policy Directory
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight google-sans-bold">
                {t.title}
              </h1>

              <p className="mt-2 text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed google-sans-regular">
                {t.subtitle}
              </p>

              {/* Mode Tabs (Voice vs Text) */}
              <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl mt-5 sm:mt-6 border border-gray-200">
                <button
                  onClick={() => setActiveTab("voice")}
                  className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "voice"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Mic size={14} />
                  <span>{t.voiceSearch}</span>
                </button>
                <button
                  onClick={() => setActiveTab("text")}
                  className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "text"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Search size={14} />
                  <span>{t.textSearch}</span>
                </button>
              </div>

              {/* Input Container */}
              <div className="mt-5 sm:mt-6 max-w-xl mx-auto">
                {activeTab === "voice" ? (
                  <VoiceMicRecorder
                    onAudioRecorded={handlePortalAudioRecorded}
                    isProcessing={portalLoading}
                  />
                ) : (
                  <form onSubmit={handlePortalTextSubmit} className="relative">
                    <input
                      type="text"
                      value={portalQuery}
                      onChange={(e) => setPortalQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full pl-4 pr-24 sm:pr-28 py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      disabled={portalLoading || !portalQuery.trim()}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 sm:px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition flex items-center gap-1"
                    >
                      {portalLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Search size={14} />
                          <span className="hidden sm:inline">{t.searchBtn}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {portalError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {portalError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Active Policy Result */}
            {portalResult && <PolicyResult data={portalResult} />}

            {/* Scheme Cards */}
            <SchemeCards
              onSelectScheme={(query) => {
                setPortalQuery(query);
                handlePortalTextSubmit(undefined, query);
              }}
            />
          </main>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: VANI GPT CHAT MODE (ELEGANT CHAT BUBBLES)        */}
      {/* ======================================================== */}
      {viewMode === "chat_mode" && (
        <div className="flex-1 min-h-0 flex overflow-hidden relative bg-white">
          
          {/* Mobile Overlay Sidebar Backdrop */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs z-40 sm:hidden"
            />
          )}

          {/* Sidebar Drawer */}
          <aside
            className={`${
              sidebarOpen
                ? "translate-x-0 w-72"
                : "-translate-x-full w-0 sm:translate-x-0 sm:w-0"
            } fixed sm:relative inset-y-0 left-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden z-50 sm:z-20 flex-shrink-0 h-full`}
          >
            <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setMessages([]);
                  setSidebarOpen(false);
                }}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus size={16} />
                <span>New Chat</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
              <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {t.history}
              </div>

              {history && history.length > 0 ? (
                history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendChat(item.query);
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50 text-xs text-gray-700 hover:text-blue-700 transition flex items-start gap-2.5 group truncate"
                  >
                    <MessageSquare size={14} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="truncate min-w-0 flex-1">
                      <p className="font-semibold truncate text-gray-900 group-hover:text-blue-600">
                        "{item.query}"
                      </p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-gray-400 italic">
                  No past chat history.
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 text-[11px] text-gray-500 text-center flex-shrink-0">
              Vani GPT • Live Search & AI Engine
            </div>
          </aside>

          {/* MAIN CHAT STREAM CONTAINER (COMPACT CENTERED CHAT) */}
          <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden relative bg-white">
            
            {/* Top Control Bar */}
            <div className="h-10 border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="Toggle History Sidebar"
                >
                  <PanelLeft size={16} />
                </button>
                <span className="text-xs font-bold text-gray-800">
                  Vani GPT Chat Stream
                </span>
              </div>
            </div>

            {/* CHAT MESSAGES STREAM - ELEGANT COMPACT BUBBLES */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-6 space-y-4 max-w-4xl w-full mx-auto">
              {messages.length === 0 && (
                <div className="max-w-xl mx-auto my-auto text-center py-6 sm:py-12 px-3">
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2 google-sans-bold">
                    Vani GPT Assistant
                  </h2>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
                    Ask questions in natural language and receive policy guidance with live government web sources.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-lg mx-auto">
                    {SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(s.query)}
                        className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/40 text-xs font-semibold text-gray-800 hover:text-blue-700 transition"
                      >
                        <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider mb-1">
                          {s.category}
                        </span>
                        <span className="line-clamp-1">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Assistant Avatar */}
                  {msg.sender === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      V
                    </div>
                  )}

                  {/* Compact Message Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white font-medium rounded-tr-xs"
                        : "bg-gray-50 border border-gray-200 text-gray-900 rounded-tl-xs"
                    }`}
                  >
                    {msg.sender === "user" && <p className="whitespace-pre-wrap">{msg.text}</p>}

                    {msg.sender === "assistant" && (
                      <div>
                        {/* Audio Voice Player */}
                        {msg.audioBase64 && (
                          <AudioPlayer audioBase64={msg.audioBase64} autoPlay={true} />
                        )}

                        {/* Fully Parsed Markdown Text */}
                        <div className="text-gray-800">
                          {renderMarkdown(msg.text)}
                        </div>

                        {/* Copy Action */}
                        <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            Language: {msg.language || language} • State: {msg.state || state}
                          </span>
                          <button
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px]"
                          >
                            {copiedId === msg.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                            <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                          </button>
                        </div>

                        {/* Live Government Web Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-gray-200">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                              <ShieldCheck size={13} className="text-blue-600" />
                              Official Sources
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.sources.map((src, i) => {
                                const domain = getDomain(src.url);
                                const favicon = getFaviconUrl(src.url);
                                return (
                                  <a
                                    key={i}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-lg bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition group"
                                  >
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <img
                                        src={favicon}
                                        alt={domain}
                                        className="w-4 h-4 rounded-xs object-contain flex-shrink-0 bg-white"
                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                      />
                                      <span className="font-bold text-[11px] text-gray-900 group-hover:text-blue-600 truncate">
                                        {domain}
                                      </span>
                                      <ExternalLink size={10} className="text-gray-400 ml-auto flex-shrink-0" />
                                    </div>
                                    <p className="text-[11px] text-gray-600 line-clamp-1 font-medium">
                                      {src.title}
                                    </p>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.sender === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      U
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-2.5 max-w-3xl mr-auto">
                  <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    V
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 text-xs flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Searching official sources & generating response...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* CHATGPT STYLE PROMPT CONTAINER - STRICTLY LOCKED AT BOTTOM */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex-shrink-0 shadow-lg z-10">
              <div className="max-w-3xl mx-auto">
                
                {isChatRecording && (
                  <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-600 font-bold animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span>Listening... ({chatRecordTime}s)</span>
                    </div>
                    <button
                      onClick={stopChatRecording}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold"
                    >
                      Done Speaking
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="relative flex items-center bg-gray-50 border border-gray-300 rounded-2xl sm:rounded-3xl p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white shadow-xs transition-all"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-4 pr-24 py-3 sm:py-3.5 bg-transparent text-gray-900 text-xs sm:text-base focus:outline-none placeholder-gray-400 font-medium"
                  />

                  <div className="absolute right-2 flex items-center gap-1.5">
                    {/* Big Voice Mic Button */}
                    <button
                      type="button"
                      onClick={isChatRecording ? stopChatRecording : startChatRecording}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
                        isChatRecording
                          ? "bg-red-600 text-white shadow-md"
                          : "text-gray-500 hover:text-blue-600 hover:bg-gray-200/70"
                      }`}
                      title="Voice Speech Search"
                    >
                      {isChatRecording ? <Square size={16} className="fill-current" /> : <Mic size={20} />}
                    </button>

                    {/* Big Action Send Button */}
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-xs"
                      title="Send Message"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>

                <p className="text-[10px] text-gray-400 text-center mt-1.5">
                  Vani GPT searches official government portals (Tavily) & generates responses in Indian languages.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer - Fixed Height */}
      <footer className="bg-white border-t border-gray-200 py-3 text-center text-xs text-gray-500 flex-shrink-0 z-20">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Vani — Government Policy Portal</span>
          <span>Official Public Policy Directory</span>
        </div>
      </footer>
    </div>
  );
}
