"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Vulnerability, AIRemediation } from "@/types";
import { vulnerabilitiesApi } from "@/lib/api";
import { SeverityBadge } from "@/components/scans/severity-badge";
import { AIRemediationCard } from "@/components/ai/ai-remediation-card";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from "lucide-react";

export default function VulnerabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [vuln, setVuln] = useState<Vulnerability | null>(null);
  const [remediation, setRemediation] = useState<AIRemediation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRemediation, setLoadingRemediation] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const vulnData = await vulnerabilitiesApi.get(id);
        setVuln(vulnData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load vulnerability disclosure.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    async function loadRemediation() {
      if (!vuln) return;
      try {
        const remData = await vulnerabilitiesApi.remediation(vuln.id);
        setRemediation(remData);
      } catch {
        // Remediation fetch failed
      } finally {
        setLoadingRemediation(false);
      }
    }
    if (vuln) {
      loadRemediation();
    }
  }, [vuln]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading advisory details...</p>
      </div>
    );
  }

  if (error || !vuln) {
    return (
      <div className="space-y-4">
        <Link
          href="/vulnerabilities"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Vulnerabilities
        </Link>
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs">
          {error || "Vulnerability not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/vulnerabilities"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Vulnerabilities
      </Link>

      {/* Advisory Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-white tracking-tight">
                {vuln.advisory_id}
              </h1>
              <SeverityBadge severity={vuln.severity} score={vuln.score} />
            </div>
            {vuln.aliases && vuln.aliases.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>Aliases:</span>
                {vuln.aliases.map((al, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {al}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right text-xs text-slate-400">
            <div>Source: <span className="text-white font-medium">{vuln.source}</span></div>
            <div className="text-slate-500 mt-0.5">Updated: {formatDate(vuln.last_updated_at)}</div>
          </div>
        </div>

        {/* CVSS & Summary */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white">{vuln.summary}</h2>
          {vuln.cvss_vector && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 overflow-x-auto">
              <span className="text-indigo-400 font-semibold mr-2">CVSS Vector:</span>
              {vuln.cvss_vector}
            </div>
          )}
        </div>
      </div>

      {/* AI Remediation Card */}
      {loadingRemediation ? (
        <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/30 text-center">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Synthesizing authoritative remediation guidance...</p>
        </div>
      ) : remediation ? (
        <AIRemediationCard remediation={remediation} />
      ) : null}

      {/* Advisory Details & Disclosed Description */}
      {vuln.details && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Advisory Disclosure Details</h3>
          <div className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            {vuln.details}
          </div>
        </div>
      )}

      {/* Affected Ranges & Fixed Versions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fixed Versions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Fixed Versions
          </h3>
          {vuln.fixed_versions && vuln.fixed_versions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {vuln.fixed_versions.map((ver, idx) => (
                <span
                  key={idx}
                  className="font-mono text-xs px-2.5 py-1 rounded-md bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 font-semibold"
                >
                  {ver}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No officially patched release disclosed in this advisory.
            </p>
          )}
        </div>

        {/* Affected Ranges */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Affected Version Ranges
          </h3>
          {vuln.affected_ranges && vuln.affected_ranges.length > 0 ? (
            <div className="space-y-1.5">
              {vuln.affected_ranges.map((range: unknown, idx: number) => {
                const r = range as { type?: string; events?: unknown[] };
                return (
                  <div
                    key={idx}
                    className="text-xs font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300"
                  >
                    Type: {r.type || "SEMVER"} • Events:{" "}
                    {JSON.stringify(r.events || [])}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Ranges specified directly within advisory disclosure.
            </p>
          )}
        </div>
      </div>

      {/* Authoritative References */}
      {vuln.references && vuln.references.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Authoritative References & Disclosures
          </h3>
          <ul className="divide-y divide-slate-800/60">
            {vuln.references.map((ref, idx) => (
              <li key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  {ref.type || "ADVISORY"}
                </span>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 truncate max-w-lg font-mono text-xs"
                >
                  <span className="truncate">{ref.url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
