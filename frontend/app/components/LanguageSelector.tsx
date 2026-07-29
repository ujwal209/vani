"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LANGUAGES = [
  { code: "hi-IN", label: "हिन्दी", native: "Hindi" },
  { code: "en-IN", label: "English", native: "English" },
  { code: "ta-IN", label: "தமிழ்", native: "Tamil" },
  { code: "te-IN", label: "తెలుగు", native: "Telugu" },
  { code: "kn-IN", label: "ಕನ್ನಡ", native: "Kannada" },
  { code: "mr-IN", label: "मराठी", native: "Marathi" },
  { code: "bn-IN", label: "বাংলা", native: "Bengali" },
  { code: "gu-IN", label: "ગુજરાતી", native: "Gujarati" },
  { code: "ml-IN", label: "മലയാളം", native: "Malayalam" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ", native: "Punjabi" },
  { code: "or-IN", label: "ଓଡ଼ିଆ", native: "Odia" },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.native.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition"
      >
        <Globe size={14} className="text-blue-600 flex-shrink-0" />
        <span className="truncate">{selectedLang.label}</span>
        <span className="text-[10px] text-gray-400 hidden sm:inline">({selectedLang.native})</span>
        <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-52 sm:w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
          <div className="px-3 pb-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredLanguages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLanguage(l.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                  language === l.code ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700"
                }`}
              >
                <div>
                  <span className="font-semibold">{l.label}</span>
                  <span className="text-[10px] text-gray-400 ml-1">({l.native})</span>
                </div>
                {language === l.code && <Check size={14} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
