import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Ban,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScanStatus } from "@/types";

interface ScanStatusBadgeProps {
  status: ScanStatus | string;
  className?: string;
}

export function ScanStatusBadge({ status, className }: ScanStatusBadgeProps) {
  const norm = (status || "").toLowerCase();

  switch (norm) {
    case "completed":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50",
            className
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Clean (0 Findings)
        </span>
      );

    case "completed_with_findings":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/50",
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Findings Detected
        </span>
      );

    case "running":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 animate-pulse",
            className
          )}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Scanning...
        </span>
      );

    case "queued":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-700",
            className
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Queued
        </span>
      );

    case "incomplete":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50",
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Incomplete Coverage
        </span>
      );

    case "failed":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-950/60 text-rose-400 border border-rose-800/50",
            className
          )}
        >
          <XCircle className="w-3.5 h-3.5" />
          Scan Failed
        </span>
      );

    case "cancelled":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800",
            className
          )}
        >
          <Ban className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );

    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800",
            className
          )}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {status || "Unknown"}
        </span>
      );
  }
}
