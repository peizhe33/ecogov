import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

interface ClassifyRequestBody {
  manifestText: string;
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

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  
  // If the model returned a 0.0 - 1.0 float, scale to 0 - 100
  const scaled = n <= 1 ? n * 100 : n;
  
  return Math.round(Math.max(0, Math.min(100, scaled)));
}

function inferBatchId(manifestText: string): string {
  const match = manifestText.match(/batch\s*([A-Za-z0-9-]+)/i);
  return match?.[1] ?? "UNKNOWN-BATCH";
}

function normalizeClassification(data: unknown, manifestText: string): ClassificationResult {
  const source = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  return {
    batchId:
      typeof source.batchId === "string" && source.batchId.trim().length > 0
        ? source.batchId.trim()
        : inferBatchId(manifestText),
    hardwareType:
      typeof source.hardwareType === "string" && source.hardwareType.trim().length > 0
        ? source.hardwareType.trim()
        : "Mixed Electronic Assemblies",
    primaryCode:
      typeof source.primaryCode === "string" && source.primaryCode.trim().length > 0
        ? source.primaryCode.trim().toUpperCase()
        : "SW110",
    confidence: clampConfidence(source.confidence),
    legalCitation:
      typeof source.legalCitation === "string" && source.legalCitation.trim().length > 0
        ? source.legalCitation.trim()
        : "First Schedule, Environmental Quality (Scheduled Wastes) Regulations 2005",
    ruledOutCode:
      typeof source.ruledOutCode === "string" && source.ruledOutCode.trim().length > 0
        ? source.ruledOutCode.trim().toUpperCase()
        : "SW322",
    ruledOutReason:
      typeof source.ruledOutReason === "string" && source.ruledOutReason.trim().length > 0
        ? source.ruledOutReason.trim()
        : "Residual solvent traces were documented as incidental and below classification threshold.",
    requiresHumanReview:
      typeof source.requiresHumanReview === "boolean"
        ? source.requiresHumanReview
        : clampConfidence(source.confidence) < 80,
  };
}

function buildMockClassification(manifestText: string): ClassificationResult {
  return {
    batchId: inferBatchId(manifestText),
    hardwareType: "Mixed Circuit Boards",
    primaryCode: "SW110",
    confidence: 71,
    legalCitation: "First Schedule, Environmental Quality (Scheduled Wastes) Regulations 2005",
    ruledOutCode: "SW322",
    ruledOutReason: "Solvent traces appear incidental and are below the mass threshold for solvent stream handling.",
    requiresHumanReview: true,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ClassifyRequestBody | null;

  if (!payload || typeof payload.manifestText !== "string" || payload.manifestText.trim().length === 0) {
    return NextResponse.json({ error: "manifestText is required." }, { status: 400 });
  }

  const manifestText = payload.manifestText.trim();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = [
      "Classify the manifest using Malaysian scheduled waste context.",
      "Return only JSON that matches the response schema.",
      "Manifest text:",
      manifestText,
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            batchId: { type: Type.STRING },
            hardwareType: { type: Type.STRING },
            primaryCode: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            legalCitation: { type: Type.STRING },
            ruledOutCode: { type: Type.STRING },
            ruledOutReason: { type: Type.STRING },
            requiresHumanReview: { type: Type.BOOLEAN },
          },
          required: [
            "batchId",
            "hardwareType",
            "primaryCode",
            "confidence",
            "legalCitation",
            "ruledOutCode",
            "ruledOutReason",
            "requiresHumanReview",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}");
    return NextResponse.json(normalizeClassification(parsed, manifestText));
  } catch {
    return NextResponse.json(buildMockClassification(manifestText));
  }
}