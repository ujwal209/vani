"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioBase64: string | null;
  autoPlay?: boolean;
}

export default function AudioPlayer({ audioBase64, autoPlay = true }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioBase64) {
      const audioUrl = `data:audio/wav;base64,${audioBase64}`;
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        if (autoPlay) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.log("Autoplay blocked:", e));
        }
      }
    }
  }, [audioBase64, autoPlay]);

  if (!audioBase64) return null;

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg my-4">
      <audio ref={audioRef} onEnded={handleEnded} />
      
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition flex-shrink-0 shadow-sm"
        title={isPlaying ? "Pause Audio" : "Play Audio"}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 flex items-center gap-2 truncate">
            <Volume2 size={16} className="text-blue-600" />
            <span>Audio Translation</span>
          </span>
          <span className="text-xs text-gray-500 font-medium">
            {isPlaying ? "Playing..." : "Listen"}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-2 h-3">
          {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 80, 50, 90, 40].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-blue-500 transition-all duration-300 ${
                isPlaying ? "animate-pulse" : "opacity-30"
              }`}
              style={{
                height: isPlaying ? `${Math.max(20, (h * Math.random()).toFixed(0))}%` : "30%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
