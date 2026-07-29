"use client";

import React from "react";
import { MessageSquare, Plus, X, History, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTranslation } from "../utils/translations";

interface VaniGptSidebarProps {
  history: any[];
  onSelectQuery: (query: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function VaniGptSidebar({
  history,
  onSelectQuery,
  onNewChat,
  isOpen,
  onClose,
}: VaniGptSidebarProps) {
  const { language } = useAuth();
  const t = getTranslation(language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-80 max-w-full bg-white h-full shadow-2xl flex flex-col z-50 animate-fade-in border-r border-gray-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <h2 className="font-bold text-sm text-gray-900 google-sans-bold">
              Enquiry History
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Search Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Plus size={16} />
            <span>New Search Query</span>
          </button>
        </div>

        {/* Previous Queries List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t.recentEnquiries}
          </div>

          {history && history.length > 0 ? (
            history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectQuery(item.query);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-blue-50 text-xs text-gray-700 hover:text-blue-700 transition flex items-start gap-2.5 group border border-transparent hover:border-blue-200"
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
            <div className="p-6 text-center text-xs text-gray-400 italic">
              No saved searches found.
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-gray-200 text-[11px] text-gray-500 text-center">
          Tavily Live Web Search + Groq AI Engine
        </div>

      </div>
    </div>
  );
}
