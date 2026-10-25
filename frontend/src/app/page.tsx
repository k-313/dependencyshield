import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ScanSearch,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  Database,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#070a13]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-base tracking-tight leading-none">
              Dependency<span className="text-indigo-400">Shield</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-xs font-medium text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Generation Software Supply Chain Defense</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stop Vulnerable Packages <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Before They Reach Production
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            DependencyShield delivers rigorous, evidence-based vulnerability intelligence.
            Parse lockfiles, query live OSV advisories, generate CycloneDX SBOMs, and receive
            grounded remediation advice without false positives or fabricated security claims.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all"
            >
              <span>Scan Your Project Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all"
            >
              <span>Explore Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Built for Security-Conscious Engineering Teams
            </h2>
            <p className="text-sm text-slate-400">
              Deterministic parsing, authoritative security feeds, and cryptographic compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center">
                <ScanSearch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Ecosystem-Aware Parsers</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Parse Node.js (<code className="text-slate-300">package-lock.json</code> v1-v3,{" "}
                <code className="text-slate-300">package.json</code>) and Python (
                <code className="text-slate-300">requirements.txt</code>,{" "}
                <code className="text-slate-300">pyproject.toml</code>). Pinned resolved versions
                are strictly distinguished from unbounded ranges.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Authoritative OSV Intelligence</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Queried against Google&apos;s open OSV vulnerability database with batching, exponential
                backoff, and local caching. Outages are never disguised as clean results.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/60 text-blue-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">CycloneDX v1.5 SBOMs</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Export compliant Software Bills of Materials in standard CycloneDX 1.5 JSON with
                cryptographic checksums and Package URLs (PURLs) for software supply chain
                transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 border-t border-slate-800/80">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Three-Step Security Pipeline
            </h2>
            <p className="text-sm text-slate-400">
              Simple to integrate into manual audits and automated CI/CD workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 font-mono font-bold text-lg flex items-center justify-center mx-auto">
                1
              </div>
              <h4 className="text-base font-semibold text-white">Upload Manifest</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide your lockfile or dependency spec. The parser extracts package identities
                without executing arbitrary scripts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-purple-400 font-mono font-bold text-lg flex items-center justify-center mx-auto">
                2
              </div>
              <h4 className="text-base font-semibold text-white">Continuous Intelligence</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Batch queries match resolved packages against known GHSAs and CVEs with authoritative
                CVSS scores and fixed version disclosures.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold text-lg flex items-center justify-center mx-auto">
                3
              </div>
              <h4 className="text-base font-semibold text-white">Remediate & Export</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect AI-assisted step-by-step upgrade instructions and download audit-ready JSON/CSV
                reports or CycloneDX SBOMs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security and Privacy Notice */}
      <section className="py-12 border-t border-slate-800/80 bg-slate-950/60">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <Lock className="w-4 h-4" />
            <span>Strict Privacy & Zero Code Execution Guarantee</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto">
            DependencyShield scans only manifest metadata. We never execute uploaded build scripts,
            never install packages into the runtime environment, and never transmit proprietary
            source code to third-party endpoints.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-[#070a13]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>DependencyShield © 2026 — Supply Chain Security Scanner</span>
          </div>
          <div className="flex items-center gap-4">
            <span>CycloneDX 1.5 Compliant</span>
            <span>•</span>
            <span>OSV Powered</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
