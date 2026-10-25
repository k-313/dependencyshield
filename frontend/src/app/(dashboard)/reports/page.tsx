"use client";

import React, { useEffect, useState } from "react";
import { ReportItem, Scan } from "@/types";
import { reportsApi, scansApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  Download,
  Plus,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate on demand state
  const [generating, setGenerating] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv">("json");

  useEffect(() => {
    let active = true;
    Promise.all([reportsApi.list(), scansApi.list()])
      .then(([reportsData, scansData]) => {
        if (active) {
          setReports(reportsData);
          setScans(scansData);
          if (scansData.length > 0) {
            setSelectedScanId(scansData[0].id);
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load audit reports.";
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshReports = async () => {
    try {
      const [reportsData, scansData] = await Promise.all([
        reportsApi.list(),
        scansApi.list(),
      ]);
      setReports(reportsData);
      setScans(scansData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audit reports.";
      setError(msg);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScanId) return;
    setGenerating(true);
    try {
      await reportsApi.create(selectedScanId, selectedFormat);
      await refreshReports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report.";
      alert(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading audit reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Audit Reports</h1>
        <p className="text-xs text-slate-400 mt-1">
          Exportable RFC-4180 CSV spreadsheets and structured JSON audit logs for compliance
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Generate New Report Section */}
      {scans.length > 0 && (
        <form
          onSubmit={handleGenerate}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-white whitespace-nowrap">
              Generate Export:
            </span>
            <select
              value={selectedScanId}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.manifest_name || "Manifest"} ({s.finding_count} findings)
                </option>
              ))}
            </select>

            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as "json" | "csv")}
              className="w-full sm:w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV (Excel)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Generate Report</span>
          </button>
        </form>
      )}

      {/* Reports Table */}
      {reports.length > 0 ? (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Scan Identifier</th>
                  <th className="py-3 px-4">Generated Timestamp</th>
                  <th className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase font-mono ${
                          report.format === "csv"
                            ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40"
                            : "bg-indigo-950/50 text-indigo-400 border border-indigo-900/40"
                        }`}
                      >
                        {report.format === "csv" ? (
                          <FileSpreadsheet className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {report.format}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {report.scan_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <a
                        href={reportsApi.getDownloadUrl(report.id)}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No reports generated yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Reports are generated automatically upon scan completion or on-demand above.
          </p>
        </div>
      )}
    </div>
  );
}
