"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { X, Mail, Lock, User, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode }: AuthModalProps) {
  const { login, register, verifyOtp, requestPasswordReset, confirmPasswordReset } = useAuth();
  
  const [mode, setMode] = useState<"login" | "signup" | "otp" | "forgot" | "reset">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await register(name, email, password);
        setMode("otp");
        setMessage("Please check your email for the 6-digit OTP.");
      } else if (mode === "login") {
        await login(email, password);
        onClose();
      } else if (mode === "otp") {
        await verifyOtp(email, otp);
        onClose();
      } else if (mode === "forgot") {
        await requestPasswordReset(email);
        setMode("reset");
        setMessage("Reset code sent to your email.");
      } else if (mode === "reset") {
        await confirmPasswordReset(email, otp, password);
        setMode("login");
        setMessage("Password reset successfully. Please log in.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1 google-sans-bold">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create an Account"}
            {mode === "otp" && "Verify Email"}
            {mode === "forgot" && "Reset Password"}
            {mode === "reset" && "New Password"}
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {mode === "login" && "Sign in to access your saved policy history"}
            {mode === "signup" && "Join Vani to save your policy research"}
            {mode === "otp" && "Enter the 6-digit code sent to your email"}
            {mode === "forgot" && "We will send a reset code to your email"}
            {mode === "reset" && "Enter the reset code and your new password"}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg text-center font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg text-center font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "signup" || mode === "forgot" || mode === "otp" || mode === "reset") && (
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                  disabled={mode === "otp" || mode === "reset"}
                />
              </div>
            )}

            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="password"
                  placeholder={mode === "reset" ? "New Password" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
            )}

            {(mode === "otp" || mode === "reset") && (
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={mode === "otp" ? "6-digit OTP" : "Reset Code"}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-center tracking-widest font-mono"
                  required
                  maxLength={6}
                />
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                mode === "login" ? "Sign In" :
                mode === "signup" ? "Create Account" :
                mode === "otp" ? "Verify Email" :
                mode === "forgot" ? "Send Reset Link" : "Reset Password"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => { setMode("signup"); setError(""); }} className="text-blue-600 font-bold hover:underline">
                  Sign up
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-blue-600 font-bold hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <button onClick={() => { setMode("login"); setError(""); }} className="text-blue-600 font-bold hover:underline mt-2">
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
