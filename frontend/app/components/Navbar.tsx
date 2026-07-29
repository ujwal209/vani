"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";
import LanguageSelector from "./LanguageSelector";
import StateSelector from "./StateSelector";
import { LogOut, ChevronDown, Radio, History } from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [userDropdown, setUserDropdown] = useState(false);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        {/* Single Integrated Navbar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Logo & History Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition flex-shrink-0"
                title="Toggle History Sheet"
              >
                <History size={18} />
              </button>
            )}

            <div className="flex items-center gap-1.5 min-w-0">
              <Radio size={18} className="text-blue-600 flex-shrink-0" />
              <span className="font-bold text-base sm:text-xl text-gray-900 tracking-tight google-sans-bold">
                Vani
              </span>
            </div>
          </div>

          {/* Integrated Controls: Language & State inside the Navbar directly */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageSelector />
            <StateSelector />
          </div>

          {/* Right Auth Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  <div className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{user.name}</span>
                  <ChevronDown size={12} />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 text-xs">
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-gray-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setUserDropdown(false); }}
                      className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openAuth("login")}
                  className="px-2 py-1 text-xs font-semibold text-gray-700 hover:text-blue-600 transition"
                >
                  Log in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
