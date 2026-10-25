"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { DashboardStats } from "@/types";

interface SeverityChartProps {
  stats: DashboardStats;
}

export function SeverityChart({ stats }: SeverityChartProps) {
  const data = [
    { name: "Critical", count: stats.critical_count, color: "#ef4444" },
    { name: "High", count: stats.high_count, color: "#f97316" },
    { name: "Medium", count: stats.medium_count, color: "#eab308" },
    { name: "Low", count: stats.low_count, color: "#3b82f6" },
    { name: "Unknown", count: stats.unknown_count, color: "#64748b" },
  ];

  const total = stats.total_vulnerabilities;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Vulnerability Severity Distribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Breakdown across all active projects and dependencies
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Total Findings:</span>{" "}
          <strong className="text-white text-sm font-mono">{total}</strong>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}: {item.count}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}% of
                        total
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
