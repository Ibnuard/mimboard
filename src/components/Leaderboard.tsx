"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Supabase (using anon key for reading public data)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Leader = {
  id: string;
  name: string;
  score: number; // Area in pixels
};

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<Leader[]>([]);

  useEffect(() => {
    fetchLeaders();
    const interval = setInterval(fetchLeaders, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const fetchLeaders = async () => {
    // Fetch all paid memes with dimensions and name
    const { data } = await supabase
      .from("memes")
      .select("id, user_name, width, height")
      .eq("payment_status", "PAID");

    if (!data) return;

    // Map to list, calculate area
    const list = data.map((m) => ({
      id: m.id,
      name: m.user_name || "Anonymous",
      score: m.width * m.height,
    }));

    // Sort Descending by Area and take Top 5
    const sorted = list.sort((a, b) => b.score - a.score).slice(0, 5);

    setLeaders(sorted);
  };

  if (leaders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1 pointer-events-none select-none">
      <div className="text-[10px] font-black text-yellow-600 tracking-widest uppercase mb-1 drop-shadow-sm animate-pulse">
        TOP SULTAN
      </div>
      {leaders.map((l, i) => (
        <div
          key={l.id}
          className="flex items-center gap-2 mb-2 animate-in slide-in-from-right fade-in duration-500 justify-end w-full"
          style={{
            opacity: Math.max(0.4, 1 - i * 0.1), // Slightly more visible
            transitionDelay: `${i * 100}ms`,
          }}
        >
          <div className="flex gap-1 flex-col items-end">
            <span
              className={`font-bold text-sm drop-shadow-sm leading-none max-w-[120px] truncate text-right ${
                i === 0 ? "animate-rainbow" : "text-zinc-900"
              }`}
            >
              {i === 0 ? "👑 " : ""}
              {l.name}
            </span>
            <span
              className={`text-xs font-mono leading-none mt-0.5 ${
                i === 0 ? "animate-rainbow" : "text-zinc-500"
              }`}
            >
              {l.score.toLocaleString("id-ID")} px²
            </span>
          </div>
          <span
            className={`font-black text-sm italic w-5 text-right ${
              i === 0
                ? "animate-rainbow text-lg"
                : i === 1
                  ? "text-zinc-400"
                  : i === 2
                    ? "text-orange-600"
                    : "text-zinc-300 text-xs"
            }`}
          >
            #{i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
