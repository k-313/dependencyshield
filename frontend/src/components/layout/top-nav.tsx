"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, Activity } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0b0f19]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>OSV Intelligence Feed Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/scans/new"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Scan</span>
        </Link>
      </div>
    </header>
  );
}
