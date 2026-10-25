"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Vulnerability } from "@/types";
import { vulnerabilitiesApi } from "@/lib/api";
import { SeverityBadge } from "@/components/scans/severity-badge";
import { formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  Search,
  Filter,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [ecosystemFilter, setEcosystemFilter] = useState("");

  useEffect(() => {
    let active = true;
    vulnerabilitiesApi.list({
      search: search.trim() || undefined,
      severity: severityFilter || undefined,
      ecosystem: ecosystemFilter || undefined,
    })
      .then((data) => {
        if (active) {
          setVulns(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load vulnerabilities.";
          setError(msg);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [search, severityFilter, ecosystemFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    vulnerabilitiesApi.list({
      search: search.trim() || undefined,
      severity: severityFilter || undefined,
      ecosystem: ecosystemFilter || undefined,
    })
      .then(setVulns)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load vulnerabilities.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Vulnerability Disclosures</h1>
        <p className="text-xs text-slate-400 mt-1">
          Catalog of known vulnerabilities matching dependencies across your projects
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search advisory (CVE, GHSA)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Unknown">Unknown</option>
          </select>

          <select
            value={ecosystemFilter}
            onChange={(e) => setEcosystemFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Ecosystems</option>
            <option value="npm">npm</option>
            <option value="PyPI">PyPI</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading vulnerabilities...</p>
        </div>
      ) : vulns.length > 0 ? (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Advisory ID</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4">Fixed In</th>
                  <th className="py-3 px-4">Disclosed</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vulns.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SeverityBadge severity={v.severity} score={v.score} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-indigo-400">
                      {v.advisory_id}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm truncate text-slate-300">
                      {v.summary || "No summary"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {v.fixed_versions && v.fixed_versions.length > 0 ? (
                        <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                          {v.fixed_versions[0]}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(v.last_updated_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/vulnerabilities/${v.id}`}
                        className="inline-flex items-center gap-1 font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Vulnerabilities Identified</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            No matching security findings found for your current filter query.
          </p>
        </div>
      )}
    </div>
  );
}
