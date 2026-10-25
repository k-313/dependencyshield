import React from "react";
import { FolderGit2, ScanSearch, ShieldAlert, CheckCircle2 } from "lucide-react";
import { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Monitored Projects",
      value: stats.total_projects,
      icon: FolderGit2,
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-900/40",
      description: "Active repositories and codebases",
    },
    {
      label: "Completed Scans",
      value: stats.total_scans,
      icon: ScanSearch,
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-900/40",
      description: "Automated vulnerability audits",
    },
    {
      label: "Active Vulnerabilities",
      value: stats.total_vulnerabilities,
      icon: ShieldAlert,
      color: stats.total_vulnerabilities > 0 ? "text-red-400" : "text-emerald-400",
      bg: stats.total_vulnerabilities > 0 ? "bg-red-950/40 border-red-900/40" : "bg-emerald-950/40 border-emerald-900/40",
      description: stats.total_vulnerabilities > 0 ? "Open security findings" : "No known open findings",
    },
    {
      label: "Critical Risks",
      value: stats.critical_count,
      icon: CheckCircle2,
      color: stats.critical_count > 0 ? "text-rose-400" : "text-slate-400",
      bg: stats.critical_count > 0 ? "bg-rose-950/50 border-rose-900/60" : "bg-slate-900/40 border-slate-800",
      description: "Immediate remediation required",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.bg} ${card.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight text-white">
                {card.value}
              </div>
              <p className="text-xs text-slate-500 mt-1">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
