"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Project } from "@/types";
import { projectsApi, scansApi } from "@/lib/api";
import { UploadDropzone } from "@/components/scans/upload-dropzone";
import {
  ScanSearch,
  FolderGit2,
  FileCheck2,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";

function NewScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project_id") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await projectsApi.list();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      } catch {
        setErrorMessage("Failed to load project list.");
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setErrorMessage("Please select or create a project first.");
      return;
    }
    if (!selectedFile) {
      setErrorMessage("Please select a valid dependency manifest to scan.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await scansApi.create(selectedProjectId, selectedFile);
      router.push(`/scans/${response.scan_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start scan.";
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Initiate Dependency Scan</h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload a package manifest or resolved lockfile for automated OSV vulnerability matching
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selector Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              Target Project
            </label>
            <Link
              href="/projects"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              + Create New Project
            </Link>
          </div>

          {loadingProjects ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              Loading your projects...
            </div>
          ) : projects.length > 0 ? (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.scan_count} existing scans)
                </option>
              ))}
            </select>
          ) : (
            <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 text-amber-300 text-xs flex items-center justify-between">
              <span>No projects exist yet. Please create one before running a scan.</span>
              <Link
                href="/projects"
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold ml-4 shrink-0"
              >
                Create Project
              </Link>
            </div>
          )}
        </div>

        {/* Upload Dropzone Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-indigo-400" />
            Dependency Manifest
          </label>

          <UploadDropzone
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </div>

        {/* Ecosystem Best Practices Notice */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Scanning Guidelines & Supported Manifests</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
            <li>
              <strong className="text-slate-300">Node.js:</strong> Uploading{" "}
              <code className="text-indigo-300">package-lock.json</code> is highly recommended
              over <code className="text-indigo-300">package.json</code> for exact resolved versions.
            </li>
            <li>
              <strong className="text-slate-300">Python:</strong> Uploading pinned{" "}
              <code className="text-indigo-300">requirements.txt</code> (generated via{" "}
              <code>pip freeze</code>) ensures 100% exact advisory matching.
            </li>
            <li>
              Files are parsed strictly as structured text. No arbitrary scripts are executed.
            </li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !selectedFile || !selectedProjectId}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Queueing Analysis Job...</span>
            </>
          ) : (
            <>
              <ScanSearch className="w-4 h-4" />
              <span>Launch Automated Scan</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function NewScanPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading scan setup...</p>
        </div>
      }
    >
      <NewScanContent />
    </Suspense>
  );
}
