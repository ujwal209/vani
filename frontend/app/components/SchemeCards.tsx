"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import { getTranslation } from "../utils/translations";

interface SchemeCardsProps {
  onSelectScheme: (query: str) => void;
}

const SCHEMES = [
  {
    title: "PM-Kisan Samman Nidhi",
    query: "What is PM Kisan Samman Nidhi scheme eligibility, benefits of 6000 rupees and how to register online?",
    desc: "Financial support for farmer families",
    category: "Agriculture",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    hoverBorder: "hover:border-emerald-500",
    accentColor: "text-emerald-700",
  },
  {
    title: "Ayushman Bharat (PM-JAY)",
    query: "How to get Ayushman Bharat golden card for 5 lakh free health insurance policy?",
    desc: "Health insurance cover for families",
    category: "Healthcare",
    badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
    hoverBorder: "hover:border-rose-500",
    accentColor: "text-rose-700",
  },
  {
    title: "PM Awas Yojana (Rural)",
    query: "PM Awas Yojana Gramin eligibility list, financial subsidy for building house and application process",
    desc: "Housing assistance for rural families",
    category: "Housing",
    badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
    hoverBorder: "hover:border-indigo-500",
    accentColor: "text-indigo-700",
  },
  {
    title: "MNREGA Employment",
    query: "How to apply for MNREGA job card and get 100 days guaranteed wage employment in village?",
    desc: "100 days guaranteed employment",
    category: "Employment",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    hoverBorder: "hover:border-amber-500",
    accentColor: "text-amber-700",
  },
  {
    title: "PM Fasal Bima Yojana",
    query: "PM Fasal Bima Yojana crop insurance claim process and premium subsidy for weather damage",
    desc: "Crop loss protection and insurance",
    category: "Agriculture",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    hoverBorder: "hover:border-emerald-500",
    accentColor: "text-emerald-700",
  },
  {
    title: "Sukanya Samriddhi Yojana",
    query: "Sukanya Samriddhi Yojana account opening rules, interest rate and benefits for girl child",
    desc: "Savings scheme for girl child education",
    category: "Welfare",
    badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
    hoverBorder: "hover:border-purple-500",
    accentColor: "text-purple-700",
  },
];

export default function SchemeCards({ onSelectScheme }: SchemeCardsProps) {
  const { language } = useAuth();
  const t = getTranslation(language);

  return (
    <div className="my-8">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900 google-sans-bold">
          Key Government Policy Schemes
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Select a scheme for instant policy guidelines and official procedures
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCHEMES.map((scheme, idx) => (
          <button
            key={idx}
            onClick={() => onSelectScheme(scheme.query)}
            className={`group text-left p-5 rounded-xl bg-white border border-gray-200 ${scheme.hoverBorder} transition-all duration-150 shadow-2xs hover:shadow-sm flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${scheme.badgeBg}`}>
                  {scheme.category}
                </span>
              </div>

              <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition google-sans-bold mb-1">
                {scheme.title}
              </h4>

              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                {scheme.desc}
              </p>
            </div>

            <div className={`mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold ${scheme.accentColor}`}>
              <span>View Guidelines</span>
              <span className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform">
                &rarr;
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
