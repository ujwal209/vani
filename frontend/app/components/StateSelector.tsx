"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const STATES = [
  "India (National)", "Uttar Pradesh", "Maharashtra", "Bihar", "West Bengal", "Madhya Pradesh",
  "Tamil Nadu", "Rajasthan", "Karnataka", "Gujarat", "Andhra Pradesh", "Odisha",
  "Telangana", "Kerala", "Jharkhand", "Assam", "Punjab", "Haryana", "Chhattisgarh", "Uttarakhand"
];

export default function StateSelector() {
  const { state, setState } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredStates = STATES.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
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
        <MapPin size={14} className="text-blue-600 flex-shrink-0" />
        <span className="truncate max-w-[100px] sm:max-w-none">{state}</span>
        <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
          <div className="px-3 pb-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search state..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredStates.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setState(s);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                  state === s ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700"
                }`}
              >
                <span className="truncate">{s}</span>
                {state === s && <Check size={14} className="text-blue-600 flex-shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
