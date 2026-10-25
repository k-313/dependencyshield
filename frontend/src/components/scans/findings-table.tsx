"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Finding } from "@/types";
import { SeverityBadge } from "./severity-badge";
import { Search, ExternalLink, ShieldCheck, Filter } from "lucide-react";

interface FindingsTableProps {
  findings: Finding[];
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      const pkg = f.dependency?.package_name?.toLowerCase() || "";
      const adv = f.vulnerability?.advisory_id?.toLowerCase() || "";
      const sum = f.vulnerability?.summary?.toLowerCase() || "";
      const q = search.toLowerCase();

      const matchesSearch = pkg.includes(q) || adv.includes(q) || sum.includes(q);
      const matchesSeverity =
        severityFilter === "all" ||
        f.vulnerability?.severity?.toLowerCase() === severityFilter.toLowerCase();

      return matchesSearch && matchesSeverity;
    });
  }, [findings, search, severityFilter]);

  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No Known Vulnerabilities Identified</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
          The completed scan matched 0 known advisories in the OSV intelligence database.
          Note: This does not guarantee the software is free from undiscovered zero-day defects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search package or CVE / GHSA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Severities ({findings.length})</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Package & Version</th>
                <th className="py-3 px-4">Advisory</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Fixed In</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((finding) => {
                const dep = finding.dependency;
                const vuln = finding.vulnerability;
                const fixedVersions = vuln?.fixed_versions || [];

                return (
                  <tr
                    key={finding.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SeverityBadge
                        severity={vuln?.severity || "Unknown"}
                        score={vuln?.score}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">
                        {dep?.package_name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-300 font-mono">
                          {dep?.resolved_version || dep?.declared_version || "unknown"}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="capitalize">{dep?.ecosystem}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-2 py-1 rounded">
                        {vuln?.advisory_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                      {vuln?.summary || "No summary provided"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {fixedVersions.length > 0 ? (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded">
                          {fixedVersions[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">None listed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/vulnerabilities/${vuln?.id || vuln?.advisory_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            No findings match your current filter query.
          </div>
        )}
      </div>
    </div>
  );
}
