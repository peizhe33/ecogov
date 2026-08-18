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
  ClipboardEdit,
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
  requiresHumanReview?: boolean;
  hasBeenInspected?: boolean;
  overrideJustification?: string;
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
  batches?: QueueBatch[];
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

const OVERRIDE_JUSTIFICATION_PRESETS = [
  "Incidental surface residue (<1% total mass)",
  "Verified via on-site technical inspection",
  "Lab sample confirms non-hazardous solvent",
];

interface IntakePreset {
  id: string;
  label: string;
  manifestText: string;
  weightKg: number;
}

const INTAKE_PRESETS: IntakePreset[] = [
  {
    id: "preset-r740",
    label: "Dell PowerEdge R740 Racks (450kg)",
    manifestText: "Dell PowerEdge R740 Racks (450kg) — Intact chassis & power supplies",
    weightKg: 450,
  },
  {
    id: "preset-884d",
    label: "Batch 884-D: Circuit Boards (320kg)",
    manifestText: "Batch 884-D: 320kg circuit boards with trace isopropyl cleaning solvent",
    weightKg: 320,
  },
  {
    id: "preset-apc-ups",
    label: "APC Smart-UPS Battery Packs (180kg)",
    manifestText: "APC Smart-UPS Modular Battery Packs (180kg) — Leaking lead-acid cells",
    weightKg: 180,
  },
];

const INTAKE_FACILITIES = [
  "Johor Data Center Alpha — Dock 2",
  "Penang Assembly Facility — Bay 3",
  "Kulim Hi-Tech Park — Receiving Dock",
  "Bayan Lepas Logistics Hub — Dock 1",
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
  onOverride: (id: string, code: string, label: string, justification: string) => void;
}) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideCode, setOverrideCode] = useState(OVERRIDE_OPTIONS[0].code);
  const [justificationPreset, setJustificationPreset] = useState<string | null>(null);
  const [justificationNote, setJustificationNote] = useState("");

  const trimmedNote = justificationNote.trim();
  const canConfirmOverride = Boolean(justificationPreset || trimmedNote);

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
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-7">
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

        <div className="flex-1 overflow-y-auto pr-1">
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

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Override Justification
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {OVERRIDE_JUSTIFICATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setJustificationPreset((current) => (current === preset ? null : preset))
                        }
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                          justificationPreset === preset
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={justificationNote}
                    onChange={(e) => setJustificationNote(e.target.value)}
                    placeholder="Optional custom note…"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 z-10 flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
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
                disabled={!canConfirmOverride}
                onClick={() => {
                  const opt = OVERRIDE_OPTIONS.find((o) => o.code === overrideCode)!;
                  const justification = [justificationPreset, trimmedNote].filter(Boolean).join(" — ");
                  onOverride(batch.id, opt.code, opt.label, justification);
                  setOverrideMode(false);
                }}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
  disabled,
  disabledReason,
}: {
  isGenerating: boolean;
  onGenerate: () => void;
  disabled: boolean;
  disabledReason: string | null;
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

        <div className="flex shrink-0 flex-col items-stretch gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            title={disabledReason ?? undefined}
            aria-disabled={disabled || isGenerating}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--accent-dark)] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
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
          {disabledReason && !isGenerating && (
            <p className="max-w-[260px] text-center text-xs font-medium text-white/80">{disabledReason}</p>
          )}
        </div>
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

function QueueEmptyState({ onGoToIntake }: { onGoToIntake: () => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <CheckCircle2 className="h-7 w-7 text-[var(--accent)]" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Staging Queue Clear</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          All decommissioned batches have been bundled into signed compliance packets. Ingest new hardware from the
          Waste Intake tab.
        </p>
        <button
          type="button"
          onClick={onGoToIntake}
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-dark)]"
        >
          Go to Waste Intake
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function QueueTable({
  queue,
  onInspect,
  onViewRecord,
  isClassifying,
  classifyingBatchId,
  onGoToIntake,
}: {
  queue: QueueBatch[];
  onInspect: (b: QueueBatch) => void | Promise<void>;
  onViewRecord: (b: QueueBatch) => void;
  isClassifying: boolean;
  classifyingBatchId: string | null;
  onGoToIntake: () => void;
}) {
  if (queue.length === 0) {
    return <QueueEmptyState onGoToIntake={onGoToIntake} />;
  }

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
                      onClick={() => onViewRecord(batch)}
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
/*  Waste Intake tab                                                          */
/* -------------------------------------------------------------------------- */

interface IntakeSubmitPayload {
  manifestText: string;
  weightKg: number;
  facility: string;
}

function IntakeView({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (payload: IntakeSubmitPayload) => Promise<boolean>;
}) {
  const [facility, setFacility] = useState(INTAKE_FACILITIES[0]);
  const [manifestText, setManifestText] = useState("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [submitError, setSubmitError] = useState(false);

  function applyPreset(preset: IntakePreset) {
    setManifestText(preset.manifestText);
    setWeightKg(preset.weightKg);
    setSubmitError(false);
  }

  const canSubmit = manifestText.trim().length > 0 && weightKg !== "" && Number(weightKg) > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(false);
    const success = await onSubmit({ manifestText: manifestText.trim(), weightKg: Number(weightKg), facility });
    if (success) {
      setManifestText("");
      setWeightKg("");
    } else {
      setSubmitError(true);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <SectionEyebrow>Warehouse Intake</SectionEyebrow>
        <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-900">
          <ClipboardEdit className="h-5 w-5 text-[var(--accent)]" />
          Warehouse Waste Intake &amp; Triage
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Ingest physical hardware decommissioning logs for automated DOE classification.
        </p>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick-Fill Presets</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTAKE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-dark)]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Facility</span>
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              {INTAKE_FACILITIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Declared Weight (kg)
            </span>
            <input
              type="number"
              min={0}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 320"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </label>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Technician Decommissioning Log / Manifest Details
          </span>
          <textarea
            value={manifestText}
            onChange={(e) => setManifestText(e.target.value)}
            rows={5}
            placeholder="Describe the hardware, condition, and any hazardous materials or residual contaminants noted during teardown…"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
        </label>

        {submitError && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Classification request failed — please try again.
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Classifying…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run AI Classification &amp; Dispatch to Queue
              </>
            )}
          </button>
        </div>
      </section>
    </div>
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
  onViewRecord,
  isClassifying,
  classifyingBatchId,
  isGenerating,
  onGenerate,
  onGoToIntake,
}: {
  queue: QueueBatch[];
  onInspect: (b: QueueBatch) => void | Promise<void>;
  onViewRecord: (b: QueueBatch) => void;
  isClassifying: boolean;
  classifyingBatchId: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onGoToIntake: () => void;
}) {
  const pendingCount = queue.filter((b) => b.status === "pending" || b.requiresHumanReview === true).length;
  const canGenerate = queue.length > 0 && pendingCount === 0;
  const generateDisabledReason =
    queue.length === 0
      ? "No batches are staged for compliance"
      : pendingCount > 0
        ? "Resolve pending AI reviews before generating"
        : null;

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

      <DeclareOnceBanner
        isGenerating={isGenerating}
        onGenerate={onGenerate}
        disabled={!canGenerate}
        disabledReason={generateDisabledReason}
      />

      <QueueTable
        queue={queue}
        onInspect={onInspect}
        onViewRecord={onViewRecord}
        isClassifying={isClassifying}
        classifyingBatchId={classifyingBatchId}
        onGoToIntake={onGoToIntake}
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
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [packetGenerated, setPacketGenerated] = useState(false);
  const [showPacketModal, setShowPacketModal] = useState(false);
  const [packetProgress, setPacketProgress] = useState(0);
  const [generatedQueueSnapshot, setGeneratedQueueSnapshot] = useState<QueueBatch[]>([]);

  // Once the AI has classified a batch, the result is cached on the batch
  // itself and treated as final: status flips to "approved", the human
  // review flag is cleared, and the full reasoning payload is stored so the
  // "View Record" button can reopen the modal instantly without re-hitting
  // /api/classify.
  function mergeClassification(batch: QueueBatch, result: ClassificationResult): QueueBatch {
    const confidence = Math.max(0, Math.min(100, result.confidence));
    return {
      ...batch,
      id: result.batchId || batch.id,
      hardwareType: result.hardwareType || batch.hardwareType,
      confidence: result.confidence,
      status: "approved",
      interactive: true,
      requiresHumanReview: false,
      hasBeenInspected: true,
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

  // Progress animation for the compliance packet generator. When generation
  // completes, snapshot the active queue into the packet record and clear the
  // staging queue. The generated snapshot is retained for the PDF download.
  useEffect(() => {
    if (!isGenerating) return;
    if (packetProgress >= 100) {
      const snapshot = queue.map((batch) => ({ ...batch }));
      const packet: CompliancePacket = {
        id: `PKT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "Declare Once Compliance Bundle",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
        status: "Pending Pickup",
        batches: snapshot,
      };

      setGeneratedQueueSnapshot(snapshot);
      setPackets((prev) => [packet, ...prev]);
      setQueue([]);
      setIsGenerating(false);
      setPacketGenerated(true);
      setActiveTab("packets");
      return;
    }
    const t = setTimeout(() => setPacketProgress((p) => Math.min(100, p + 4)), 70);
    return () => clearTimeout(t);
  }, [isGenerating, packetProgress, queue, setActiveTab]);

  function handleGeneratePacket() {
    const pendingCount = queue.filter((b) => b.status === "pending" || b.requiresHumanReview === true).length;
    if (queue.length === 0 || pendingCount > 0) return;

    setGeneratedQueueSnapshot([]);
    setPacketGenerated(false);
    setPacketProgress(0);
    setIsGenerating(true);
    setShowPacketModal(true);
  }

  function handleCloseModal() {
    setShowPacketModal(false);
  }

  function downloadComplianceBundle(queue: QueueBatch[]) {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    const timestamp = new Date();

    const formattedDate = timestamp.toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const formattedTime = timestamp.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const reportId = `EG-${timestamp.getFullYear()}-${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const totalWeight = queue.reduce(
      (sum, batch) => sum + (Number(batch.weightKg) || 0),
      0
    );

    const approvedCount = queue.filter(
      (batch) => batch.status === "approved"
    ).length;

    const pendingCount = queue.filter(
      (batch) => batch.status === "pending"
    ).length;

    const overriddenCount = queue.filter(
      (batch) => batch.status === "overridden"
    ).length;

    const averageConfidence =
      queue.length > 0
        ? queue.reduce(
            (sum, batch) => sum + (Number(batch.confidence) || 0),
            0
          ) / queue.length
        : 0;

    /*
    * --------------------------------------------------------------------------
    * Helpers
    * --------------------------------------------------------------------------
    */

    const addPageHeader = () => {
      // Header line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, 13, pageWidth - margin, 13);

      // Brand
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("ECOGOV AI", margin, 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Environmental Compliance Intelligence Platform",
        pageWidth - margin,
        10,
        { align: "right" }
      );

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);

      doc.text(
        "EcoGov AI • DOE Compliance Record",
        margin,
        pageHeight - 8
      );

      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" }
      );
    };

    const addSectionTitle = (
      title: string,
      subtitle?: string,
      y?: number
    ) => {
      let currentY = y ?? 24;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin, currentY);

      if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(subtitle, margin, currentY + 5);
        currentY += 5;
      }

      return currentY;
    };

    const addNewPageIfNeeded = (requiredHeight: number, currentY: number) => {
      if (currentY + requiredHeight > pageHeight - 22) {
        doc.addPage();
        addPageHeader();
        return 24;
      }

      return currentY;
    };

    const statusLabel = (status: BatchStatus) => {
      switch (status) {
        case "approved":
          return "APPROVED";
        case "pending":
          return "REVIEW";
        case "overridden":
          return "OVERRIDDEN";
        default:
          return String(status).toUpperCase();
      }
    };

    /*
    * --------------------------------------------------------------------------
    * PAGE 1 — Executive summary
    * --------------------------------------------------------------------------
    */

    addPageHeader();

    // Hero
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, 22, contentWidth, 34, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text("DOE Decommissioning", margin + 7, 35);

    doc.setFontSize(19);
    doc.text("Compliance Report", margin + 7, 44);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(
      "Dynamic report generated directly from the current Decommissioning Queue",
      margin + 7,
      50
    );

    // Report metadata
    let y = 66;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    doc.text("REPORT ID", margin, y);
    doc.text("GENERATED", margin + 52, y);
    doc.text("AUTHORITY", margin + 110, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text(reportId, margin, y + 6);
    doc.text(`${formattedDate} • ${formattedTime}`, margin + 52, y + 6);
    doc.text("Jabatan Alam Sekitar (DOE)", margin + 110, y + 6);

    // Summary section
    y = 88;

    y = addSectionTitle(
      "Compliance Overview",
      "Snapshot of the queue at the time this report was generated.",
      y
    );

    y += 9;

    const cardGap = 4;
    const cardWidth = (contentWidth - cardGap * 3) / 4;
    const cardHeight = 25;

    const summaryCards = [
      {
        label: "TOTAL BATCHES",
        value: String(queue.length),
      },
      {
        label: "TOTAL MASS",
        value: `${totalWeight.toLocaleString()} kg`,
      },
      {
        label: "PENDING REVIEW",
        value: String(pendingCount),
      },
      {
        label: "AVG. CONFIDENCE",
        value: `${averageConfidence.toFixed(1)}%`,
      },
    ];

    summaryCards.forEach((card, index) => {
      const x = margin + index * (cardWidth + cardGap);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label, x + 4, y + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(card.value, x + 4, y + 18);
    });

    y += cardHeight + 13;

    // Status breakdown
    y = addSectionTitle(
      "Queue Status",
      "Current classification state of all decommissioning batches.",
      y
    );

    y += 9;

    const statusRows = [
      ["Approved", approvedCount],
      ["Human Review", pendingCount],
      ["Overridden", overriddenCount],
    ];

    statusRows.forEach(([label, count], index) => {
      const rowY = y + index * 10;

      doc.setFillColor(index % 2 === 0 ? 248 : 255, 250, 252);
      doc.rect(margin, rowY - 5, contentWidth, 9, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(String(label), margin + 4, rowY);

      doc.setFont("helvetica", "bold");
      doc.text(String(count), pageWidth - margin - 4, rowY, {
        align: "right",
      });
    });

    y += statusRows.length * 10 + 12;

    // Report scope
    y = addSectionTitle(
      "Report Scope",
      "This document represents the queue state captured at generation time.",
      y
    );

    y += 9;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 28, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const scopeText = doc.splitTextToSize(
      `This compliance report contains ${queue.length} decommissioning ${
        queue.length === 1 ? "batch" : "batches"
      } currently present in the EcoGov AI Decommissioning Queue. ` +
        `The report includes classification results, confidence scores, material weights, ` +
        `review status, legal citations, and alternative classifications where available.`,
      contentWidth - 10
    );

    doc.text(scopeText, margin + 5, y + 8);

    /*
    * --------------------------------------------------------------------------
    * PAGE 2+ — Dynamic queue
    * --------------------------------------------------------------------------
    */

    doc.addPage();
    addPageHeader();

    y = 24;

    y = addSectionTitle(
      "Decommissioning Queue",
      `${queue.length} ${queue.length === 1 ? "batch" : "batches"} included in this compliance record.`,
      y
    );

    y += 10;

    /*
    * Dynamic queue table
    */

    const colX = {
      batch: margin,
      hardware: margin + 22,
      weight: margin + 95,
      code: margin + 118,
      confidence: margin + 140,
      status: margin + 160,
    };

    // Table header
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);

    doc.text("BATCH", colX.batch + 3, y + 6);
    doc.text("HARDWARE TYPE", colX.hardware, y + 6);
    doc.text("WEIGHT", colX.weight, y + 6);
    doc.text("DOE CODE", colX.code, y + 6);
    doc.text("CONF.", colX.confidence, y + 6);
    doc.text("STATUS", colX.status, y + 6);

    y += 9;

    queue.forEach((batch, index) => {
      const hardwareLines = doc.splitTextToSize(
        batch.hardwareType || "—",
        70
      );

      const rowHeight = Math.max(13, hardwareLines.length * 4 + 7);

      y = addNewPageIfNeeded(rowHeight + 2, y);

      if (y === 24) {
        // Re-render table header after page break
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);

        doc.text("BATCH", colX.batch + 3, y + 6);
        doc.text("HARDWARE TYPE", colX.hardware, y + 6);
        doc.text("WEIGHT", colX.weight, y + 6);
        doc.text("DOE CODE", colX.code, y + 6);
        doc.text("CONF.", colX.confidence, y + 6);
        doc.text("STATUS", colX.status, y + 6);

        y += 9;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      }

      // Batch
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${batch.id}`, colX.batch + 3, y + 7);

      // Hardware
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(hardwareLines, colX.hardware, y + 5);

      // Weight
      doc.text(
        `${Number(batch.weightKg || 0).toLocaleString()} kg`,
        colX.weight,
        y + 7
      );

      // DOE code
      doc.setFont("helvetica", "bold");
      doc.text(batch.ai?.code || "—", colX.code, y + 7);

      // Confidence
      doc.setFont("helvetica", "normal");
      doc.text(
        `${Number(batch.confidence || 0).toFixed(0)}%`,
        colX.confidence,
        y + 7
      );

      // Status
      doc.setFont("helvetica", "bold");
      doc.text(statusLabel(batch.status), colX.status, y + 7);

      y += rowHeight;

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
    });

    /*
    * --------------------------------------------------------------------------
    * Detailed classification records
    * --------------------------------------------------------------------------
    */

    queue.forEach((batch) => {
      doc.addPage();
      addPageHeader();

      let detailY = 24;

      detailY = addSectionTitle(
        `Batch #${batch.id}`,
        "Detailed classification and compliance record",
        detailY
      );

      detailY += 10;

      // Status banner
      const status = statusLabel(batch.status);

      doc.setFillColor(
        batch.status === "approved"
          ? 236
          : batch.status === "pending"
          ? 254
          : 255,
        batch.status === "approved"
          ? 253
          : batch.status === "pending"
          ? 249
          : 247,
        batch.status === "approved"
          ? 245
          : batch.status === "pending"
          ? 195
          : 237
      );

      doc.roundedRect(margin, detailY, contentWidth, 14, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(status, margin + 5, detailY + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${batch.confidence.toFixed(0)}% AI classification confidence`,
        pageWidth - margin - 5,
        detailY + 9,
        { align: "right" }
      );

      detailY += 23;

      // Basic information
      detailY = addSectionTitle(
        "Batch Information",
        undefined,
        detailY
      );

      detailY += 7;

      const infoRows = [
        ["Batch ID", `#${batch.id}`],
        ["Hardware Type", batch.hardwareType || "—"],
        [
          "Declared Weight",
          `${Number(batch.weightKg || 0).toLocaleString()} kg`,
        ],
        ["Workflow Status", status],
      ];

      infoRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), margin, detailY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        const valueLines = doc.splitTextToSize(
          value,
          contentWidth - 48
        );

        doc.text(valueLines, margin + 48, detailY);

        detailY += Math.max(8, valueLines.length * 4 + 4);
      });

      detailY += 5;

      // AI classification
      detailY = addSectionTitle(
        "AI Classification",
        "Primary classification generated by the EcoGov AI workflow.",
        detailY
      );

      detailY += 8;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, detailY, contentWidth, 34, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(batch.ai?.code || "—", margin + 6, detailY + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        batch.ai?.label || "Classification unavailable",
        margin + 30,
        detailY + 9
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("CONFIDENCE", margin + 6, detailY + 18);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${Number(batch.ai?.confidence ?? batch.confidence).toFixed(0)}%`,
        margin + 6,
        detailY + 24
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("LEGAL / REGULATORY CITATION", margin + 55, detailY + 18);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      const citationLines = doc.splitTextToSize(
        batch.ai?.citation || "No citation recorded.",
        contentWidth - 67
      );

      doc.text(citationLines, margin + 55, detailY + 24);

      detailY += 43;

      // Alternative / ruled-out classification
      if (batch.ruledOut?.code || batch.ruledOut?.reason) {
        detailY = addNewPageIfNeeded(50, detailY);

        detailY = addSectionTitle(
          "Alternative Classification Considered",
          "Classification option evaluated but not selected.",
          detailY
        );

        detailY += 8;

        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(253, 230, 138);
        doc.roundedRect(margin, detailY, contentWidth, 35, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(146, 64, 14);

        doc.text(
          `${batch.ruledOut.code || "—"} — ${batch.ruledOut.label || "Alternative classification"}`,
          margin + 6,
          detailY + 9
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 53, 15);

        const reasonLines = doc.splitTextToSize(
          batch.ruledOut.reason || "No reason recorded.",
          contentWidth - 12
        );

        doc.text(reasonLines, margin + 6, detailY + 17);

        detailY += 44;
      }

      // Manual override justification (audit trail)
      if (batch.overrideJustification) {
        detailY = addNewPageIfNeeded(45, detailY);

        detailY = addSectionTitle(
          "Manual Override Justification",
          "Reviewer-recorded justification captured at the time of override.",
          detailY
        );

        detailY += 8;

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, detailY, contentWidth, 26, 2, 2, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        const justificationLines = doc.splitTextToSize(
          batch.overrideJustification,
          contentWidth - 12
        );

        doc.text(justificationLines, margin + 6, detailY + 9);

        detailY += 35;
      }

      // Extracted manifest text
      if (batch.extractedText) {
        detailY = addNewPageIfNeeded(55, detailY);

        detailY = addSectionTitle(
          "Source Manifest / Extracted Evidence",
          "Text associated with the queue record.",
          detailY
        );

        detailY += 8;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);

        const evidenceLines = doc.splitTextToSize(
          batch.extractedText,
          contentWidth - 12
        );

        const evidenceHeight = Math.max(
          28,
          evidenceLines.length * 4.2 + 12
        );

        doc.roundedRect(
          margin,
          detailY,
          contentWidth,
          evidenceHeight,
          2,
          2,
          "FD"
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        doc.text(evidenceLines, margin + 6, detailY + 9);
      }
    });

    /*
    * --------------------------------------------------------------------------
    * Final page — Declaration
    * --------------------------------------------------------------------------
    */

    doc.addPage();
    addPageHeader();

    y = 26;

    y = addSectionTitle(
      "Compliance Declaration",
      "System-generated record and audit metadata.",
      y
    );

    y += 12;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 58, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const declaration = doc.splitTextToSize(
      `This document was generated by EcoGov AI from the active Decommissioning Queue. ` +
        `It represents the data and classification state available in the system at the ` +
        `time of generation. Any subsequent changes to queue contents, classifications, ` +
        `weights, approvals, or overrides will not retroactively modify this exported document.`,
      contentWidth - 14
    );

    doc.text(declaration, margin + 7, y + 10);

    y += 72;

    const auditRows = [
      ["Report ID", reportId],
      ["Generated", `${formattedDate} ${formattedTime}`],
      ["Queue Records", String(queue.length)],
      ["Total Mass", `${totalWeight.toLocaleString()} kg`],
      ["Approved", String(approvedCount)],
      ["Human Review", String(pendingCount)],
      ["Overridden", String(overriddenCount)],
      ["Average Confidence", `${averageConfidence.toFixed(1)}%`],
    ];

    auditRows.forEach(([label, value], index) => {
      const rowY = y + index * 9;

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY - 5, contentWidth, 9, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), margin + 4, rowY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(value, pageWidth - margin - 4, rowY, {
        align: "right",
      });
    });

    /*
    * --------------------------------------------------------------------------
    * Save
    * --------------------------------------------------------------------------
    */

    const safeDate = timestamp.toISOString().slice(0, 10);

    doc.save(
      `EcoGov_Compliance_Report_${safeDate}_${reportId}.pdf`
    );
  }

  function handleDownloadBundle() {
    if (generatedQueueSnapshot.length === 0) return;
    downloadComplianceBundle(generatedQueueSnapshot);
    setShowPacketModal(false);
    setActiveTab("packets");
  }

  function handleApprove(id: string) {
    setQueue((q) =>
      q.map((b) =>
        b.id === id ? { ...b, status: "approved" as BatchStatus, requiresHumanReview: false } : b
      )
    );
    setSelectedLog(null);
  }

  function handleOverride(id: string, code: string, label: string, justification: string) {
    setQueue((q) =>
      q.map((b) =>
        b.id === id
          ? {
              ...b,
              status: "approved" as BatchStatus,
              requiresHumanReview: false,
              hasBeenInspected: true,
              ai: { ...b.ai, code, label },
              overrideJustification: justification,
            }
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

  async function handleIntakeSubmit(payload: IntakeSubmitPayload): Promise<boolean> {
    setIsSubmittingIntake(true);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifestText: payload.manifestText,
          declaredWeightKg: payload.weightKg,
          facility: payload.facility,
        }),
      });

      if (!response.ok) {
        throw new Error("Classification request failed");
      }

      const result = (await response.json()) as ClassificationResult;
      const confidence = Math.max(0, Math.min(100, result.confidence));

      const newBatch: QueueBatch = {
        id: result.batchId || `INT-${Date.now().toString().slice(-5)}`,
        hardwareType: result.hardwareType || payload.manifestText.split(/[—-]/)[0].trim().slice(0, 60),
        weightKg: payload.weightKg,
        confidence,
        status: result.requiresHumanReview ? "pending" : "approved",
        interactive: result.requiresHumanReview,
        requiresHumanReview: result.requiresHumanReview,
        extractedText: payload.manifestText,
        ai: {
          code: result.primaryCode || "PENDING",
          label: "AI-Determined Classification",
          confidence,
          citation: result.legalCitation || "",
        },
        ruledOut: {
          code: result.ruledOutCode || "",
          label: "",
          confidence: Math.max(0, 100 - confidence),
          reason: result.ruledOutReason || "",
        },
      };

      setQueue((q) => [newBatch, ...q]);
      setActiveTab("logs");
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmittingIntake(false);
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
            onViewRecord={(batch) => setSelectedLog(batch)}
            isClassifying={isClassifying}
            classifyingBatchId={classifyingBatchId}
            isGenerating={isGenerating}
            onGenerate={handleGeneratePacket}
            onGoToIntake={() => setActiveTab("intake")}
          />
        ))}

      {activeTab === "intake" && <IntakeView isSubmitting={isSubmittingIntake} onSubmit={handleIntakeSubmit} />}

      {activeTab === "logs" && (
        <QueueTable
          queue={queue}
          onInspect={handleInspect}
          onViewRecord={(batch) => setSelectedLog(batch)}
          isClassifying={isClassifying}
          classifyingBatchId={classifyingBatchId}
          onGoToIntake={() => setActiveTab("intake")}
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
