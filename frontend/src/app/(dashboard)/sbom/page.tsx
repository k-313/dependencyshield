"use client";

import React, { useState, useEffect } from "react";
import { Scan, SBOMResponse } from "@/types";
import { scansApi, sbomApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Download,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Hash,
} from "lucide-react";

export default function SBOMPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [sbom, setSbom] = useState<SBOMResponse | null>(null);
  const [loadingScans, setLoadingScans] = useState(true);
  const [loadingSBOM, setLoadingSBOM] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadScans() {
      try {
        const data = await scansApi.list();
        setScans(data);
        if (data.length > 0) {
          setSelectedScanId(data[0].id);
        }
      } catch {
        setError("Failed to load completed scans list.");
      } finally {
        setLoadingScans(false);
      }
    }
    loadScans();
  }, []);

  useEffect(() => {
    async function loadSBOM() {
      if (!selectedScanId) return;
      setLoadingSBOM(true);
      setError(null);
      try {
        const sbomData = await sbomApi.get(selectedScanId);
        setSbom(sbomData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to retrieve SBOM for this scan.";
        setError(msg);
        setSbom(null);
      } finally {
        setLoadingSBOM(false);
      }
    }
    loadSBOM();
  }, [selectedScanId]);

  const copyJson = () => {
    if (!sbom) return;
    navigator.clipboard.writeText(JSON.stringify(sbom.content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const componentsList = (sbom?.content?.components as unknown[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Software Bill of Materials</h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized CycloneDX v1.5 JSON artifacts for software supply chain transparency
          </p>
        </div>

        {selectedScanId && sbom && (
          <a
            href={sbomApi.getDownloadUrl(selectedScanId)}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download CycloneDX JSON</span>
          </a>
        )}
      </div>

      {/* Scan Selector */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-2">
        <label className="text-xs font-medium text-slate-300">Select Scan Analysis</label>
        {loadingScans ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            Loading scans...
          </div>
        ) : scans.length > 0 ? (
          <select
            value={selectedScanId}
            onChange={(e) => setSelectedScanId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.manifest_name || "Manifest"} • {s.dependency_count} deps • {formatDate(s.created_at)} ({s.status})
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-slate-500 italic">
            No scans available. Run a scan to generate an SBOM artifact.
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loadingSBOM ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading CycloneDX SBOM artifact...</p>
        </div>
      ) : sbom ? (
        <div className="space-y-4">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-xs text-slate-400">Specification Standard</span>
              <div className="text-sm font-semibold text-white mt-1">
                {String(sbom.content.bomFormat || "CycloneDX")} {String(sbom.content.specVersion || "1.5")}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-xs text-slate-400">Declared Components</span>
              <div className="text-sm font-semibold text-white mt-1 font-mono">
                {componentsList.length} libraries
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                Artifact SHA-256 Checksum
              </span>
              <div className="text-xs font-mono text-indigo-400 mt-1 truncate" title={sbom.checksum || ""}>
                {sbom.checksum || "Computed on export"}
              </div>
            </div>
          </div>

          {/* JSON Tree Viewer */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span>cyclonedx-sbom-{selectedScanId.slice(0, 8)}.json</span>
              </div>
              <button
                onClick={copyJson}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed bg-slate-950">
              {JSON.stringify(sbom.content, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
