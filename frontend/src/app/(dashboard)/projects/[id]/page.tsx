"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Project, Scan } from "@/types";
import { projectsApi, scansApi } from "@/lib/api";
import { formatDate, formatTimeAgo } from "@/lib/utils";
import { ScanStatusBadge } from "@/components/scans/scan-status-badge";
import {
  FolderGit2,
  ScanSearch,
  ArrowLeft,
  Calendar,
  Layers,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projData, scansData] = await Promise.all([
          projectsApi.get(id),
          scansApi.list(id),
        ]);
        setProject(projData);
        setScans(scansData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load project details.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading project data...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </Link>
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs">
          {error || "Project not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Projects
      </Link>

      {/* Project Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{project.name}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {project.description || "No project description provided."}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {formatDate(project.created_at)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {project.scan_count} Total Scans
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/scans/new?project_id=${project.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors shrink-0"
        >
          <ScanSearch className="w-4 h-4" />
          <span>Scan Manifest</span>
        </Link>
      </div>

      {/* Scans History Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Scan History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical audits for this codebase
            </p>
          </div>
        </div>

        {scans.length > 0 ? (
          <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Manifest</th>
                    <th className="py-3 px-4">Dependencies</th>
                    <th className="py-3 px-4">Findings</th>
                    <th className="py-3 px-4">Executed</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {scans.map((scan) => (
                    <tr
                      key={scan.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <ScanStatusBadge status={scan.status} />
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {scan.manifest_name || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {scan.dependency_count}
                      </td>
                      <td className="py-3 px-4">
                        {scan.finding_count > 0 ? (
                          <span className="font-semibold text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {scan.finding_count} ({scan.critical_count} Crit, {scan.high_count} High)
                          </span>
                        ) : scan.status === "completed" ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            0 Findings
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(scan.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/scans/${scan.id}`}
                          className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View Results →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-500">
            No scans recorded for this project yet. Click &quot;Scan Manifest&quot; to perform an analysis.
          </div>
        )}
      </div>
    </div>
  );
}
