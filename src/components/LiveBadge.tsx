"use client";

import { useEffect, useState } from "react";

export function LiveBadge() {
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    const clientId = Math.random().toString(36).substring(2, 15);
    
    const fetchViewers = async () => {
      try {
        const res = await fetch(`/api/stats?clientId=${clientId}`);
        if (res.ok) {
          const data = await res.json();
          setViewers(data.viewers);
        }
      } catch (e) {
        console.error("Failed to fetch viewers", e);
      }
    };

    fetchViewers();
    const interval = setInterval(fetchViewers, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-neutral-900/50 backdrop-blur border border-neutral-800 rounded-full px-3 py-1.5 shadow-xl">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Live</span>
      </div>
      <div className="w-px h-3 bg-neutral-700"></div>
      <div className="text-xs text-neutral-300 font-medium">
        {viewers.toLocaleString()} watching
      </div>
    </div>
  );
}
