"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardStats } from "@/types";
import { dashboardApi } from "@/lib/api";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SeverityChart } from "@/components/dashboard/severity-chart";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { SeverityBadge } from "@/components/scans/severity-badge";
import { formatTimeAgo } from "@/lib/utils";
import {
  ScanSearch,
  ExternalLink,
  Loader2,
  FolderPlus,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await dashboardApi.stats();
        setStats(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard metrics.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading security dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-sm">
        {error || "Failed to load dashboard."}
      </div>
    );
  }

  const hasScans = stats.total_scans > 0;

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security Operations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time supply chain health and known vulnerability posture across your workspace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/scans/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
          >
            <ScanSearch className="w-4 h-4" />
            <span>Launch New Scan</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Main Grid: Chart + Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Chart */}
        <SeverityChart stats={stats} />

        {/* Recent Scans */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Recent Dependency Scans</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest completed and active scans</p>
              </div>
              <Link
                href="/projects"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View Projects →
              </Link>
            </div>

            {stats.recent_scans.length > 0 ? (
              <div className="divide-y divide-slate-800/60">
                {stats.recent_scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <Link
                        href={`/scans/${scan.id}`}
                        className="font-medium text-white hover:text-indigo-400 transition-colors"
                      >
                        {scan.manifest_name || "Manifest Scan"}
                      </Link>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {scan.dependency_count} dependencies • {formatTimeAgo(scan.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ScanStatusBadge status={scan.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No scans executed yet. Upload a manifest to initiate scanning.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Discovered Findings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recently Detected Findings</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative security advisories discovered across recent scans
            </p>
          </div>
          <Link
            href="/vulnerabilities"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            All Findings ({stats.total_vulnerabilities}) →
          </Link>
        </div>

        {stats.recent_findings.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {stats.recent_findings.map((f) => (
              <div
                key={f.id}
                className="py-3 flex items-center justify-between text-xs hover:bg-slate-800/20 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <SeverityBadge
                    severity={f.vulnerability?.severity || "Unknown"}
                    score={f.vulnerability?.score}
                  />
                  <div>
                    <span className="font-semibold text-white">
                      {f.dependency?.package_name}
                    </span>{" "}
                    <span className="text-slate-500">
                      ({f.dependency?.resolved_version || f.dependency?.declared_version || "unknown"})
                    </span>
                    <p className="text-slate-400 text-[11px] truncate max-w-md mt-0.5">
                      {f.vulnerability?.summary || f.vulnerability?.advisory_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatTimeAgo(f.first_detected_at)}
                  </span>
                  <Link
                    href={`/vulnerabilities/${f.vulnerability?.id || f.vulnerability?.advisory_id}`}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            {hasScans ? (
              <span className="text-emerald-400">
                All completed scans identified 0 known vulnerabilities!
              </span>
            ) : (
              "No findings recorded yet. Execute a scan to analyze dependencies."
            )}
          </div>
        )}
      </div>

      {/* First-time onboarding banner if empty */}
      {!hasScans && (
        <div className="p-6 rounded-2xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Ready to inspect your software?</h4>
            <p className="text-xs text-slate-400">
              Create a project and upload your first package-lock.json or requirements.txt.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </Link>
            <Link
              href="/scans/new"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <ScanSearch className="w-3.5 h-3.5" />
              <span>Start Scan</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
