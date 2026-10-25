"use client";

import React, { useState } from "react";
import { AIRemediation } from "@/types";
import { Sparkles, Check, Copy, ExternalLink, CheckCircle2 } from "lucide-react";

interface AIRemediationCardProps {
  remediation: AIRemediation;
}

export function AIRemediationCard({ remediation }: AIRemediationCardProps) {
  const [copied, setCopied] = useState(false);

  const copySteps = () => {
    const text = remediation.remediation_steps.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-indigo-900/60 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-900/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Remediation & Action Plan
              {remediation.is_ai_generated ? (
                <span className="text-[10px] font-medium bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full">
                  AI-Assisted (Gemini)
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                  Authoritative Advisory Data
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Grounded strictly in verified advisory disclosures for{" "}
              <strong className="text-slate-200">{remediation.package_name}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={copySteps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              Copy Steps
            </>
          )}
        </button>
      </div>

      {/* Risk Analysis */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Impact & Risk Summary
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          {remediation.risk_analysis}
        </p>
      </div>

      {/* Recommended Target */}
      {remediation.upgrade_guidance && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            <strong>Resolution target:</strong> {remediation.upgrade_guidance}
          </span>
        </div>
      )}

      {/* Step-by-Step Remediation */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Recommended Action Steps
        </h4>
        <ol className="space-y-2">
          {remediation.remediation_steps.map((step, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-950/80 text-indigo-400 font-mono text-[11px] flex items-center justify-center shrink-0 border border-indigo-800/50">
                {idx + 1}
              </span>
              <span className="font-mono mt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Authoritative References */}
      {remediation.authoritative_references.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Disclosed Advisory Links
          </h4>
          <div className="flex flex-wrap gap-2">
            {remediation.authoritative_references.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 border border-indigo-900/40 px-2.5 py-1 rounded-md transition-colors truncate max-w-xs"
              >
                <span>{new URL(url).hostname}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
