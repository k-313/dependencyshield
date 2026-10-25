"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import {
  LogOut,
  Cpu,
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Scanner Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Workspace security parameters, session management, and intelligence feed configurations
        </p>
      </div>

      {/* Profile Details */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center font-bold text-sm">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{user?.email}</h2>
            <p className="text-xs text-slate-400">Authenticated Security Analyst</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400">User ID:</span>
            <div className="font-mono text-slate-200 mt-0.5 truncate">{user?.id}</div>
          </div>
          <div>
            <span className="text-slate-400">Account Created:</span>
            <div className="text-slate-200 mt-0.5">{formatDate(user?.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Security Architecture & Intelligence Feeds */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>Security Engine & Supply Chain Intelligence</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="font-semibold text-white">OSV API Intelligence Feed</span>
              <p className="text-slate-400 mt-0.5">Google Open Source Vulnerabilities live synchronization</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="font-semibold text-white">CycloneDX Specification</span>
              <p className="text-slate-400 mt-0.5">OWASP standard for Software Bill of Materials (SBOM)</p>
            </div>
            <span className="font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded">
              v1.5 JSON
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="font-semibold text-white">Scanner Engine Core</span>
              <p className="text-slate-400 mt-0.5">Sandboxed metadata parsers (Node.js & Python)</p>
            </div>
            <span className="font-mono text-slate-300">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Sign Out of Session</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Clear authentication credentials and end current browser session
          </p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
