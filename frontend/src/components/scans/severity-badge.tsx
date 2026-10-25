import React from "react";
import { ShieldAlert, AlertTriangle, AlertCircle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: string;
  score?: number | null;
  className?: string;
  showIcon?: boolean;
}

export function SeverityBadge({
  severity,
  score,
  className,
  showIcon = true,
}: SeverityBadgeProps) {
  const normalized = (severity || "Unknown").toLowerCase();

  let colorClasses = "bg-slate-800 text-slate-300 border-slate-700";
  let Icon = HelpCircle;

  switch (normalized) {
    case "critical":
      colorClasses = "bg-red-950/70 text-red-400 border-red-800/60";
      Icon = ShieldAlert;
      break;
    case "high":
      colorClasses = "bg-orange-950/70 text-orange-400 border-orange-800/60";
      Icon = AlertTriangle;
      break;
    case "medium":
      colorClasses = "bg-amber-950/70 text-amber-400 border-amber-800/60";
      Icon = AlertCircle;
      break;
    case "low":
      colorClasses = "bg-blue-950/70 text-blue-400 border-blue-800/60";
      Icon = Info;
      break;
    default:
      colorClasses = "bg-slate-900 text-slate-400 border-slate-800";
      Icon = HelpCircle;
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase",
        colorClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{severity || "Unknown"}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono text-[10px] opacity-80 border-l border-current/30 pl-1.5 ml-0.5">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
}
