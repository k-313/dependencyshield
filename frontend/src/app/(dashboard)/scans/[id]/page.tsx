"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ScanDetail } from "@/types";
import { scansApi, sbomApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import { FindingsTable } from "@/components/scans/findings-table";
import {
  ArrowLeft,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShieldAlert,
  Layers,
  Ban,
} from "lucide-react";

export default function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"findings" | "dependencies">("findings");

  useEffect(() => {
    let active = true;
    scansApi.get(id)
      .then((data) => {
        if (active) {
          setScan(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load scan details.";
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Polling mechanism while scan is running or queued
  useEffect(() => {
    if (!scan) return;
    const isPending = scan.status === "queued" || scan.status === "running";
    if (!isPending) return;

    const interval = setInterval(() => {
      scansApi.get(id).then(setScan).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [scan?.status, id, scan]);

  const handleCancel = async () => {
    try {
      await scansApi.cancel(id);
      const data = await scansApi.get(id);
      setScan(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel scan.";
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading scan results...</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs">
          {error || "Scan not found."}
        </div>
      </div>
    );
  }

  const isPending = scan.status === "queued" || scan.status === "running";

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {scan.manifest_name || "Manifest Scan"}
            </h1>
            <ScanStatusBadge status={scan.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
            <span>Scan ID: {scan.id}</span>
            <span>•</span>
            <span>Created: {formatDate(scan.created_at)}</span>
            {scan.completed_at && (
              <>
                <span>•</span>
                <span>Completed: {formatDate(scan.completed_at)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Downloads / Cancel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isPending ? (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-900/60 text-rose-300 hover:bg-rose-900/60 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Scan</span>
            </button>
          ) : (
            <>
              <a
                href={sbomApi.getDownloadUrl(scan.id)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                <span>CycloneDX SBOM</span>
              </a>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>View Reports</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Progress alert if running */}
      {isPending && (
        <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/30 p-4 flex items-center gap-3 text-xs text-indigo-300">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
          <div>
            <span className="font-semibold text-white">Scan in progress:</span> Extracting
            dependency graph and querying OSV vulnerability database in batch. This page refreshes
            automatically.
          </div>
        </div>
      )}

      {/* Failure alert if failed */}
      {scan.status === "failed" && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 space-y-1 text-xs text-rose-300">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Scan Processing Error
          </div>
          <p>{scan.error_summary || "An unexpected error interrupted scan execution."}</p>
        </div>
      )}

      {/* Warnings Banner if any */}
      {scan.warnings && scan.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 space-y-1.5 text-xs text-amber-300">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Scanner Notices & Coverage Limitations
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
            {scan.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Dependencies
          </span>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {scan.dependency_count}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Total Findings
          </span>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {scan.finding_count}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Critical Severities
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            {scan.critical_count}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            High Severities
          </span>
          <div className="text-2xl font-bold text-orange-400 mt-2 font-mono">
            {scan.high_count}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("findings")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "findings"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Security Findings ({scan.findings?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("dependencies")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "dependencies"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Discovered Dependencies ({scan.dependencies?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "findings" ? (
        <FindingsTable findings={scan.findings || []} />
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Ecosystem</th>
                  <th className="py-3 px-4">Resolved Version</th>
                  <th className="py-3 px-4">Declared Specifier</th>
                  <th className="py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(scan.dependencies || []).map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-white font-mono">
                      {dep.package_name}
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize">
                      {dep.ecosystem}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {dep.resolved_version ? (
                        <span className="text-emerald-400">{dep.resolved_version}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unresolved Range</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {dep.declared_version || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {dep.direct_or_transitive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
