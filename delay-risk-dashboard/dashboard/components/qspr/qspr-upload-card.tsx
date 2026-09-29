"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileCheck2, FileX2, Loader2, CalendarCheck } from "lucide-react";
import { qsprValidatePdf, qsprPredictPdf } from "@/lib/qspr-api";
import { QsprPredictResponse, QsprValidationResult } from "@/lib/qspr-types";

type Stage = "idle" | "validating" | "validated" | "invalid" | "processing" | "done" | "error";

interface QsprUploadCardProps {
  onProcessed: (result: QsprPredictResponse) => void;
}

export function QsprUploadCard({ onProcessed }: QsprUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [validation, setValidation] = useState<QsprValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportLabelOverride, setReportLabelOverride] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setValidation(null);
    setErrorMessage(null);
    setStage("validating");
    try {
      const result = await qsprValidatePdf(selected);
      setValidation(result);
      setStage(result.is_valid ? "validated" : "invalid");
    } catch (err: any) {
      setErrorMessage(err?.message || "Validation request failed.");
      setStage("error");
    }
  }

  async function handleProcess() {
    if (!file) return;
    setStage("processing");
    setErrorMessage(null);
    try {
      const result = await qsprPredictPdf(
        file,
        validation?.detected_report_label ? undefined : reportLabelOverride || undefined
      );
      setStage("done");
      onProcessed(result);
    } catch (err: any) {
      setErrorMessage(err?.message || "Prediction request failed.");
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setValidation(null);
    setErrorMessage(null);
    setReportLabelOverride("");
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const needsManualDate = stage === "validated" && !validation?.detected_report_label;

  return (
    <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-5 rounded-lg">
      <h3 className="font-serif text-lg font-semibold mb-1">Upload PAIMANA Flash Report</h3>
      <p className="text-xs text-ink/60 dark:text-[#8A9086] mb-4">
        Upload the official monthly QSPR/PAIMANA Flash Report PDF. The report's own content is used
        to detect its month and year — the file name is never trusted for this.
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) handleFileSelected(dropped);
        }}
        className="border-2 border-dashed border-line dark:border-[#2A3742] rounded-lg p-6 text-center cursor-pointer hover:border-teal transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFileSelected(selected);
          }}
        />
        <UploadCloud size={28} className="mx-auto mb-2 text-teal" />
        <p className="text-xs text-ink/70 dark:text-gray-300">
          {file ? file.name : "Click to browse or drop a PDF here"}
        </p>
      </div>

      {stage === "validating" && (
        <div className="mt-4 flex items-center gap-2 text-xs text-ink/60 dark:text-[#8A9086]">
          <Loader2 size={14} className="animate-spin" />
          Validating report structure…
        </div>
      )}

      {stage === "invalid" && validation && (
        <div className="mt-4 flex items-start gap-2 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg p-3">
          <FileX2 size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Report is not compatible with the expected PAIMANA/QSPR Flash Report structure.
            </p>
            <p className="mt-1">{validation.reason}</p>
          </div>
        </div>
      )}

      {(stage === "validated" || stage === "processing" || stage === "done") && validation && (
        <div className="mt-4 flex items-start gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg p-3">
          <FileCheck2 size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Valid PAIMANA/QSPR Flash Report.</p>
            {validation.detected_report_label ? (
              <p className="flex items-center gap-1.5">
                <CalendarCheck size={13} />
                Detected report period: <span className="font-semibold">{validation.detected_report_label}</span>
              </p>
            ) : (
              <p>Report period could not be auto-detected from this PDF's content.</p>
            )}
          </div>
        </div>
      )}

      {needsManualDate && (
        <div className="mt-3">
          <label className="text-[11px] text-ink/60 dark:text-[#8A9086] block mb-1">
            Report month/year could not be detected — please confirm it before processing:
          </label>
          <input
            type="text"
            placeholder="e.g. July 2026"
            value={reportLabelOverride}
            onChange={(e) => setReportLabelOverride(e.target.value)}
            className="w-full max-w-[220px] border border-line dark:border-[#2A3742] rounded bg-paper dark:bg-slate-800 text-ink dark:text-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal"
          />
        </div>
      )}

      {stage === "error" && errorMessage && (
        <div className="mt-4 flex items-start gap-2 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg p-3">
          <FileX2 size={16} className="shrink-0 mt-0.5" />
          {errorMessage}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={handleProcess}
          disabled={
            stage !== "validated" ||
            (needsManualDate && reportLabelOverride.trim() === "") ||
            stage === "processing" as Stage
          }
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-teal text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal/90 transition-colors"
        >
          {stage === "processing" ? <Loader2 size={14} className="animate-spin" /> : null}
          {stage === "processing" ? "Processing report…" : "Process report"}
        </button>

        {file && (
          <button
            onClick={reset}
            className="text-xs text-ink/60 hover:text-ink dark:text-gray-400 dark:hover:text-white px-3 py-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
