"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTranslation } from "../utils/translations";

interface VoiceMicRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  isProcessing: boolean;
}

export default function VoiceMicRecorder({ onAudioRecorded, isProcessing }: VoiceMicRecorderProps) {
  const { language } = useAuth();
  const t = getTranslation(language);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        onAudioRecorded(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required to use voice search. Please grant microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="flex items-center gap-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="relative">
        {isRecording && (
          <span className="absolute -inset-3 rounded-full bg-red-500/20 animate-ping" />
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-md ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : isProcessing
              ? "bg-gray-300 text-gray-500 cursor-wait"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          title={isRecording ? "Click to Stop" : "Click to Speak"}
        >
          {isProcessing ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isRecording ? (
            <Square size={20} className="fill-current" />
          ) : (
            <Mic size={24} />
          )}
        </button>
      </div>

      <div className="flex-1">
        {isRecording ? (
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <span>{t.recording} ({recordingTime}s)</span>
          </div>
        ) : isProcessing ? (
          <div className="text-gray-600 font-medium text-sm animate-pulse mb-1">
            {t.processing}
          </div>
        ) : (
          <div className="mb-1">
            <p className="font-semibold text-gray-900 text-base">
              {t.speakPrompt}
            </p>
          </div>
        )}
        <p className="text-xs text-gray-500">
          {t.speakSubtext}
        </p>
      </div>
    </div>
  );
}
