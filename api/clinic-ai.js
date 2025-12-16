// api/clinic-ai.js
// =====================================================
// Clinic SOAP AI endpoint
// Modes:
// - triage: 初診/怪主訴問診建議（中文+英文提示）
// - im_consult: 內科顧問（英文）
// - plan (default): 綜合 plan（中文）+ evidence pack + ESC risk engine (hard-locked)
// =====================================================

import { escEas2025RiskStratify } from "./escRisk.js";
import { lipidEvidence, nhiRiskFactors } from "./lipidEvidence.js";

// -------------------------
// Utilities
// -------------------------
function safeStr(x, fallback = "") {
  return typeof x === "string" ? x : fallback;
}

function clampNum(x, min, max, fallback = null) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function compact(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

// -------------------------
// Evidence Pack Builder
// -------------------------
function buildLipidEvidenceContext() {
  const targets = (lipidEvidence?.ldlTargets || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    target: e.target,
    source: `${e.guideline} ${e.year}`,
    section: e.section ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const logic = (lipidEvidence?.treatmentLogic || []).map((e) => ({
    id: e.id,
    source: `${e.guideline} ${e.year}`,
    rule: e.rule,
    section: e.section ?? null,
    quote: e.quote ?? null,
    cor_loe: e.cor_loe ?? null,
    note: e.note ?? null,
  }));

  const nonStatin = (lipidEvidence?.nonStatinTherapy || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    action: e.action,
    source: `${e.guideline} ${e.year}`,
    cor_loe: e.cor_loe ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const lpa = (lipidEvidence?.lipoproteinA || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    recommendation: e.recommendation ?? null,
    clinicalMeaning: e.clinicalMeaning ?? null,
    groups: e.groups ?? null,
    source: `${e.guideline} ${e.year}`,
    section: e.section ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const nhi = (lipidEvidence?.nhi || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo ?? null,
    eligibility: e.eligibility ?? null,
    startThreshold: e.startThreshold ?? null,
    goal: e.goal ?? null,
    rule: e.rule ?? null,
    action: e.action ?? null,
    followUp: e.followUp ?? null,
    mustMonitor: e.mustMonitor ?? null,
    riskNote: e.riskNote ?? null,
    definition: e.definition ?? null,
    source: e.source ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const rf = (nhiRiskFactors || []).map((e) => ({
    id: e.id,
    name: e.name,
    definition: e.definition,
    source: e.source ?? null,
    quote: e.quote ?? null,
  }));

  const pack = compact({
    ldlTargets: targets,
    treatmentLogic: logic,
    nonStatinTherapy: nonStatin,
    lipoproteinA: lpa,
    taiwanNhi: nhi,
    taiwanNhiRiskFactors: rf,
  });

  return (
    "=== AUTHORITATIVE EVIDENCE PACK (SOURCE-LIMITED) ===\n" +
    "For lipid/LDL/statin/ezetimibe/PCSK9/Lp(a)/Taiwan NHI lipid topics:\n" +
    "- You MUST use ONLY this evidence pack.\n" +
    "- Do NOT use outside memory.\n" +
    "- If not covered, say: 「本 evidence pack 未涵蓋」.\n" +
    "- Cite by evidence id + guideline/year/section.\n\n" +
    "EVIDENCE_PACK_JSON:\n" +
    JSON.stringify(pack, null, 2) +
    "\n=== END EVIDENCE PACK ===\n"
  );
}

function shouldInjectLipidEvidence({ soap, complaint, mode }) {
  if (mode === "triage") return false;
  const text = `${soap || ""}\n${complaint || ""}`.toLowerCase();
  const keywords = [
    "ldl",
    "cholesterol",
    "lipid",
    "statin",
    "ezetimibe",
    "pcsk9",
    "bempedoic",
    "lp(a)",
    "lpa",
    "hyperlipidem",
    "dyslip",
    "健保",
    "給付",
    "高血脂",
    "膽固醇",
    "降脂",
    "依折麥布",
  ];
  return keywords.some((k) => text.includes(k));
}

// -------------------------
// Prompt Builders
// -------------------------
function buildTriagePrompt({ age, sex, complaint }) {
  const safeAge = age ? String(age) : "unknown";
  const safeSex = sex === "M" || sex === "F" ? sex : "Unknown";
  const cc = safeStr(complaint, "");

  return (
    `你是台灣家醫科門診醫師，正在協助住院醫師處理「初診、描述很怪的主訴」。\n` +
    `病人資料：Age ${safeAge}, Sex ${safeSex}\n` +
    `主訴："""${cc}"""\n\n` +
    `請用「繁體中文」回答（括號可附英文提示），格式固定如下：\n\n` +
    `1) Symptom category（症狀分類）\n` +
    `2) Urgency level（急重症風險）\n` +
    `3) 一般問診（6–10 題，給我可照念的問句：中文 + 英文提示）\n` +
    `4) Red flags（4–8 題）\n` +
    `5) PE focus（條列）\n` +
    `6) Differential（3–6 個＋一句理由）\n\n` +
    `限制：不要寫完整病歷，只要問診問題/重點PE/鑑別即可。`
  );
}

function buildImConsultPrompt({ soap }) {
  return (
    "You are an internal medicine consultant.\n" +
    "Here is a clinic SOAP note:\n\n" +
    soap +
    "\n\nPlease:\n" +
    "1) Rewrite the \"PI\" into fluent, concise English.\n" +
    "2) List likely diagnoses with brief reasoning.\n" +
    "3) Suggest key physical exams and tests.\n" +
    "4) Provide an initial management plan.\n" +
    "Answer in concise English bullet points."
  );
}

function buildPlanPrompt({ soap, injectEvidence, escRisk }) {
  const evidenceBlock = injectEvidence
    ? "\n\n" + buildLipidEvidenceContext() + "\n\n"
    : "";

  const escRiskBlock = escRisk
    ? "\n\n=== ESC/EAS 2025 風險分層（系統判定，請勿自行覆寫） ===\n" +
      `風險等級：${escRisk.category}\n` +
      "判定理由：\n" +
      (Array.isArray(escRisk.reasons) ? escRisk.reasons.map((r) => `- ${r}`).join("\n") : "- (no reasons)") +
      "\n\nLDL-C 目標：\n" +
      (escRisk.ldlTarget?.mgdl
        ? `- LDL-C < ${escRisk.ldlTarget.mgdl} mg/dL，且至少下降 ${escRisk.ldlTarget.percentReduction}%（${escRisk.ldlTarget.evidenceId || "N/A"}）\n`
        : "- 本風險層級無明確 LDL-C 數值目標；請以長期風險與共同決策為主。\n") +
      "=== END ESC RISK ===\n\n"
    : "";

  return (
    escRiskBlock +
    "You are a family medicine clinical decision support system practicing in Taiwan.\n\n" +
    "You are assisting a physician in an outpatient clinic with limited time.\n" +
    "Your goal is to provide SAFE, GUIDELINE-BASED, and PRACTICAL recommendations.\n\n" +

    "IMPORTANT RULES (must follow):\n" +
    "- If you are provided an evidence pack, you MUST use it as the primary source.\n" +
    "- Do NOT invent guidelines or citations.\n" +
    "- If something is not covered in the evidence pack, explicitly say: 'Not covered in provided evidence pack.'\n" +
    "- Taiwan NHI 給付規定請與醫學建議分開段落說明。\n\n" +

    evidenceBlock +

    "--------------------------------------------------\n\n" +
    "Here is a clinic SOAP note:\n\n" +
    soap +
    "\n\n" +
    "--------------------------------------------------\n\n" +

    "請用【繁體中文】回答（醫學名詞可保留英文，如 LDL-C、ASCVD、Lp(a)、statin）。\n" +
    "請務必包含以下段落（用清楚標題＋條列）：\n" +
    "1)【PI 英文化】把 PI 改寫成精簡自然英文（像內科門診病歷）。\n" +
    "2)【Assessment】用 1–2 行說明主要問題。\n" +
    "3)【Differential】3–5 個鑑別診斷（每個 1 行理由）。\n" +
    "4)【Evaluation】門診可行的 PE/檢查。\n" +
    "5)【Plan】分『現在做』與『下次追蹤』。\n" +
    "6)【Evidence & Guideline Support】\n" +
    "   - 若有 evidence pack：只用 evidence pack，引用請用 evidence id（例如 NHI_xxx、ESC2025_xxx）。\n" +
    "7)【Taiwan NHI 給付考量】\n" +
    "   - 只根據 evidence pack 的 NHI 條文/表格列出『是否符合』與『缺哪些條件』，不要自行腦補。\n"
  );
}


// -------------------------
// Main Handler
// -------------------------
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const mode = safeStr(body.mode, "plan");

    const soap = safeStr(body.soap, "");
    const complaint = safeStr(body.complaint, "");
    const age = clampNum(body.age, 0, 120, null);
    const sex = body.sex === "M" || body.sex === "F" ? body.sex : "Unknown";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Server missing OPENAI_API_KEY env" });
      return;
    }

    const model = safeStr(body.model, "gpt-4.1-mini");
    const maxOut = clampNum(body.max_output_tokens, 200, 3000, 2000);

    let prompt = "";

    if (mode === "triage") {
      if (!complaint) {
        res.status(400).json({ error: "Missing 'complaint' field for triage mode" });
        return;
      }
      prompt = buildTriagePrompt({ age, sex, complaint });
    } else if (mode === "im_consult") {
      if (!soap) {
        res.status(400).json({ error: "Missing 'soap' field in body" });
        return;
      }
      prompt = buildImConsultPrompt({ soap });
    } else {
      // plan
      if (!soap) {
        res.status(400).json({ error: "Missing 'soap' field in body" });
        return;
      }

      // ✅ 重要：NHI 2.6.1 是 secondary prevention；用 ascvd gate
      const isSecondaryPrev = !!body.ascvd;

      // ✅ ESC risk engine input：盡量用前端傳的結構化欄位
      const patientForRisk = compact({
        ascvd: !!body.ascvd,
        diabetes: !!body.diabetes,
        dmTargetOrganDamage: !!body.dmTargetOrganDamage,
        dmMajorRiskFactorCount:
          typeof body.dmMajorRiskFactorCount === "number" ? body.dmMajorRiskFactorCount : null,
        t1dmLongDuration: !!body.t1dmLongDuration,
        ckdEgfr: body.egfr ?? null,
        sbp: body.sbp ?? null,
        ldl: body.ldl ?? null,

        // 一般 RF（只用於 moderate/low 判斷，不會直接升級 high）
        hypertension: !!body.hypertension,
        smoking: !!body.smoking,
        familyHistoryPrematureASCVD: !!body.familyHistoryPrematureASCVD,
      });

      const escRisk = escEas2025RiskStratify(patientForRisk);

      const injectEvidence = shouldInjectLipidEvidence({ soap, complaint, mode });

      prompt = buildPlanPrompt({
        soap,
        injectEvidence,
        escRisk,
        isSecondaryPrev,
      });
    }

    // OpenAI Responses API
    const apiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: maxOut,
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      res.status(502).json({
        error: "OpenAI API error",
        detail: errText.slice(0, 1200),
      });
      return;
    }

    const data = await apiResp.json();
    const answer = data.output_text || data.output?.[0]?.content?.[0]?.text || "";
    res.status(200).json({ answer });
  } catch (err) {
    console.error("clinic-ai error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
