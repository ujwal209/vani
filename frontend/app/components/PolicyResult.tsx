"use client";

import React, { useState } from "react";
import AudioPlayer from "./AudioPlayer";
import { ExternalLink, Copy, Check, ShieldCheck, FileText } from "lucide-react";

export interface PolicySource {
  title: string;
  url: string;
  content: string;
}

export interface PolicyResponseData {
  query: string;
  response_text: string;
  audio_base64: string | null;
  sources: PolicySource[];
  model_used: string;
  language: string;
  state: string;
  transcript?: string;
}

interface PolicyResultProps {
  data: PolicyResponseData;
}

export default function PolicyResult({ data }: PolicyResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.response_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomain = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace("www.", "");
    } catch (e) {
      return "gov.in";
    }
  };

  const getFaviconUrl = (urlStr: string) => {
    const domain = getDomain(urlStr);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  };

  const formatText = (text: str) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="ml-5 list-disc my-2 text-gray-700 text-sm leading-relaxed">
            {parts.map((p, idx) => {
              if (p.startsWith("**") && p.endsWith("**")) {
                return <strong key={idx} className="font-bold text-gray-900">{p.slice(2, -2)}</strong>;
              }
              return p;
            })}
          </li>
        );
      }

      if (line.trim().startsWith("What is") || line.trim().startsWith("Eligibility") || line.trim().startsWith("Key Benefits") || line.trim().startsWith("Required Documents") || line.trim().startsWith("How to Apply")) {
        return (
          <h4 key={i} className="font-bold text-gray-900 text-base mt-6 mb-3 border-b border-gray-200 pb-2 flex items-center gap-2">
            <span>{line}</span>
          </h4>
        );
      }

      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }

      return (
        <p key={i} className="my-3 text-gray-700 leading-relaxed text-sm">
          {parts.map((p, idx) => {
            if (p.startsWith("**") && p.endsWith("**")) {
              return <strong key={idx} className="font-bold text-gray-900">{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      
      {/* Top Header */}
      <div className="bg-blue-600 p-4 sm:p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-white" />
          <div>
            <h3 className="font-bold text-sm sm:text-base">Policy Analysis & Guidelines</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Region: {data.state} • Language: {data.language}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium flex items-center gap-1.5 transition border border-blue-500"
          title="Copy Text"
        >
          {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {/* User Query / Spoken Transcript */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1.5">
            Your Query
          </span>
          <p className="font-semibold text-gray-900 text-sm sm:text-base">
            "{data.transcript || data.query}"
          </p>
        </div>

        {/* Audio Player */}
        <AudioPlayer audioBase64={data.audio_base64} autoPlay={true} />

        {/* Policy Response Content */}
        <div className="mt-6 prose max-w-none">
          {formatText(data.response_text)}
        </div>

        {/* Official Sources with Domain Favicons */}
        {data.sources && data.sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              <span>Verified Government Portal Sources</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.sources.map((src, idx) => {
                const domain = getDomain(src.url);
                const favicon = getFaviconUrl(src.url);

                return (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-left transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={favicon} 
                          alt={domain} 
                          className="w-4 h-4 rounded-sm flex-shrink-0 object-contain bg-white"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <span className="font-semibold text-xs text-gray-700 group-hover:text-blue-700 truncate">
                          {domain}
                        </span>
                      </div>
                      <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                    </div>

                    <h6 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1.5 group-hover:text-blue-800">
                      {src.title}
                    </h6>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {src.content}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
