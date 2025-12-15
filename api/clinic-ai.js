// api/clinic-ai.js
// =====================================================
// Clinic SOAP AI endpoint (Vercel / Next.js API route)
// Modes:
// - triage: 問診建議（怪怪主訴）
// - im_consult: 內科顧問（英文精簡 + DDx + eval + plan）
// - plan (default): guideline-heavy CDS + Taiwan NHI considerations
//
// IMPORTANT:
// - For lipid-related decisions, this endpoint injects an evidence pack
//   from ./lipidEvidence.js so the model bases reasoning on YOUR guideline file.
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
    section: e.section,
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
    appliesTo: e.appliesTo,
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
    "You MUST follow these rules:\n" +
    "1) For lipid / LDL / statin / ezetimibe / PCSK9 / Lp(a) / NHI lipid reimbursement topics,\n" +
    "   you MUST base recommendations ONLY on this evidence pack.\n" +
    "2) Do NOT use external memory or other guidelines for lipid topics.\n" +
    "3) If something is not covered here, explicitly say: 'Not covered in provided evidence pack.'\n" +
    "4) When citing, cite by evidence id + source fields.\n\n" +
    "EVIDENCE_PACK_JSON:\n" +
    JSON.stringify(pack, null, 2) +
    "\n=== END EVIDENCE PACK ===\n"
  );
}

function shouldInjectLipidEvidence({ soap, complaint, mode }) {
  if (mode === "triage") return false;
  const text = `${soap || ""}\n${complaint || ""}`.toLowerCase();
  const keywords = [
    "ldl", "cholesterol", "lipid", "statin", "ezetimibe", "pcsk9", "bempedoic",
    "lp(a)", "lpa", "hyperlipidem", "hld", "dyslip",
    "健保", "給付", "高血脂", "膽固醇", "降脂", "依折麥布",
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
    `You are a family medicine physician in Taiwan working in a busy clinic.\n` +
    `Your job is to help a junior doctor handle an INITIAL, UNSTRUCTURED CHIEF COMPLAINT.\n\n` +
    `Please respond in Chinese with short English hints.\n\n` +
    `Patient info:\n` +
    `Age: ${safeAge}\n` +
    `Sex: ${safeSex} (M/F)\n` +
    `Chief complaint:\n` +
    `"""${cc}"""\n\n` +
    `Format:\n` +
    `1) Symptom category（症狀分類）\n` +
    `2) Urgency level（急重症風險）\n` +
    `3) 一般問診問題（6–10 題，中文+括號英文提示）\n` +
    `4) Red flags（4–8 題）\n` +
    `5) PE focus\n` +
    `6) Differential（3–6 個＋理由）\n`
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
  const evidenceBlock = injectEvidence ? "\n\n" + buildLipidEvidenceContext() + "\n\n" : "";

  const escRiskBlock = escRisk
    ? "\n\n=== ESC/EAS 2025 風險分層（系統判定，請勿自行覆寫） ===\n" +
      `風險等級：${escRisk.category}\n` +
      "判定理由：\n" +
      (escRisk.reasons || []).map((r) => `- ${r}`).join("\n") +
      "\nLDL-C 目標（若有明確目標）：\n" +
      (escRisk.ldlTarget?.mgdl
        ? `- LDL-C < ${escRisk.ldlTarget.mgdl} mg/dL，且至少下降 ${escRisk.ldlTarget.percentReduction}%（${escRisk.ldlTarget.evidenceId || "N/A"}）\n`
        : "- 本風險層級無明確 LDL-C 數值目標；請以長期風險與共同決策為主。\n") +
      "=== END ESC RISK ===\n\n"
    : "";

  return (
    escRiskBlock +
    "You are a family medicine clinical decision support system practicing in Taiwan.\n\n" +
    "IMPORTANT RULES:\n" +
    "- Do NOT invent guidelines or citations.\n" +
    "- If an evidence pack is provided, use it as the primary source.\n\n" +

    evidenceBlock +

    "--------------------------------------------------\n\n" +
    "Here is a clinic SOAP note:\n\n" +
    soap +
    "\n\n--------------------------------------------------\n\n" +

    "請完成以下輸出（請用【繁體中文】回答，醫學名詞可保留英文）：\n" +
    "1) 【PI 英文化】把 present illness 寫成流暢精簡英文（門診病歷風格）。\n" +
    "2) 【Assessment】最可能問題 1–2 行。\n" +
    "3) 【Differential】3–5 個鑑別＋一句理由。\n" +
    "4) 【Evaluation】門診可行的 PE / labs / imaging 建議。\n" +
    "5) 【Plan】分『現在做』與『追蹤再評估』條列。\n" +
    "6) 【Evidence & Guideline Support】\n" +
    "   - 若有 evidence pack：請用 evidence id + guideline/year/section。\n" +
    "   - 必要時可引用 1 句關鍵原文（短句）。\n" +
    "7) 【Taiwan NHI 給付考量】與醫學建議分開寫。\n\n" +

    "格式要求：\n" +
    "- 段落標題清楚、條列為主、句子短。\n"
  );
}

// -------------------------
// Main Handler
// -------------------------
export default async function handler(req, res) {
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
    const mode = safeStr(body.mode, "plan"); // triage / im_consult / plan

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
      if (!soap) {
        res.status(400).json({ error: "Missing 'soap' field in body" });
        return;
      }

      const patientForRisk = {
        ascvd: !!body.ascvd,
        diabetes: !!body.diabetes,
        dmTargetOrganDamage: !!body.dmTargetOrganDamage,
        dmMajorRiskFactorCount:
          typeof body.dmMajorRiskFactorCount === "number" ? body.dmMajorRiskFactorCount : null,
        t1dmLongDuration: !!body.t1dmLongDuration,
        ckdEgfr: body.egfr ?? null,
        sbp: body.sbp ?? null,
        ldl: body.ldl ?? null,
        hypertension: !!body.hypertension,
        smoking: !!body.smoking,
        familyHistoryPrematureASCVD: !!body.familyHistoryPrematureASCVD,
      };

      const escRisk = escEas2025RiskStratify(patientForRisk);
      const injectEvidence = shouldInjectLipidEvidence({ soap, complaint, mode });

      prompt = buildPlanPrompt({ soap, injectEvidence, escRisk });
    }

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
