"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import UploadModal from "@/components/UploadModal";
import Onboarding from "@/components/Onboarding";
import Leaderboard from "@/components/Leaderboard";
import { supabase } from "@/lib/supabase";

// Dynamically import MemeCanvas with no SSR
import { GRID_SIZE } from "@/lib/constants";

// Dynamically import MemeCanvas with no SSR
const MemeCanvas = dynamic(() => import("@/components/MemeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center text-gray-500">
      Loading Canvas...
    </div>
  ),
});

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memes, setMemes] = useState<any[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [percentRemaining, setPercentRemaining] = useState(100);

  const fetchMemes = async () => {
    const { data, error } = await supabase.from("memes").select("*");
    if (data) setMemes(data);
    if (error) console.error("Error fetching memes:", error);
  };

  useEffect(() => {
    fetchMemes();
  }, []);

  // Calculate remaining pixels
  useEffect(() => {
    if (memes.length === 0) {
      setPercentRemaining(100);
      return;
    }

    // Debounce slightly to avoid blocking main thread immediately on load
    const timer = setTimeout(() => {
      const totalPixels = GRID_SIZE * GRID_SIZE;
      const grid = new Uint8Array(totalPixels);
      let occupiedCount = 0;

      for (const meme of memes) {
        const startX = Math.max(0, Math.floor(meme.x));
        const startY = Math.max(0, Math.floor(meme.y));
        const endX = Math.min(GRID_SIZE, Math.floor(meme.x + meme.width));
        const endY = Math.min(GRID_SIZE, Math.floor(meme.y + meme.height));

        for (let y = startY; y < endY; y++) {
          const rowOffset = y * GRID_SIZE;
          for (let x = startX; x < endX; x++) {
            const idx = rowOffset + x;
            if (grid[idx] === 0) {
              grid[idx] = 1;
              occupiedCount++;
            }
          }
        }
      }

      const remaining = ((totalPixels - occupiedCount) / totalPixels) * 100;
      setPercentRemaining(remaining);
    }, 100);

    return () => clearTimeout(timer);
  }, [memes]);

  const handleUploadSuccess = (newMeme: any) => {
    setMemes((prev) => [...prev, newMeme]);
    setSelectedCoords(null); // Clear selection after upload
  };

  const handleCanvasClick = (x: number, y: number) => {
    setSelectedCoords({ x, y });
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-50 relative">
      {/* Selection UI or General Navigation */}
      <div className="z-10 w-full p-4 pointer-events-none absolute top-0">
        <div className="flex justify-end items-start">
          {selectedCoords && (
            <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold font-mono shadow-xl pointer-events-auto animate-in fade-in slide-in-from-top-4">
              Koordinat: {selectedCoords.x}, {selectedCoords.y}
            </div>
          )}
        </div>
      </div>

      <MemeCanvas
        memes={memes}
        onCanvasClick={handleCanvasClick}
        selectedCoords={selectedCoords}
      />

      {/* Upload Button - fixed at bottom center */}
      {selectedCoords && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300 flex flex-col items-center gap-2">
          <span className="text-gray-400 font-mono text-[10px] md:text-xs font-bold tracking-widest uppercase animate-pulse drop-shadow-sm">
            🔥 {percentRemaining.toFixed(4)}% AREA TERSISA
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-black py-3 px-8 md:py-4 md:px-10 rounded-full transition-all shadow-[0_0_50px_rgba(251,191,36,0.3)] active:scale-95 text-sm md:text-xl uppercase tracking-widest flex items-center gap-3 border-4 border-black whitespace-nowrap"
          >
            Unggah Meme Disini
          </button>
        </div>
      )}

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUploadSuccess}
        initialPosition={selectedCoords || undefined}
        existingMemes={memes}
      />
      <Leaderboard />
      <Onboarding />
    </main>
  );
}
