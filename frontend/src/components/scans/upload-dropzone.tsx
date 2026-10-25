"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileCode2, X, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const SUPPORTED_FILES = [
  "package.json",
  "package-lock.json",
  "requirements.txt",
  "pyproject.toml",
];

const MAX_SIZE_MB = 5;

export function UploadDropzone({ onFileSelect, selectedFile }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const fname = file.name.toLowerCase();
    const isSupported =
      SUPPORTED_FILES.includes(fname) ||
      (fname.endsWith(".txt") && fname.includes("requirement"));

    if (!isSupported) {
      setErrorMessage(
        `Unsupported manifest file '${file.name}'. Please upload package.json, package-lock.json, requirements.txt, or pyproject.toml.`
      );
      onFileSelect(null);
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File exceeds ${MAX_SIZE_MB}MB size limit.`);
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    onFileSelect(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,.toml"
        onChange={handleFileInput}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-indigo-500 bg-indigo-950/20"
              : "border-slate-800 hover:border-slate-700 bg-slate-900/30"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-white mb-1">
            Click to upload or drag & drop manifest
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Supports <strong className="text-slate-300">package-lock.json</strong>,{" "}
            <strong className="text-slate-300">package.json</strong>,{" "}
            <strong className="text-slate-300">requirements.txt</strong>, or{" "}
            <strong className="text-slate-300">pyproject.toml</strong> (max 5MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready for scan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
