"use client";

import React, { useEffect, useState } from "react";
import { ModelMetadata } from "@/lib/types";
import { fetchModelMetadata } from "@/lib/api";
import { ShieldCheck, Cpu, CheckCircle2, AlertOctagon, Terminal, FileCode, Layers } from "lucide-react";

export function AdminModelView() {
  const [meta, setMeta] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModelMetadata()
      .then((data) => {
        setMeta(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-ink/60 dark:text-[#8A9086]">
        Loading Model Governance & Evaluation Metadata...
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded text-red-800 dark:text-red-300 text-xs">
        Failed to load admin metadata: {error || "Unknown error"}
      </div>
    );
  }

  const ev = meta.test_set_evaluation;
  const cm = ev.confusion_matrix;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2.5 text-teal text-xs font-semibold uppercase tracking-wider mb-1">
          <ShieldCheck size={18} />
          System Administrator &amp; Model Governance Panel
        </div>
        <h2 className="font-serif text-2xl font-bold">Machine Learning Classifier &amp; Audit Specifications</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-[75ch]">
          Auditable record of trained model architecture, validation metrics on strictly held-out test splits,
          anti-leakage compliance, and retraining procedures.
        </p>
      </div>

      {/* Model Specs & Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
          <span className="text-xs text-ink/50 dark:text-[#8A9086]">Model Family</span>
          <div className="font-serif text-xl font-bold mt-1 text-ink dark:text-white">LightGBM</div>
          <span className="text-[11px] text-teal font-mono">LGBMClassifier</span>
        </div>

        <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
          <span className="text-xs text-ink/50 dark:text-[#8A9086]">Held-Out Test Samples</span>
          <div className="font-serif text-xl font-bold mt-1 text-ink dark:text-white">6,099</div>
          <span className="text-[11px] text-ink/60 dark:text-[#8A9086]">Unseen test evaluation split</span>
        </div>

        <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
          <span className="text-xs text-ink/50 dark:text-[#8A9086]">Test Precision / Recall</span>
          <div className="font-serif text-xl font-bold mt-1 text-emerald-600">
            {(ev.precision * 100).toFixed(1)}% / {(ev.recall * 100).toFixed(1)}%
          </div>
          <span className="text-[11px] text-ink/60 dark:text-[#8A9086]">F1-Score: {ev.f1_score.toFixed(4)}</span>
        </div>

        <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
          <span className="text-xs text-ink/50 dark:text-[#8A9086]">ROC-AUC / PR-AUC</span>
          <div className="font-serif text-xl font-bold mt-1 text-blue-600">
            {ev.roc_auc.toFixed(4)} / {ev.pr_auc.toFixed(4)}
          </div>
          <span className="text-[11px] text-ink/60 dark:text-[#8A9086]">Area under precision-recall curve</span>
        </div>
      </div>

      {/* Confusion Matrix & Anti-Leakage Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2x2 Confusion Matrix */}
        <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-5 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={18} className="text-teal" />
            <h3 className="font-serif text-lg font-semibold">Test Confusion Matrix (N = {ev.test_samples})</h3>
          </div>
          <p className="text-xs text-ink/60 dark:text-[#8A9086] mb-4">
            Evaluated on held-out test projects to verify generalization without data contamination.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-[420px] mx-auto text-center font-mono">
            {/* True Negative */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-4 rounded-lg">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-sans block">
                True Negatives (TN)
              </span>
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">
                {cm.true_negatives}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
                Correctly flagged On-Track
              </span>
            </div>

            {/* False Positive */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-lg">
              <span className="text-[11px] text-amber-800 dark:text-amber-300 font-sans block">
                False Positives (FP)
              </span>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-200">
                {cm.false_positives}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1">
                Type I: False Alarm
              </span>
            </div>

            {/* False Negative */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 p-4 rounded-lg">
              <span className="text-[11px] text-red-800 dark:text-red-300 font-sans block">
                False Negatives (FN)
              </span>
              <span className="text-2xl font-bold text-red-700 dark:text-red-200">
                {cm.false_negatives}
              </span>
              <span className="text-[10px] text-red-600 dark:text-red-400 block mt-1">
                Type II: Missed Delays
              </span>
            </div>

            {/* True Positive */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 p-4 rounded-lg">
              <span className="text-[11px] text-blue-800 dark:text-blue-300 font-sans block">
                True Positives (TP)
              </span>
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-200">
                {cm.true_positives}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-1">
                Correctly Identified Delays
              </span>
            </div>
          </div>
        </div>

        {/* Anti-Leakage & Governance Rules */}
        <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-5 rounded-lg space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon size={18} className="text-amber-600" />
            <h3 className="font-serif text-lg font-semibold">Strict Anti-Leakage Guarantees</h3>
          </div>

          <div className="space-y-2 text-xs text-ink/80 dark:text-[#B9BEB2]">
            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-line dark:border-[#2A3742]">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Mandatory Proxy Exclusion:</strong> Columns <code className="bg-paper dark:bg-slate-800 px-1 py-0.5 rounded font-mono">time_overrun_months</code> and <code className="bg-paper dark:bg-slate-800 px-1 py-0.5 rounded font-mono">time_overrun_months_was_missing</code> are dropped defensively and never pass into feature matrix or SHAP drivers.
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-line dark:border-[#2A3742]">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Project-Level Split Preservation:</strong> Training, validation, and testing partitions were split at the unique <code className="bg-paper dark:bg-slate-800 px-1 py-0.5 rounded font-mono">project_id</code> boundary to prevent temporal bleed.
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-line dark:border-[#2A3742]">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>No Coordinate Fabrication:</strong> Respects the absence of raw GPS coordinates; strictly aggregates at <code className="bg-paper dark:bg-slate-800 px-1 py-0.5 rounded font-mono">region_final</code> and state frequency levels.
              </div>
            </div>
          </div>

          {/* Retraining Instructions */}
          <div className="mt-4 pt-3 border-t border-line dark:border-[#2A3742]">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-ink dark:text-white mb-2">
              <Terminal size={14} className="text-teal" />
              Retraining Instructions
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-[11px] font-mono overflow-x-auto">
              python train_model.py --data_dir extracted --out_dir model_output
            </pre>
            <span className="text-[11px] text-ink/50 dark:text-[#8A9086] mt-1 block">
              Outputs bundle to <code className="font-mono">model_output/model_bundle.joblib</code> with schema and metrics.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
