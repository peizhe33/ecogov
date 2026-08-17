"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { jsPDF } from "jspdf";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookMarked,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileStack,
  FileText,
  Gavel,
  Loader2,
  Package,
  Scale,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { useActiveView, useActiveTab, type ViewMode } from "./view-context";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type BatchStatus = "pending" | "approved" | "overridden";

interface QueueBatch {
  id: string;
  hardwareType: string;
  weightKg: number;
  confidence: number;
  status: BatchStatus;
  interactive: boolean;
  extractedText: string;
  ai: { code: string; label: string; confidence: number; citation: string };
  ruledOut: { code: string; label: string; confidence: number; reason: string };
}

interface AuditSite {
  name: string;
  declaredMt: number;
  predictedMt: number;
  flagged: boolean;
}

type PacketStatus = "Submitted to DOE" | "Pending Pickup";

interface CompliancePacket {
  id: string;
  name: string;
  date: string;
  status: PacketStatus;
}

interface ClassificationResult {
  batchId: string;
  hardwareType: string;
  primaryCode: string;
  confidence: number;
  legalCitation: string;
  ruledOutCode: string;
  ruledOutReason: string;
  requiresHumanReview: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                  */
/* -------------------------------------------------------------------------- */

const INITIAL_QUEUE: QueueBatch[] = [
  {
    id: "881-A",
    hardwareType: "Server Chassis (Steel / Aluminum)",
    weightKg: 540,
    confidence: 97,
    status: "approved",
    interactive: false,
    extractedText: "",
    ai: { code: "SW-Metal", label: "Ferrous & Non-Ferrous Scrap", confidence: 97, citation: "" },
    ruledOut: { code: "", label: "", confidence: 0, reason: "" },
  },
  {
    id: "884-D",
    hardwareType: "Mixed Circuit Boards",
    weightKg: 320,
    confidence: 68,
    status: "pending",
    interactive: true,
    extractedText:
      "Batch 884-D: 320kg circuit boards with trace cleaning solvent, recovered from Line 4 teardown, Penang facility. Manifest notes residual flux and isopropyl-based cleaning agent on 6% of units.",
    ai: {
      code: "SW110",
      label: "Electrical & Electronic Assemblies",
      confidence: 68,
      citation: "First Schedule, Environmental Quality (Scheduled Wastes) Regulations 2005",
    },
    ruledOut: {
      code: "SW322",
      label: "Non-Halogenated Organic Solvents",
      confidence: 32,
      reason: "Solvent volume < 1% by mass — below the threshold to classify as a solvent waste stream",
    },
  },
  {
    id: "883-C",
    hardwareType: "Lithium-Ion Battery Packs",
    weightKg: 118,
    confidence: 94,
    status: "approved",
    interactive: false,
    extractedText: "",
    ai: { code: "SW109", label: "Battery & Accumulator Waste", confidence: 94, citation: "" },
    ruledOut: { code: "", label: "", confidence: 0, reason: "" },
  },
];

const OVERRIDE_OPTIONS = [
  { code: "SW322", label: "Non-Halogenated Organic Solvents" },
  { code: "SW409", label: "Spent Corrosive / Acidic Solutions" },
];

const AUDIT_SITES: AuditSite[] = [
  { name: "Site Alpha — Bayan Lepas", declaredMt: 18.6, predictedMt: 18.4, flagged: false },
  { name: "Site Beta — Kulim Hi-Tech", declaredMt: 26.1, predictedMt: 30.3, flagged: true },
  { name: "Site Gamma — Batu Kawan", declaredMt: 12.0, predictedMt: 12.1, flagged: false },
  { name: "Site Delta — Prai Industrial", declaredMt: 9.4, predictedMt: 9.4, flagged: false },
];

const PACKET_STEPS = [
  { threshold: 34, label: "DOE e-SWIS Consignment Note", detail: "Drafted via API" },
  { threshold: 67, label: "Corporate ESG Scope 3 Carbon Ledger", detail: "Updated: -12.4 Tons CO2" },
  { threshold: 100, label: "Cross-Border E-Waste Export Manifest", detail: "Customs Form C2" },
];

const GENERATED_PACKETS: CompliancePacket[] = [
  {
    id: "PKT-4417",
    name: "DOE e-SWIS Consignment Note — Batch 881-A",
    date: "Aug 14, 2026",
    status: "Submitted to DOE",
  },
  {
    id: "PKT-4402",
    name: "Cross-Border Export Manifest — Batch 883-C",
    date: "Aug 11, 2026",
    status: "Pending Pickup",
  },
  {
    id: "PKT-4391",
    name: "Corporate ESG Scope 3 Carbon Ledger — July Cycle",
    date: "Aug 03, 2026",
    status: "Submitted to DOE",
  },
  {
    id: "PKT-4378",
    name: "DOE e-SWIS Consignment Note — Batch 879-B",
    date: "Jul 29, 2026",
    status: "Submitted to DOE",
  },
];

/* -------------------------------------------------------------------------- */
/*  Theme                                                                      */
/* -------------------------------------------------------------------------- */

const THEME: Record<ViewMode, Record<string, string>> = {
  enterprise: {
    accent: "#0E7C66",
    accentDark: "#0B5C4D",
    accentSoft: "#E6F4EF",
    accentSoftBorder: "#BFE3D6",
  },
  regulator: {
    accent: "#B3261E",
    accentDark: "#7C1B16",
    accentSoft: "#FBEAE8",
    accentSoftBorder: "#F0C4C0",
  },
};

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

function Pill({
  tone,
  children,
}: {
  tone: "orange" | "green" | "slate" | "red";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  Forecast chart (signature element)                                        */
/* -------------------------------------------------------------------------- */

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const VALUES = [18, 27, 36, 47, 58, 76, 88, 95, 99]; // storage utilization, %
const CHART_W = 640;
const CHART_H = 220;
const PAD_X = 34;
const TOP = 18;
const BASE = 196;
const THRESHOLD_VALUE = 82;

function valueToY(v: number) {
  return BASE - (v / 100) * (BASE - TOP);
}

function ForecastChart() {
  const points = MONTHS.map((_, i) => ({
    x: PAD_X + i * ((CHART_W - PAD_X * 2) / (MONTHS.length - 1)),
    y: valueToY(VALUES[i]),
  }));
  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${BASE} L ${points[0].x} ${BASE} Z`;

  const thresholdY = valueToY(THRESHOLD_VALUE);
  const todayIndex = 4; // "Jul" — anchors the live forecast
  const todayX = points[todayIndex].x;

  // Crossing point interpolated between the Aug (index 5) and Sep (index 6) samples.
  const crossX =
    points[5].x +
    ((THRESHOLD_VALUE - VALUES[5]) / (VALUES[6] - VALUES[5])) * (points[6].x - points[5].x);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label="90 day storage forecast">
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line x1={PAD_X} y1={BASE} x2={CHART_W - PAD_X} y2={BASE} stroke="#E2E8E6" strokeWidth={1} />

        {/* threshold line */}
        <line
          x1={PAD_X}
          y1={thresholdY}
          x2={CHART_W - PAD_X}
          y2={thresholdY}
          stroke="#DC2626"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
        <text x={PAD_X} y={thresholdY - 8} className="fill-red-600" fontSize="11" fontWeight={600}>
          180-Day Legal Limit (DOE)
        </text>

        {/* today marker */}
        <line
          x1={todayX}
          y1={TOP}
          x2={todayX}
          y2={BASE}
          stroke="#94A3B8"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        <text x={todayX + 6} y={TOP + 10} fontSize="10" fontWeight={600} className="fill-slate-400">
          TODAY
        </text>

        {/* forecast area + line */}
        <path d={areaPath} fill="url(#forecastFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={3} strokeLinecap="round" />

        {/* data points */}
        {points.map((p, i) => (
          <circle key={MONTHS[i]} cx={p.x} cy={p.y} r={3.5} fill="white" stroke="var(--accent)" strokeWidth={2} />
        ))}

        {/* crossing marker */}
        <circle cx={crossX} cy={thresholdY} r={5} fill="#DC2626" />
        <circle cx={crossX} cy={thresholdY} r={9} fill="#DC2626" opacity={0.18} />

        {/* month labels */}
        {points.map((p, i) => (
          <text key={MONTHS[i]} x={p.x} y={CHART_H - 2} fontSize="10" textAnchor="middle" className="fill-slate-400">
            {MONTHS[i]}
          </text>
        ))}
      </svg>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
        <Truck className="h-3.5 w-3.5" />
        Disposal Truck Auto-Scheduled in 45 Days
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  AI Legal Reasoning modal                                                  */
/* -------------------------------------------------------------------------- */

function LegalReasoningModal({
  batch,
  onClose,
  onApprove,
  onOverride,
}: {
  batch: QueueBatch;
  onClose: () => void;
  onApprove: (id: string) => void;
  onOverride: (id: string, code: string, label: string) => void;
}) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideCode, setOverrideCode] = useState(OVERRIDE_OPTIONS[0].code);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-7">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Needs Review · Batch #{batch.id}
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Scale className="h-5 w-5 text-[var(--accent)]" />
              AI Classification Explanation &amp; Legal Citation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close reasoning modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          {/* Left pane: extracted manifest text */}
          <div className="border-b border-slate-100 p-6 sm:border-b-0 sm:border-r sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Extracted from manifest
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[13px] leading-relaxed text-slate-700">
              &ldquo;{batch.extractedText}&rdquo;
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Weight declared
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{batch.weightKg} kg</p>
          </div>

          {/* Right pane: AI working & reasoning */}
          <div className="p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI working &amp; reasoning</p>

            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <Gavel className="h-4 w-4" />
                  Selected
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800">{batch.ai.confidence}%</span>
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-slate-900">
                {batch.ai.code} <span className="font-sans font-normal text-slate-600">— {batch.ai.label}</span>
              </p>
              <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                <BookMarked className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                <span>{batch.ai.citation}</span>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Discarded
                </div>
                <span className="font-mono text-xs font-bold text-slate-500">{batch.ruledOut.confidence}%</span>
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-slate-700">
                {batch.ruledOut.code}{" "}
                <span className="font-sans font-normal text-slate-500">— {batch.ruledOut.label}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">Ruled out: {batch.ruledOut.reason}</p>
            </div>

            {overrideMode && (
              <div className="mt-3 rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select override code
                </p>
                <div className="mt-2 space-y-2">
                  {OVERRIDE_OPTIONS.map((opt) => (
                    <label
                      key={opt.code}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]"
                    >
                      <input
                        type="radio"
                        name="override"
                        value={opt.code}
                        checked={overrideCode === opt.code}
                        onChange={() => setOverrideCode(opt.code)}
                        className="accent-[var(--accent)]"
                      />
                      <span className="font-mono font-semibold text-slate-800">{opt.code}</span>
                      <span className="text-slate-500">— {opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
          {overrideMode ? (
            <>
              <button
                type="button"
                onClick={() => setOverrideMode(false)}
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const opt = OVERRIDE_OPTIONS.find((o) => o.code === overrideCode)!;
                  onOverride(batch.id, opt.code, opt.label);
                  setOverrideMode(false);
                }}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                Confirm Override
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOverrideMode(true)}
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Override Code
              </button>
              <button
                type="button"
                onClick={() => onApprove(batch.id)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <BadgeCheck className="h-4 w-4" />
                Approve &amp; Apply Legal Digital Signature
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  "Declare Once" packet generator                                           */
/* -------------------------------------------------------------------------- */

function DeclareOnceBanner({
  isGenerating,
  onGenerate,
}: {
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-6 shadow-lg sm:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Declare Once
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Generate a complete compliance package instantly
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            One click drafts the e-SWIS Consignment Note, ESG Carbon Ledger, and Export Manifest — cross-referenced
            from the same audited record.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--accent-dark)] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              Generate Compliance Packet
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compliance packet generation modal                                        */
/* -------------------------------------------------------------------------- */

function CompliancePacketModal({
  progress,
  isGenerating,
  done,
  onClose,
  onDownload,
}: {
  progress: number;
  isGenerating: boolean;
  done: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && done) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, done]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm pointer-events-auto"
      onClick={() => done && onClose()}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-5">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Declare Once
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              {done ? "Compliance Packet Ready" : "Generating Compliance Packet"}
            </h3>
          </div>
          {done && (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{done ? "All documents drafted" : "Drafting documents…"}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="mt-5 space-y-3">
            {PACKET_STEPS.map((step) => {
              const checked = progress >= step.threshold;
              return (
                <li key={step.label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-slate-200 text-transparent"
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    ) : null}
                  </span>
                  <span className={checked ? "font-medium text-slate-900" : "text-slate-400"}>
                    {step.label}{" "}
                    <span className={checked ? "text-slate-500" : "text-slate-400"}>({step.detail})</span>
                  </span>
                </li>
              );
            })}
          </ul>

          {done && (
            <button
              type="button"
              onClick={onDownload}
              className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
              Download Signed Bundle (ZIP/PDF)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Decommissioning queue table                                               */
/* -------------------------------------------------------------------------- */

function QueueTable({
  queue,
  onInspect,
  isClassifying,
  classifyingBatchId,
}: {
  queue: QueueBatch[];
  onInspect: (b: QueueBatch) => void | Promise<void>;
  isClassifying: boolean;
  classifyingBatchId: string | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <FileStack className="h-5 w-5 text-slate-600" />
        <h2 className="text-base font-semibold text-slate-900">Decommissioning Queue</h2>
      </div>
      <div className="overflow-x-auto px-2 pb-2 sm:px-4 sm:pb-4">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3 font-semibold">Batch ID</th>
              <th className="px-3 py-3 font-semibold">Hardware Type</th>
              <th className="px-3 py-3 font-semibold">Confidence</th>
              <th className="px-3 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((batch) => (
              <tr key={batch.id} className="text-sm text-slate-700">
                <td className="px-3 py-4 font-mono font-semibold text-slate-900">#{batch.id}</td>
                <td className="px-3 py-4">{batch.hardwareType}</td>
                <td className="px-3 py-4">
                  {batch.status === "approved" && !batch.interactive && (
                    <Pill tone="green">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {batch.confidence}% Confidence (Auto-Approved)
                    </Pill>
                  )}
                  {batch.status === "pending" && (
                    <Pill tone="orange">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {batch.confidence}% Confidence (Ambiguous)
                    </Pill>
                  )}
                  {batch.status === "approved" && batch.interactive && (
                    <Pill tone="green">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Approved · {batch.ai.code}
                    </Pill>
                  )}
                  {batch.status === "overridden" && (
                    <Pill tone="slate">
                      <Gavel className="h-3.5 w-3.5" />
                      Overridden · {batch.ai.code}
                    </Pill>
                  )}
                </td>
                <td className="px-3 py-4">
                  {batch.interactive && batch.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => onInspect(batch)}
                      disabled={isClassifying}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isClassifying && classifyingBatchId === batch.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Inspecting…
                        </>
                      ) : (
                        "Inspect Legal AI Reasoning"
                      )}
                    </button>
                  ) : batch.interactive ? (
                    <button
                      type="button"
                      onClick={() => onInspect(batch)}
                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      View Record
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">No action needed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compliance Packets tab                                                    */
/* -------------------------------------------------------------------------- */

function CompliancePacketsView({ packets }: { packets: CompliancePacket[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <Package className="h-5 w-5 text-slate-600" />
        <h2 className="text-base font-semibold text-slate-900">Generated Compliance Packets</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {packets.map((packet) => (
          <li
            key={packet.id}
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                <FileText className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{packet.name}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {packet.id} · {packet.date}
                </p>
              </div>
            </div>
            {packet.status === "Submitted to DOE" ? (
              <Pill tone="green">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submitted to DOE
              </Pill>
            ) : (
              <Pill tone="orange">
                <Clock3 className="h-3.5 w-3.5" />
                Pending Pickup
              </Pill>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Settings tab (placeholder)                                                */
/* -------------------------------------------------------------------------- */

function SettingsPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <SettingsIcon className="h-6 w-6 text-slate-500" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">Workspace Settings</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Notification preferences, DOE API credentials, and user roles will live here in a future release.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Enterprise view                                                            */
/* -------------------------------------------------------------------------- */

function EnterpriseView({
  queue,
  onInspect,
  isClassifying,
  classifyingBatchId,
  isGenerating,
  onGenerate,
}: {
  queue: QueueBatch[];
  onInspect: (b: QueueBatch) => void | Promise<void>;
  isClassifying: boolean;
  classifyingBatchId: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const pendingCount = queue.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <SectionEyebrow>Predictive compliance</SectionEyebrow>
              <h2 className="mt-1 text-sm font-semibold text-slate-700">90-Day Storage Forecast</h2>
            </div>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
              Breach projected
            </span>
          </div>
          <ForecastChart />
        </article>

        <div className="flex flex-col gap-5">
          <article className="flex-1 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-slate-700">CO2 Avoided</h2>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-emerald-700">12.4 Tons</p>
            <p className="mt-3 text-sm text-slate-600">Projected impact from circular decommissioning optimization.</p>
          </article>

          <article className="flex-1 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Requires Human Review</h2>
              <Clock3 className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-amber-700">{pendingCount} Item</p>
            <p className="mt-3 text-sm text-slate-600">Critical classification ambiguity flagged by the AI workflow.</p>
          </article>
        </div>
      </section>

      <DeclareOnceBanner isGenerating={isGenerating} onGenerate={onGenerate} />

      <QueueTable
        queue={queue}
        onInspect={onInspect}
        isClassifying={isClassifying}
        classifyingBatchId={classifyingBatchId}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Regulator view                                                             */
/* -------------------------------------------------------------------------- */

function RegulatorView() {
  const totalVariance = AUDIT_SITES.reduce((sum, s) => sum + (s.predictedMt - s.declaredMt), 0);
  const flaggedSite = AUDIT_SITES.find((s) => s.flagged);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Sites Monitored</h2>
            <Building2 className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{AUDIT_SITES.length}</p>
          <p className="mt-3 text-sm text-slate-600">Johor Industrial Park, live telemetry feed.</p>
        </article>

        <article className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Active Discrepancies</h2>
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-red-700">1</p>
          <p className="mt-3 text-sm text-slate-600">Unresolved variance exceeding the 2 MT tolerance band.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Network Variance</h2>
            <Scale className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {totalVariance >= 0 ? "+" : ""}
            {totalVariance.toFixed(1)} MT
          </p>
          <p className="mt-3 text-sm text-slate-600">Predicted vs. declared, trailing 30 days.</p>
        </article>
      </section>

      {flaggedSite && (
        <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm sm:flex-row sm:items-start sm:p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600">
              Discrepancy Alert
            </p>
            <h3 className="mt-1 text-base font-semibold text-red-900">
              Predicted E-Waste vs Declared E-Waste mismatch at {flaggedSite.name.split("—")[0].trim()}
            </h3>
            <p className="mt-1 text-sm text-red-800">
              {(flaggedSite.predictedMt - flaggedSite.declaredMt).toFixed(1)} MT unaccounted for — AI-predicted
              volume exceeds the declared manifest for this site.
            </p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Johor Industrial Park E-Waste Audit Stream</h2>
        </div>
        <div className="overflow-x-auto px-2 pb-2 sm:px-4 sm:pb-4">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-semibold">Site</th>
                <th className="px-3 py-3 font-semibold">Declared</th>
                <th className="px-3 py-3 font-semibold">AI-Predicted</th>
                <th className="px-3 py-3 font-semibold">Variance</th>
                <th className="px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_SITES.map((site) => {
                const variance = site.predictedMt - site.declaredMt;
                return (
                  <tr key={site.name} className="text-sm text-slate-700">
                    <td className="px-3 py-4 font-semibold text-slate-900">{site.name}</td>
                    <td className="px-3 py-4 font-mono">{site.declaredMt.toFixed(1)} MT</td>
                    <td className="px-3 py-4 font-mono">{site.predictedMt.toFixed(1)} MT</td>
                    <td className={`px-3 py-4 font-mono ${site.flagged ? "font-semibold text-red-600" : ""}`}>
                      {variance >= 0 ? "+" : ""}
                      {variance.toFixed(1)} MT
                    </td>
                    <td className="px-3 py-4">
                      {site.flagged ? (
                        <Pill tone="red">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Discrepancy Flagged
                        </Pill>
                      ) : (
                        <Pill tone="green">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reconciled
                        </Pill>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const activeView = useActiveView();
  const { activeTab, setActiveTab } = useActiveTab();

  const [queue, setQueue] = useState<QueueBatch[]>(INITIAL_QUEUE);
  const [selectedLog, setSelectedLog] = useState<QueueBatch | null>(null);
  const [packets, setPackets] = useState<CompliancePacket[]>(GENERATED_PACKETS);

  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyingBatchId, setClassifyingBatchId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [packetGenerated, setPacketGenerated] = useState(false);
  const [showPacketModal, setShowPacketModal] = useState(false);
  const [packetProgress, setPacketProgress] = useState(0);

  function mergeClassification(batch: QueueBatch, result: ClassificationResult): QueueBatch {
    const confidence = Math.max(0, Math.min(100, result.confidence));
    return {
      ...batch,
      id: result.batchId || batch.id,
      hardwareType: result.hardwareType || batch.hardwareType,
      confidence,
      status: result.requiresHumanReview ? "pending" : "approved",
      interactive: result.requiresHumanReview,
      ai: {
        ...batch.ai,
        code: result.primaryCode || batch.ai.code,
        confidence,
        citation: result.legalCitation || batch.ai.citation,
      },
      ruledOut: {
        ...batch.ruledOut,
        code: result.ruledOutCode || batch.ruledOut.code,
        confidence: Math.max(0, 100 - confidence),
        reason: result.ruledOutReason || batch.ruledOut.reason,
      },
    };
  }

  // Progress animation for the compliance packet generator. The moment it
  // completes, the new packet lands in the Compliance Packets tab — the
  // "Download" button just closes the modal and takes the user there.
  useEffect(() => {
    if (!isGenerating) return;
    if (packetProgress >= 100) {
      setIsGenerating(false);
      setPacketGenerated(true);
      setPackets((prev) => [
        {
          id: `PKT-${Math.floor(1000 + Math.random() * 9000)}`,
          name: "Declare Once Compliance Bundle",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
          status: "Pending Pickup",
        },
        ...prev,
      ]);
      return;
    }
    const t = setTimeout(() => setPacketProgress((p) => Math.min(100, p + 4)), 70);
    return () => clearTimeout(t);
  }, [isGenerating, packetProgress]);

  function handleGeneratePacket() {
    setPacketGenerated(false);
    setPacketProgress(0);
    setIsGenerating(true);
    setShowPacketModal(true);
  }

  function handleCloseModal() {
    setShowPacketModal(false);
  }

  function downloadComplianceBundle() {
    const doc = new jsPDF();
    const timestamp = new Date().toISOString();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EcoGov AI — DOE Compliance Packet", 20, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Consignment Reference: e-SWIS / 2026-884D", 20, 40);
    doc.text("Classification: SW110 — Electrical and Electronic Assemblies", 20, 50);
    doc.text("Mass / Weight: 320 kg (Dell Motherboard Assemblies)", 20, 60);
    doc.text("Environmental Authority: Jabatan Alam Sekitar (DOE) Johor", 20, 70);
    doc.text("Verification Hash: SHA256: 9e107d9d372bb6826bd81d3542a419d6", 20, 80);
    doc.text(`Timestamp: ${timestamp}`, 20, 90);

    doc.save("EcoGov_Compliance_Packet_884D.pdf");
  }

  function handleDownloadBundle() {
    downloadComplianceBundle();
    setShowPacketModal(false);
    setActiveTab("packets");
  }

  function handleApprove(id: string) {
    setQueue((q) => q.map((b) => (b.id === id ? { ...b, status: "approved" as BatchStatus } : b)));
    setSelectedLog(null);
  }

  function handleOverride(id: string, code: string, label: string) {
    setQueue((q) =>
      q.map((b) =>
        b.id === id
          ? { ...b, status: "overridden" as BatchStatus, ai: { ...b.ai, code, label } }
          : b
      )
    );
    setSelectedLog(null);
  }

  async function handleInspect(batch: QueueBatch) {
    setIsClassifying(true);
    setClassifyingBatchId(batch.id);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifestText: batch.extractedText }),
      });

      if (!response.ok) {
        throw new Error("Classification request failed");
      }

      const result = (await response.json()) as ClassificationResult;
      const merged = mergeClassification(batch, result);

      setQueue((q) => q.map((b) => (b.id === batch.id ? merged : b)));
      setSelectedLog(merged);
    } catch {
      // Fallback to showing the existing record if the request fails unexpectedly.
      setSelectedLog(batch);
    } finally {
      setIsClassifying(false);
      setClassifyingBatchId(null);
    }
  }

  const theme = THEME[activeView];
  const isRegulator = activeView === "regulator";
  const isLegalModalOpen = selectedLog !== null;
  const isPacketModalOpen = showPacketModal && (isGenerating || packetGenerated);

  // No header, toggle, or breadcrumb here — the layout's sidebar, top bar,
  // view toggle, and page title already cover that. This component only
  // owns the CSS theme variables (so the accent recolors with the layout's
  // toggle) and the actual dashboard content.
  return (
    <div
      style={
        {
          "--accent": theme.accent,
          "--accent-dark": theme.accentDark,
          "--accent-soft": theme.accentSoft,
          "--accent-soft-border": theme.accentSoftBorder,
        } as CSSProperties
      }
    >
      {activeTab === "dashboard" &&
        (isRegulator ? (
          <RegulatorView />
        ) : (
          <EnterpriseView
            queue={queue}
            onInspect={handleInspect}
            isClassifying={isClassifying}
            classifyingBatchId={classifyingBatchId}
            isGenerating={isGenerating}
            onGenerate={handleGeneratePacket}
          />
        ))}

      {activeTab === "logs" && (
        <QueueTable
          queue={queue}
          onInspect={handleInspect}
          isClassifying={isClassifying}
          classifyingBatchId={classifyingBatchId}
        />
      )}

      {activeTab === "packets" && <CompliancePacketsView packets={packets} />}

      {activeTab === "settings" && <SettingsPanel />}

      {isLegalModalOpen && selectedLog && (
        <LegalReasoningModal
          batch={selectedLog}
          onClose={() => setSelectedLog(null)}
          onApprove={handleApprove}
          onOverride={handleOverride}
        />
      )}

      {isPacketModalOpen && (
        <CompliancePacketModal
          progress={packetProgress}
          isGenerating={isGenerating}
          done={packetGenerated}
          onClose={handleCloseModal}
          onDownload={handleDownloadBundle}
        />
      )}
    </div>
  );
}
