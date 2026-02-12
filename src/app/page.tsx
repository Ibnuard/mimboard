"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import UploadModal from "@/components/UploadModal";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/lib/supabase";

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

  const fetchMemes = async () => {
    const { data, error } = await supabase.from("memes").select("*");
    if (data) setMemes(data);
    if (error) console.error("Error fetching memes:", error);
  };

  useEffect(() => {
    fetchMemes();
  }, []);

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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300">
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
      <Onboarding />
    </main>
  );
}
